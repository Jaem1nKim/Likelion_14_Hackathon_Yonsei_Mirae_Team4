import { apiRequest } from "./api-client";
import {
  parseCustomerJourneyResult,
  parseSharedJourneyResult,
} from "./parsers";

export function getJourneyResult(journeyId: string, signal?: AbortSignal) {
  return apiRequest(
    `/journeys/${encodeURIComponent(journeyId)}/result`,
    parseCustomerJourneyResult,
    { signal },
  );
}

export function getSharedJourneyResult(shareToken: string, signal?: AbortSignal) {
  return apiRequest(
    `/share/${encodeURIComponent(shareToken)}`,
    parseSharedJourneyResult,
    { signal, includeDemoUser: false },
  );
}
