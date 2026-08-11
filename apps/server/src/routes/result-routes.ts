import { Router } from "express";

import { getJourneyResult } from "../controllers/result-controller.js";
import {
  requireCustomer,
  requireDemoUser,
} from "../middleware/demo-user-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import { resultJourneyParamsSchema } from "../schemas/result-schemas.js";

export const resultRouter = Router();

resultRouter.get(
  "/:journeyId/result",
  validateRequest({ params: resultJourneyParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  requireCustomer,
  getJourneyResult,
);
