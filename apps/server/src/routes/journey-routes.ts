import { Router } from "express";

import {
  getJourney,
  postJourneyFinish,
  postJourneyInteraction,
  postJourneyNext,
  postJourneyStart,
} from "../controllers/journey-controller.js";
import {
  requireCustomer,
  requireDemoUser,
} from "../middleware/demo-user-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import {
  createInteractionBodySchema,
  journeyIdParamsSchema,
  journeyMutationBodySchema,
} from "../schemas/journey-schemas.js";

export const journeyRouter = Router();

journeyRouter.post(
  "/:journeyId/start",
  validateRequest({ params: journeyIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  requireCustomer,
  postJourneyStart,
);
journeyRouter.get(
  "/:journeyId",
  validateRequest({ params: journeyIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  requireCustomer,
  getJourney,
);
journeyRouter.post(
  "/:journeyId/interactions",
  validateRequest({
    params: journeyIdParamsSchema,
    query: emptyQuerySchema,
    body: createInteractionBodySchema,
  }),
  requireDemoUser,
  requireCustomer,
  postJourneyInteraction,
);
journeyRouter.post(
  "/:journeyId/next",
  validateRequest({
    params: journeyIdParamsSchema,
    query: emptyQuerySchema,
    body: journeyMutationBodySchema,
  }),
  requireDemoUser,
  requireCustomer,
  postJourneyNext,
);
journeyRouter.post(
  "/:journeyId/finish",
  validateRequest({
    params: journeyIdParamsSchema,
    query: emptyQuerySchema,
    body: journeyMutationBodySchema,
  }),
  requireDemoUser,
  requireCustomer,
  postJourneyFinish,
);
