import type { JourneyAggregate, NextJourneyRequest } from "@mcm/shared";

import { AppError } from "../../errors/app-error.js";
import { isPrismaUniqueError } from "../../errors/prisma-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  areStepCandidatesStillEligible,
  findJourneyCandidates,
} from "../../repositories/journey-candidate-repository.js";
import {
  advanceJourneyInTransaction,
  completeStepInTransaction,
  createFallbackStepInTransaction,
  findJourneyMutationStateInTransaction,
  findJourneyTransitionPlan,
} from "../../repositories/journey-repository.js";
import type { DemoUserContext } from "../../types/demo-user.js";
import { scoreJourneyCandidates } from "./candidate-engine.js";
import { generateFallbackStep } from "./fallback-step-generator.js";
import { parseJourneyPreferences } from "./journey-preference-service.js";
import {
  assertJourneyOwner,
  getJourneyAggregateForOwner,
  getJourneyAggregateInternal,
} from "./journey-state-service.js";
import {
  isRetryableJourneyError,
  exhaustedJourneyError,
  JOURNEY_TRANSACTION_ATTEMPTS,
  waitForRetry,
} from "./transaction-retry.js";

function targetFor(stage: string) {
  if (stage === "BAG") return { stage: "APPAREL" as const, stepNumber: 2 };
  if (stage === "APPAREL") return { stage: "ACCESSORY" as const, stepNumber: 3 };
  return null;
}

export async function advanceJourney(
  actor: DemoUserContext,
  journeyId: string,
  input: NextJourneyRequest,
): Promise<JourneyAggregate> {
  const plan = await findJourneyTransitionPlan(journeyId);
  if (!plan) throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
  assertJourneyOwner(actor, plan.userId);
  const validatedAggregate = await getJourneyAggregateForOwner(actor, journeyId);

  if (plan.currentStepNumber === input.expectedStepNumber + 1) {
    const previous = plan.steps.find((step) => step.stepNumber === input.expectedStepNumber);
    if (previous?.status === "COMPLETED") return validatedAggregate;
  }
  if (plan.currentStepNumber !== input.expectedStepNumber) {
    throw new AppError(409, "STALE_JOURNEY_STEP", "The Journey has moved beyond the expected step.");
  }
  if (plan.status !== "ACTIVE") {
    throw new AppError(409, "INVALID_STATE", "The Journey cannot advance from its current state.");
  }
  const target = targetFor(plan.currentStage);
  if (!target) {
    throw new AppError(409, "INVALID_STATE", "The current Journey stage does not have a next step.");
  }
  const currentStep = plan.steps.find((step) => step.stepNumber === input.expectedStepNumber);
  if (!currentStep || currentStep.status !== "IN_PROGRESS" || !currentStep.selectedProductId) {
    throw new AppError(409, "INVALID_STATE", "Select a product before advancing the Journey.");
  }
  if (!plan.profileSnapshot) {
    throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }

  const excludedProductIds = [
    ...plan.steps.flatMap((step) => (step.selectedProductId ? [step.selectedProductId] : [])),
    ...plan.interactions.map((interaction) => interaction.productId),
  ];
  const candidates = await findJourneyCandidates({
    storeId: plan.storeId,
    stage: target.stage,
    excludedProductIds: [...new Set(excludedProductIds)],
  });
  const step = generateFallbackStep({
    stage: target.stage,
    stepNumber: target.stepNumber,
    candidates: scoreJourneyCandidates(candidates, {
      practicalityScore: plan.profileSnapshot.practicalityScore,
      expressionScore: plan.profileSnapshot.expressionScore,
      noveltyScore: plan.profileSnapshot.noveltyScore,
      preferences: parseJourneyPreferences(plan.profileSnapshot.preferencesJson),
    }),
  });

  for (let attempt = 0; attempt < JOURNEY_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const current = await findJourneyMutationStateInTransaction(transaction, journeyId);
        if (!current) throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
        assertJourneyOwner(actor, current.userId);
        if (current.currentStepNumber === input.expectedStepNumber + 1) {
          const previous = current.steps.find((item) => item.stepNumber === input.expectedStepNumber);
          if (previous?.status === "COMPLETED") return;
        }
        if (current.currentStepNumber !== input.expectedStepNumber) {
          throw new AppError(409, "STALE_JOURNEY_STEP", "The Journey has moved beyond the expected step.");
        }
        if (current.status !== "ACTIVE" || current.currentStage !== plan.currentStage) {
          throw new AppError(409, "INVALID_STATE", "The Journey cannot advance from its current state.");
        }
        const activeStep = current.steps.find((item) => item.stepNumber === input.expectedStepNumber);
        if (!activeStep || activeStep.status !== "IN_PROGRESS" || !activeStep.selectedProductId) {
          throw new AppError(409, "INVALID_STATE", "Select a product before advancing the Journey.");
        }
        const eligible = await areStepCandidatesStillEligible(transaction, {
          storeId: current.storeId,
          zoneId: step.zoneId,
          stage: target.stage,
          productIds: step.recommendations.map((item) => item.productId),
        });
        if (!eligible) {
          throw new AppError(409, "NO_ELIGIBLE_CANDIDATES", "Eligible products changed before the step was saved.");
        }
        const now = new Date();
        await completeStepInTransaction(transaction, activeStep.id, now);
        await createFallbackStepInTransaction(transaction, journeyId, step);
        await advanceJourneyInTransaction(transaction, journeyId, target.stage, target.stepNumber);
      });
      return getJourneyAggregateInternal(journeyId);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const latest = await findJourneyTransitionPlan(journeyId);
        if (latest?.currentStepNumber === input.expectedStepNumber + 1) {
          const previous = latest.steps.find(
            (item) => item.stepNumber === input.expectedStepNumber,
          );
          if (previous?.status === "COMPLETED") {
            return getJourneyAggregateForOwner(actor, journeyId);
          }
        }
        if (
          latest &&
          latest.currentStepNumber > input.expectedStepNumber + 1
        ) {
          throw new AppError(
            409,
            "STALE_JOURNEY_STEP",
            "The Journey has moved beyond the expected step.",
          );
        }
      }
      if (!isRetryableJourneyError(error) || attempt === JOURNEY_TRANSACTION_ATTEMPTS - 1) {
        throw exhaustedJourneyError(error);
      }
      await waitForRetry(attempt);
    }
  }
  throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}
