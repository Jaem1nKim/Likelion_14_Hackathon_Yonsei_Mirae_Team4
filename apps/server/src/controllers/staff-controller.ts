import type {
  ApiSuccess,
  StaffJourneyView,
  StaffReservationListItem,
} from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type {
  StaffJourneyParams,
  StaffReservationQuery,
} from "../schemas/staff-schemas.js";
import {
  getStaffJourney as getStaffJourneyView,
  getStaffReservations as getStaffReservationViews,
} from "../services/staff-service.js";

export async function getStaffReservations(
  request: Request,
  response: Response<ApiSuccess<StaffReservationListItem[]>>,
) {
  response.status(200).json({
    data: await getStaffReservationViews(
      getValidatedInput<StaffReservationQuery>(request, "query"),
    ),
  });
}

export async function getStaffJourney(
  request: Request,
  response: Response<ApiSuccess<StaffJourneyView>>,
) {
  const { journeyId } = getValidatedInput<StaffJourneyParams>(request, "params");
  response.status(200).json({ data: await getStaffJourneyView(journeyId) });
}
