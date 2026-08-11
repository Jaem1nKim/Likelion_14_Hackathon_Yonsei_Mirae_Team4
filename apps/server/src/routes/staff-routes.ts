import { Router } from "express";

import {
  getStaffJourney,
  getStaffReservations,
} from "../controllers/staff-controller.js";
import {
  requireDemoUser,
  requireStaff,
} from "../middleware/demo-user-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import {
  staffJourneyParamsSchema,
  staffReservationQuerySchema,
} from "../schemas/staff-schemas.js";

export const staffRouter = Router();

staffRouter.use(requireDemoUser, requireStaff);
staffRouter.get(
  "/reservations",
  validateRequest({ query: staffReservationQuerySchema }),
  getStaffReservations,
);
staffRouter.get(
  "/journeys/:journeyId",
  validateRequest({ params: staffJourneyParamsSchema, query: emptyQuerySchema }),
  getStaffJourney,
);
