import type { JourneyAggregate } from "@mcm/shared";

import type { MinimalJourneyAggregateRecord } from "../repositories/journey-repository.js";
import { mapReservationSummary } from "./reservation-mapper.js";

function toIsoString(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function mapMinimalJourneyAggregate(
  record: MinimalJourneyAggregateRecord,
): JourneyAggregate {
  return {
    journey: {
      id: record.id,
      userId: record.userId,
      reservationId: record.reservationId,
      storeId: record.storeId,
      status: record.status,
      currentStage: record.currentStage,
      currentStepNumber: record.currentStepNumber,
      startedAt: toIsoString(record.startedAt),
      finishedAt: toIsoString(record.finishedAt),
      cancelledAt: toIsoString(record.cancelledAt),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
    reservation: mapReservationSummary(record.reservation),
    profileSnapshot: null,
    currentStep: null,
    completedSteps: [],
    interactions: [],
    canFinishJourney: false,
    result: null,
  };
}
