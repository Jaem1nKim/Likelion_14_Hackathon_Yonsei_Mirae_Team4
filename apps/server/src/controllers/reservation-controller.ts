import type {
  ApiSuccess,
  CheckInRequest,
  CreateReservationRequest,
  JourneyAggregate,
  ReservationView,
} from "@mcm/shared";
import type { Request, Response } from "express";

import { getDemoUser } from "../middleware/demo-user-middleware.js";
import { getIdempotencyKey } from "../middleware/idempotency-middleware.js";
import { getValidatedInput } from "../middleware/validation-middleware.js";
import type {
  ReservationCodeParams,
  ReservationIdParams,
} from "../schemas/reservation-schemas.js";
import { checkInReservation } from "../services/check-in-service.js";
import {
  createReservation,
  getReservationByCode,
  getReservationById,
} from "../services/reservation-service.js";

export async function postReservation(
  request: Request,
  response: Response<ApiSuccess<ReservationView>>,
) {
  const actor = getDemoUser(request);
  const input = getValidatedInput<CreateReservationRequest>(request, "body");
  const result = await createReservation(actor.id, getIdempotencyKey(request), input);

  response.status(result.created ? 201 : 200).json({ data: result.reservation });
}

export async function getReservation(
  request: Request,
  response: Response<ApiSuccess<ReservationView>>,
) {
  const { reservationId } = getValidatedInput<ReservationIdParams>(
    request,
    "params",
  );
  response.status(200).json({
    data: await getReservationById(getDemoUser(request), reservationId),
  });
}

export async function getReservationByManualCode(
  request: Request,
  response: Response<ApiSuccess<ReservationView>>,
) {
  const { reservationCode } = getValidatedInput<ReservationCodeParams>(
    request,
    "params",
  );
  response.status(200).json({
    data: await getReservationByCode(getDemoUser(request), reservationCode),
  });
}

export async function postReservationCheckIn(
  request: Request,
  response: Response<ApiSuccess<JourneyAggregate>>,
) {
  const input = getValidatedInput<CheckInRequest>(request, "body");
  response.status(200).json({
    data: await checkInReservation(getDemoUser(request), input),
  });
}
