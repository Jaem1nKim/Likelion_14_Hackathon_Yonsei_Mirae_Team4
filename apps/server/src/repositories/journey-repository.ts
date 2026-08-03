import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export function findJourneyByReservationInTransaction(
  transaction: Prisma.TransactionClient,
  reservationId: string,
) {
  return transaction.journey.findUnique({
    where: { reservationId },
    select: { id: true, status: true },
  });
}

export function createReadyJourneyInTransaction(
  transaction: Prisma.TransactionClient,
  data: { userId: string; reservationId: string; storeId: string },
) {
  return transaction.journey.create({
    data: {
      ...data,
      status: "READY",
      currentStage: "INTRO",
      currentStepNumber: 0,
      startedAt: null,
    },
    select: { id: true, status: true },
  });
}

export function findMinimalJourneyAggregate(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      reservationId: true,
      storeId: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
      startedAt: true,
      finishedAt: true,
      cancelledAt: true,
      createdAt: true,
      updatedAt: true,
      reservation: { select: reservationViewSelectForJourney },
    },
  });
}

const reservationViewSelectForJourney = {
  id: true,
  userId: true,
  reservedAt: true,
  startQuestionCode: true,
  startAnswerCode: true,
  startAnswerLabel: true,
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

export type MinimalJourneyAggregateRecord = NonNullable<
  Awaited<ReturnType<typeof findMinimalJourneyAggregate>>
>;
