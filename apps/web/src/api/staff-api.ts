import type { ReservationStatus } from "@mcm/shared";

import { apiRequest } from "./api-client";
import { parseStaffJourney, parseStaffReservations } from "./parsers";

export type StaffReservationFilters = {
  storeId?: string;
  status?: ReservationStatus;
  date?: string;
};

export function getStaffReservations(
  filters: StaffReservationFilters = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (filters.storeId) query.set("storeId", filters.storeId);
  if (filters.status) query.set("status", filters.status);
  if (filters.date) query.set("date", filters.date);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiRequest(`/staff/reservations${suffix}`, parseStaffReservations, {
    signal,
  });
}

export function getStaffJourney(journeyId: string, signal?: AbortSignal) {
  return apiRequest(
    `/staff/journeys/${encodeURIComponent(journeyId)}`,
    parseStaffJourney,
    { signal },
  );
}
