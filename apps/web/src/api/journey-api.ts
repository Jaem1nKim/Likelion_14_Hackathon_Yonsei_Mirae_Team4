import type {
  CheckInRequest,
  CreateInteractionRequest,
  FinishJourneyRequest,
  NextJourneyRequest,
} from "@mcm/shared";

import { apiRequest } from "./api-client";
import { parseJourneyAggregate } from "./parsers";

export function checkInReservation(body: CheckInRequest) {
  return apiRequest("/reservations/check-in", parseJourneyAggregate, {
    method: "POST",
    body,
  });
}

export function startJourney(journeyId: string) {
  return apiRequest(
    `/journeys/${encodeURIComponent(journeyId)}/start`,
    parseJourneyAggregate,
    { method: "POST" },
  );
}

export function getJourney(journeyId: string, signal?: AbortSignal) {
  return apiRequest(
    `/journeys/${encodeURIComponent(journeyId)}`,
    parseJourneyAggregate,
    { signal },
  );
}

export function createJourneyInteraction(
  journeyId: string,
  body: CreateInteractionRequest,
) {
  return apiRequest(
    `/journeys/${encodeURIComponent(journeyId)}/interactions`,
    parseJourneyAggregate,
    { method: "POST", body },
  );
}

export function nextJourney(journeyId: string, body: NextJourneyRequest) {
  return apiRequest(
    `/journeys/${encodeURIComponent(journeyId)}/next`,
    parseJourneyAggregate,
    { method: "POST", body },
  );
}

export function finishJourney(journeyId: string, body: FinishJourneyRequest) {
  return apiRequest(
    `/journeys/${encodeURIComponent(journeyId)}/finish`,
    parseJourneyAggregate,
    { method: "POST", body },
  );
}
