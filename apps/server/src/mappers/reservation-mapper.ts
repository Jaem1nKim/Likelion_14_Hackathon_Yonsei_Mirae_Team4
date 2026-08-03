import type {
  JourneyReservationSummary,
  ReservationView,
} from "@mcm/shared";

import type { ReservationRecord } from "../repositories/reservation-repository.js";
import { mapStore } from "./store-mapper.js";

function toIsoString(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function mapReservation(reservation: ReservationRecord): ReservationView {
  return {
    id: reservation.id,
    userId: reservation.userId,
    store: mapStore(reservation.store),
    reservedAt: reservation.reservedAt.toISOString(),
    startQuestionCode: reservation.startQuestionCode,
    startAnswerCode: reservation.startAnswerCode,
    startAnswerLabel: reservation.startAnswerLabel,
    qrToken: reservation.qrToken,
    reservationCode: reservation.reservationCode,
    status: reservation.status,
    checkedInAt: toIsoString(reservation.checkedInAt),
    completedAt: toIsoString(reservation.completedAt),
    cancelledAt: toIsoString(reservation.cancelledAt),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

export function mapReservationSummary(
  reservation: Omit<ReservationRecord, "qrToken" | "reservationCode" | "storeId">,
): JourneyReservationSummary {
  return {
    id: reservation.id,
    userId: reservation.userId,
    store: mapStore(reservation.store),
    reservedAt: reservation.reservedAt.toISOString(),
    startQuestionCode: reservation.startQuestionCode,
    startAnswerCode: reservation.startAnswerCode,
    startAnswerLabel: reservation.startAnswerLabel,
    status: reservation.status,
    checkedInAt: toIsoString(reservation.checkedInAt),
    completedAt: toIsoString(reservation.completedAt),
    cancelledAt: toIsoString(reservation.cancelledAt),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}
