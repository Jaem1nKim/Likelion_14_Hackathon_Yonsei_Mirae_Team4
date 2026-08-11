import type { Prisma, ReservationStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  journeyAggregateSelect,
  journeyResultSelect,
} from "./journey-repository.js";

const staffStoreSelect = {
  id: true,
  code: true,
  name: true,
  location: true,
  description: true,
  imageUrl: true,
  isJourneyEnabled: true,
} satisfies Prisma.StoreSelect;

const staffReservationSelect = {
  id: true,
  reservationCode: true,
  reservedAt: true,
  status: true,
  store: { select: staffStoreSelect },
  user: {
    select: { id: true, name: true, profileType: true },
  },
  journey: {
    select: {
      id: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
    },
  },
} satisfies Prisma.ReservationSelect;

export type StaffReservationFilters = {
  storeId?: string;
  status?: ReservationStatus;
  dateStart?: Date;
  dateEnd?: Date;
};

export function findActiveStoreForStaffFilter(storeId: string) {
  return prisma.store.findFirst({
    where: { id: storeId, isActive: true },
    select: { id: true },
  });
}

export function findStaffReservations(filters: StaffReservationFilters) {
  return prisma.reservation.findMany({
    where: {
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateStart && filters.dateEnd
        ? { reservedAt: { gte: filters.dateStart, lt: filters.dateEnd } }
        : {}),
    },
    select: staffReservationSelect,
    orderBy: [{ reservedAt: "asc" }, { id: "asc" }],
  });
}

export function findStaffJourney(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      ...journeyAggregateSelect,
      user: {
        select: { id: true, name: true, profileType: true },
      },
      result: {
        select: {
          ...journeyResultSelect,
          staffSummary: true,
        },
      },
    },
  });
}

export type StaffReservationRecord = Awaited<
  ReturnType<typeof findStaffReservations>
>[number];
export type StaffJourneyRecord = NonNullable<
  Awaited<ReturnType<typeof findStaffJourney>>
>;
