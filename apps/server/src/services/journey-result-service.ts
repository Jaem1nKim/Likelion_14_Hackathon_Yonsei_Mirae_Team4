import type {
  CustomerJourneyResultView,
  SharedJourneyResultView,
} from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { mapJourneyResult } from "../mappers/journey-result-mapper.js";
import { mapSharedJourneyResult } from "../mappers/shared-result-mapper.js";
import {
  findJourneyResultForCustomer,
  findSharedJourneyResult,
} from "../repositories/journey-result-repository.js";
import type { DemoUserContext } from "../types/demo-user.js";
import { assertJourneyOwner } from "./journey/journey-state-service.js";

export async function getCustomerJourneyResult(
  actor: DemoUserContext,
  journeyId: string,
): Promise<CustomerJourneyResultView> {
  const journey = await findJourneyResultForCustomer(journeyId);
  if (!journey) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
  }

  assertJourneyOwner(actor, journey.userId);
  if (journey.status !== "FINISHED" || !journey.result) {
    throw new AppError(409, "RESULT_NOT_READY", "The Journey result is not ready.");
  }

  return mapJourneyResult(journey.result);
}

export async function getSharedJourneyResult(
  shareToken: string,
): Promise<SharedJourneyResultView> {
  const result = await findSharedJourneyResult(shareToken);
  if (!result) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "The shared Journey result was not found.");
  }

  return mapSharedJourneyResult(result);
}
