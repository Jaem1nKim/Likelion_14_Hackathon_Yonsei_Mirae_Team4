import type { JourneyAggregate } from "@mcm/shared";

import { AppError } from "../../errors/app-error.js";
import { mapJourneyAggregate } from "../../mappers/journey-aggregate-mapper.js";
import { findJourneyAggregate } from "../../repositories/journey-repository.js";
import type { DemoUserContext } from "../../types/demo-user.js";

export function assertJourneyOwner(actor: DemoUserContext, userId: string) {
  if (actor.role !== "CUSTOMER" || actor.id !== userId) {
    throw new AppError(403, "FORBIDDEN", "The demo user cannot access this Journey.");
  }
}

export async function getJourneyAggregateForOwner(
  actor: DemoUserContext,
  journeyId: string,
): Promise<JourneyAggregate> {
  const record = await findJourneyAggregate(journeyId);
  if (!record) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
  }
  assertJourneyOwner(actor, record.userId);
  return mapJourneyAggregate(record);
}

export async function getJourneyAggregateInternal(journeyId: string) {
  const record = await findJourneyAggregate(journeyId);
  if (!record) {
    throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
  return mapJourneyAggregate(record);
}
