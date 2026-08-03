import { Router } from "express";

import {
  getReservation,
  getReservationByManualCode,
  postReservation,
  postReservationCheckIn,
} from "../controllers/reservation-controller.js";
import {
  requireCustomer,
  requireDemoUser,
} from "../middleware/demo-user-middleware.js";
import { requireIdempotencyKey } from "../middleware/idempotency-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import {
  checkInBodySchema,
  createReservationBodySchema,
  reservationCodeParamsSchema,
  reservationIdParamsSchema,
} from "../schemas/reservation-schemas.js";

export const reservationRouter = Router();

reservationRouter.post(
  "/",
  validateRequest({ query: emptyQuerySchema, body: createReservationBodySchema }),
  requireDemoUser,
  requireCustomer,
  requireIdempotencyKey,
  postReservation,
);
reservationRouter.post(
  "/check-in",
  validateRequest({ query: emptyQuerySchema, body: checkInBodySchema }),
  requireDemoUser,
  postReservationCheckIn,
);
reservationRouter.get(
  "/code/:reservationCode",
  validateRequest({
    params: reservationCodeParamsSchema,
    query: emptyQuerySchema,
  }),
  requireDemoUser,
  getReservationByManualCode,
);
reservationRouter.get(
  "/:reservationId",
  validateRequest({ params: reservationIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  getReservation,
);
