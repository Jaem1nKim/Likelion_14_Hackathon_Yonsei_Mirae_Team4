import { randomBytes } from "node:crypto";

import type { FinishJourneyRequest, JourneyAggregate } from "@mcm/shared";

import { PERSONA_BASE_KEY, isSupportedJourneyStage } from "../../constants/journey.js";
import { AppError } from "../../errors/app-error.js";
import { isPrismaUniqueError } from "../../errors/prisma-error.js";
import { prisma } from "../../lib/prisma.js";
import { findEligibleProductInTransaction } from "../../repositories/journey-candidate-repository.js";
import {
  createJourneyResultInTransaction,
  findJourneyMutationStateInTransaction,
  findJourneyResultPlan,
  finishJourneyInTransaction,
} from "../../repositories/journey-repository.js";
import type { DemoUserContext } from "../../types/demo-user.js";
import { generateFallbackResult } from "./fallback-result-generator.js";
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

function minimumSelectionSatisfied(
  steps: Array<{ stage: string; selectedProductId: string | null }>,
) {
  const hasBag = steps.some((step) => step.stage === "BAG" && step.selectedProductId);
  const hasSupporting = steps.some(
    (step) =>
      (step.stage === "APPAREL" || step.stage === "ACCESSORY") &&
      step.selectedProductId,
  );
  return Boolean(hasBag && hasSupporting);
}

export async function finishJourney(
  actor: DemoUserContext,
  journeyId: string,
  input: FinishJourneyRequest,
): Promise<JourneyAggregate> {
  const plan = await findJourneyResultPlan(journeyId);
  if (!plan) throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
  assertJourneyOwner(actor, plan.userId);
  const validatedAggregate = await getJourneyAggregateForOwner(actor, journeyId);
  if (plan.status === "FINISHED" && plan.result) return validatedAggregate;
  if (plan.currentStepNumber !== input.expectedStepNumber) {
    throw new AppError(409, "STALE_JOURNEY_STEP", "The Journey has moved beyond the expected step.");
  }
  if (plan.status !== "ACTIVE") {
    throw new AppError(409, "INVALID_STATE", "The Journey cannot be finished from its current state.");
  }
  const currentStep = plan.steps.find((step) => step.stepNumber === plan.currentStepNumber);
  if (!currentStep || currentStep.status !== "IN_PROGRESS" || !currentStep.selectedProductId) {
    throw new AppError(409, "MINIMUM_SELECTION_REQUIRED", "The current step requires a final product selection.");
  }
  if (!minimumSelectionSatisfied(plan.steps)) {
    throw new AppError(409, "MINIMUM_SELECTION_REQUIRED", "Select a bag and at least one supporting product.");
  }
  const selected = plan.steps
    .filter((step) => step.selectedProduct)
    .map((step) => ({ ...step.selectedProduct!, stepNumber: step.stepNumber, zoneId: step.zoneId }));
  const result = generateFallbackResult({
    startAnswerLabel: plan.reservation.startAnswerLabel,
    products: selected,
    decisionCounts: {
      selected: plan.interactions.filter((item) => item.type === "SELECTED").length,
      rejected: plan.interactions.filter((item) => item.type === "REJECTED").length,
      deselected: plan.interactions.filter((item) => item.type === "DESELECTED").length,
    },
  });
  const selectedIds = selected.map((product) => product.id);

  for (let attempt = 0; attempt < JOURNEY_TRANSACTION_ATTEMPTS; attempt += 1) {
    const shareToken = randomBytes(32).toString("base64url");
    try {
      await prisma.$transaction(async (transaction) => {
        const current = await findJourneyMutationStateInTransaction(transaction, journeyId);
        if (!current) throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
        assertJourneyOwner(actor, current.userId);
        if (current.status === "FINISHED" && current.result) return;
        if (current.currentStepNumber !== input.expectedStepNumber) {
          throw new AppError(409, "STALE_JOURNEY_STEP", "The Journey has moved beyond the expected step.");
        }
        const activeStep = current.steps.find((step) => step.stepNumber === current.currentStepNumber);
        if (
          current.status !== "ACTIVE" ||
          !activeStep ||
          activeStep.status !== "IN_PROGRESS" ||
          !activeStep.selectedProductId ||
          !minimumSelectionSatisfied(current.steps)
        ) {
          throw new AppError(409, "MINIMUM_SELECTION_REQUIRED", "The minimum Journey selection is not complete.");
        }
        const currentSelectedIds = current.steps
          .flatMap((step) => (step.selectedProductId ? [step.selectedProductId] : []));
        if (
          currentSelectedIds.length !== selectedIds.length ||
          currentSelectedIds.some((id, index) => id !== selectedIds[index])
        ) {
          throw new AppError(409, "STALE_JOURNEY_STEP", "The Journey selection changed before completion.");
        }
        for (const step of current.steps.filter((item) => item.selectedProductId)) {
          if (!isSupportedJourneyStage(step.stage)) {
            throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
          }
          const eligible = await findEligibleProductInTransaction(transaction, {
            storeId: current.storeId,
            zoneId: step.zoneId,
            productId: step.selectedProductId!,
            stage: step.stage,
          });
          if (!eligible) {
            throw new AppError(409, "PRODUCT_NOT_ELIGIBLE", "A selected product is no longer eligible.");
          }
        }
        await createJourneyResultInTransaction(transaction, {
          journeyId,
          ...result,
          personaBaseKey: PERSONA_BASE_KEY,
          shareToken,
        });
        await finishJourneyInTransaction(transaction, {
          journeyId,
          reservationId: current.reservationId,
          currentStepId: activeStep.id,
          finishedAt: new Date(),
        });
      });
      return getJourneyAggregateInternal(journeyId);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const latest = await findJourneyResultPlan(journeyId);
        if (latest?.status === "FINISHED" && latest.result) {
          return getJourneyAggregateForOwner(actor, journeyId);
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
