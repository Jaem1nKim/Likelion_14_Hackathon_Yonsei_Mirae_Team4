import {
  PREFERENCE_TYPE_VALUES,
  type JourneyAggregate,
  type JourneyProfileSnapshotView,
} from "@mcm/shared";
import { z } from "zod";

import { AppError } from "../errors/app-error.js";
import type { JourneyAggregateRecord } from "../repositories/journey-repository.js";
import { mapReservationSummary } from "./reservation-mapper.js";
import { mapJourneyResult } from "./journey-result-mapper.js";
import { mapJourneyStep } from "./journey-step-mapper.js";
import { validateJourneyAggregateRecord } from "../validators/journey-aggregate-validator.js";

const preferencesSchema = z.array(
  z.strictObject({
    type: z.enum(PREFERENCE_TYPE_VALUES),
    value: z.string(),
    score: z.number().int().min(0).max(100),
  }),
);

function internalError(logCode: string): never {
  throw new AppError(
    500,
    "INTERNAL_ERROR",
    "An unexpected error occurred.",
    null,
    logCode,
  );
}

function mapSnapshot(
  snapshot: NonNullable<JourneyAggregateRecord["profileSnapshot"]>,
): JourneyProfileSnapshotView {
  let preferences: unknown;
  try {
    preferences = JSON.parse(snapshot.preferencesJson);
  } catch {
    internalError("JOURNEY_SNAPSHOT_JSON");
  }
  const parsed = preferencesSchema.safeParse(preferences);
  if (!parsed.success) internalError("JOURNEY_SNAPSHOT_SCHEMA");

  return {
    longTermTasteSummary: snapshot.longTermTasteSummary,
    todayIntentSummary: snapshot.todayIntentSummary,
    practicalityScore: snapshot.practicalityScore,
    expressionScore: snapshot.expressionScore,
    noveltyScore: snapshot.noveltyScore,
    preferences: parsed.data,
  };
}

export function mapJourneyAggregate(record: JourneyAggregateRecord): JourneyAggregate {
  validateJourneyAggregateRecord(record);
  const currentStep = record.steps.find(
    (step) => step.stepNumber === record.currentStepNumber && step.status === "IN_PROGRESS",
  );
  const completedSteps = record.steps.filter((step) => step.status === "COMPLETED");
  const bagSelected = record.steps.some(
    (step) => step.stage === "BAG" && step.selectedProduct !== null,
  );
  const supportingSelected = record.steps.some(
    (step) =>
      (step.stage === "APPAREL" || step.stage === "ACCESSORY") &&
      step.selectedProduct !== null,
  );

  return {
    journey: {
      id: record.id,
      userId: record.userId,
      reservationId: record.reservationId,
      storeId: record.storeId,
      status: record.status,
      currentStage: record.currentStage,
      currentStepNumber: record.currentStepNumber,
      startedAt: record.startedAt?.toISOString() ?? null,
      finishedAt: record.finishedAt?.toISOString() ?? null,
      cancelledAt: record.cancelledAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
    reservation: mapReservationSummary(record.reservation),
    profileSnapshot: record.profileSnapshot ? mapSnapshot(record.profileSnapshot) : null,
    currentStep: record.status === "ACTIVE" && currentStep ? mapJourneyStep(currentStep) : null,
    completedSteps: completedSteps.map(mapJourneyStep),
    interactions: record.interactions.map((interaction) => ({
      id: interaction.id,
      journeyStepId: interaction.journeyStepId,
      productId: interaction.productId,
      type: interaction.type,
      sequence: interaction.sequence,
      createdAt: interaction.createdAt.toISOString(),
    })),
    canFinishJourney: bagSelected && supportingSelected,
    result: record.result ? mapJourneyResult(record.result) : null,
  };
}

export const mapMinimalJourneyAggregate = mapJourneyAggregate;
