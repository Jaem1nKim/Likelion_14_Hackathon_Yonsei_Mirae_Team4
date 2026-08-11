import type {
  StaffJourneyView,
  StaffReservationListItem,
} from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { mapStaffJourney } from "../mappers/staff-journey-mapper.js";
import { mapStaffReservation } from "../mappers/staff-reservation-mapper.js";
import {
  findActiveStoreForStaffFilter,
  findStaffJourney,
  findStaffReservations,
} from "../repositories/staff-repository.js";
import type { StaffReservationQuery } from "../schemas/staff-schemas.js";

export async function getStaffReservations(
  query: StaffReservationQuery,
): Promise<StaffReservationListItem[]> {
  if (query.storeId && !(await findActiveStoreForStaffFilter(query.storeId))) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested store was not found.");
  }

  let dateStart: Date | undefined;
  let dateEnd: Date | undefined;
  if (query.date) {
    dateStart = new Date(`${query.date}T00:00:00.000Z`);
    dateEnd = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
  }

  const reservations = await findStaffReservations({
    ...(query.storeId ? { storeId: query.storeId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(dateStart && dateEnd ? { dateStart, dateEnd } : {}),
  });
  return reservations.map(mapStaffReservation);
}

export async function getStaffJourney(
  journeyId: string,
): Promise<StaffJourneyView> {
  const journey = await findStaffJourney(journeyId);
  if (!journey) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
  }
  return mapStaffJourney(journey);
}
