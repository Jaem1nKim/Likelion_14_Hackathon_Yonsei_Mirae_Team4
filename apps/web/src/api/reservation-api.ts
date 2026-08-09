import {
  IDEMPOTENCY_KEY_HEADER_NAME,
  type CreateReservationRequest,
} from "@mcm/shared";

import { apiRequest } from "./api-client";
import { parseReservation } from "./parsers";

export function createReservation(
  body: CreateReservationRequest,
  idempotencyKey: string,
) {
  return apiRequest("/reservations", parseReservation, {
    method: "POST",
    body,
    headers: { [IDEMPOTENCY_KEY_HEADER_NAME]: idempotencyKey },
  });
}

export function getReservation(reservationId: string, signal?: AbortSignal) {
  return apiRequest(
    `/reservations/${encodeURIComponent(reservationId)}`,
    parseReservation,
    { signal },
  );
}
