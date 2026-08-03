import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const reservationViewSelect = {
  id: true,
  userId: true,
  storeId: true,
  reservedAt: true,
  startQuestionCode: true,
  startAnswerCode: true,
  startAnswerLabel: true,
  qrToken: true,
  reservationCode: true,
  status: true,
  checkedInAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  store: {
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      description: true,
      imageUrl: true,
      isJourneyEnabled: true,
    },
  },
} as const;

export function findReservationById(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    select: reservationViewSelect,
  });
}

export function findReservationByCode(reservationCode: string) {
  return prisma.reservation.findUnique({
    where: { reservationCode },
    select: reservationViewSelect,
  });
}

export function findReservationByIdInTransaction(
  transaction: Prisma.TransactionClient,
  reservationId: string,
) {
  return transaction.reservation.findUnique({
    where: { id: reservationId },
    select: reservationViewSelect,
  });
}

export function findReservationForCheckInInTransaction(
  transaction: Prisma.TransactionClient,
  identifier: { qrToken: string } | { reservationCode: string },
) {
  return transaction.reservation.findFirst({
    where: identifier,
    select: reservationViewSelect,
  });
}

export function createReservationInTransaction(
  transaction: Prisma.TransactionClient,
  data: {
    id: string;
    userId: string;
    storeId: string;
    reservedAt: Date;
    startQuestionCode: string;
    startAnswerCode: string;
    startAnswerLabel: string;
    qrToken: string;
    reservationCode: string;
  },
) {
  return transaction.reservation.create({
    data,
    select: reservationViewSelect,
  });
}

export function markReservationCheckedInInTransaction(
  transaction: Prisma.TransactionClient,
  reservationId: string,
  checkedInAt: Date,
) {
  return transaction.reservation.update({
    where: { id: reservationId },
    data: { status: "CHECKED_IN", checkedInAt },
    select: { id: true },
  });
}

export type ReservationRecord = NonNullable<
  Awaited<ReturnType<typeof findReservationById>>
>;
