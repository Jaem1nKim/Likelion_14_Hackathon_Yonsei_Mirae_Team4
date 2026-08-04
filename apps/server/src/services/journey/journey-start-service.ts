import type { JourneyAggregate } from "@mcm/shared";

import { AppError } from "../../errors/app-error.js";
import { isPrismaUniqueError } from "../../errors/prisma-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  areStepCandidatesStillEligible,
  findJourneyCandidates,
} from "../../repositories/journey-candidate-repository.js";
import {
  activateJourneyInTransaction,
  createFallbackStepInTransaction,
  findJourneyMutationStateInTransaction,
  findJourneyStartPlan,
  upsertSnapshotInTransaction,
} from "../../repositories/journey-repository.js";
import type { DemoUserContext } from "../../types/demo-user.js";
import { scoreJourneyCandidates } from "./candidate-engine.js";
import { generateFallbackStep } from "./fallback-step-generator.js";
import {
  buildAllowedZones,
  buildCandidateAiViews,
  buildSnapshotAiView,
  scopeCandidatesToFallbackZone,
} from "../ai/ai-input-builder.js";
import { createAiExecutionInTransaction } from "../ai/ai-execution-service.js";
import {
  fallbackStepToAiOutput,
  generateJourneyStepWithAi,
  mapStepGenerationToPersistence,
} from "../ai/journey-step-ai-service.js";
import { JOURNEY_STEP_PROMPT_VERSION } from "../ai/journey-step-prompt.js";
import {
  assertJourneyOwner,
  getJourneyAggregateForOwner,
  getJourneyAggregateInternal,
} from "./journey-state-service.js";
import { buildProfileSnapshot } from "./profile-snapshot-service.js";
import {
  isRetryableJourneyError,
  exhaustedJourneyError,
  JOURNEY_TRANSACTION_ATTEMPTS,
  waitForRetry,
} from "./transaction-retry.js";

export async function startJourney(
  actor: DemoUserContext,
  journeyId: string,
): Promise<JourneyAggregate> {
  const plan = await findJourneyStartPlan(journeyId);
  if (!plan) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
  }
  assertJourneyOwner(actor, plan.userId);
  const validatedAggregate = await getJourneyAggregateForOwner(actor, journeyId);

  if (
    plan.status === "ACTIVE" &&
    plan.currentStage === "BAG" &&
    plan.currentStepNumber === 1
  ) {
    return validatedAggregate;
  }
  if (
    plan.status !== "READY" ||
    plan.currentStage !== "INTRO" ||
    plan.currentStepNumber !== 0
  ) {
    throw new AppError(409, "INVALID_STATE", "The Journey cannot be started from its current state.");
  }
  if (!plan.user.isActive || !plan.store.isActive || !plan.store.isJourneyEnabled) {
    throw new AppError(409, "INVALID_STATE", "The Journey cannot be started from its current state.");
  }

  let snapshot;
  try {
    snapshot = plan.profileSnapshot ?? buildProfileSnapshot(plan);
  } catch {
    throw new AppError(409, "INVALID_STATE", "The Journey profile is unavailable.");
  }
  const profileSnapshot = buildSnapshotAiView(snapshot);
  const preferences = profileSnapshot.preferences;
  const candidates = await findJourneyCandidates({
    storeId: plan.storeId,
    stage: "BAG",
    excludedProductIds: [],
  });
  const scoredCandidates = scoreJourneyCandidates(candidates, {
    practicalityScore: snapshot.practicalityScore,
    expressionScore: snapshot.expressionScore,
    noveltyScore: snapshot.noveltyScore,
    preferences,
  });
  const fallbackStep = generateFallbackStep({
    stage: "BAG",
    stepNumber: 1,
    candidates: scoredCandidates,
  });
  const scopedCandidates = scopeCandidatesToFallbackZone(
    scoredCandidates,
    fallbackStep.zoneId,
  );
  const generation = await generateJourneyStepWithAi(
    {
      purpose: "JOURNEY_STEP",
      promptVersion: JOURNEY_STEP_PROMPT_VERSION,
      journeyId,
      profileSnapshot,
      currentStage: "BAG",
      serverCanFinishJourney: fallbackStep.canFinishJourney,
      candidateProducts: buildCandidateAiViews(scopedCandidates, plan.storeId),
      previousSelectedProducts: [],
      previousRejectedProducts: [],
      allowedZones: buildAllowedZones(scopedCandidates, plan.storeId),
    },
    fallbackStepToAiOutput(fallbackStep),
  );
  const step = mapStepGenerationToPersistence({
    stage: "BAG",
    stepNumber: 1,
    candidates: scopedCandidates,
    generation,
  });

  for (let attempt = 0; attempt < JOURNEY_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const current = await findJourneyMutationStateInTransaction(transaction, journeyId);
        if (!current) {
          throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
        }
        assertJourneyOwner(actor, current.userId);
        if (
          current.status === "ACTIVE" &&
          current.currentStage === "BAG" &&
          current.currentStepNumber === 1
        ) {
          return;
        }
        if (
          current.status !== "READY" ||
          current.currentStage !== "INTRO" ||
          current.currentStepNumber !== 0
        ) {
          throw new AppError(409, "INVALID_STATE", "The Journey cannot be started from its current state.");
        }

        const eligible = await areStepCandidatesStillEligible(transaction, {
          storeId: current.storeId,
          zoneId: step.zoneId,
          stage: "BAG",
          productIds: step.recommendations.map((item) => item.productId),
        });
        if (!eligible) {
          throw new AppError(409, "NO_ELIGIBLE_CANDIDATES", "Eligible products changed before the step was saved.");
        }

        await upsertSnapshotInTransaction(transaction, journeyId, snapshot);
        const createdStep = await createFallbackStepInTransaction(transaction, journeyId, step);
        await createAiExecutionInTransaction(transaction, {
          journeyId,
          journeyStepId: createdStep.id,
          execution: generation.execution,
        });
        await activateJourneyInTransaction(transaction, journeyId, new Date());
      });
      return getJourneyAggregateInternal(journeyId);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const latest = await findJourneyStartPlan(journeyId);
        if (
          latest?.status === "ACTIVE" &&
          latest.currentStage === "BAG" &&
          latest.currentStepNumber === 1
        ) {
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
