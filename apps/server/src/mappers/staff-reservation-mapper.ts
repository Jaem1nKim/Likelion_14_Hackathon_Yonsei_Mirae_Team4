import type { StaffReservationListItem } from "@mcm/shared";

import type { StaffReservationRecord } from "../repositories/staff-repository.js";
import { mapStore } from "./store-mapper.js";

export function mapStaffReservation(
  reservation: StaffReservationRecord,
): StaffReservationListItem {
  return {
    reservationId: reservation.id,
    reservationCode: reservation.reservationCode,
    reservedAt: reservation.reservedAt.toISOString(),
    reservationStatus: reservation.status,
    store: mapStore(reservation.store),
    customer: {
      id: reservation.user.id,
      name: reservation.user.name,
      profileType: reservation.user.profileType,
    },
    journey: reservation.journey
      ? {
          id: reservation.journey.id,
          status: reservation.journey.status,
          currentStage: reservation.journey.currentStage,
          currentStepNumber: reservation.journey.currentStepNumber,
        }
      : null,
  };
}
