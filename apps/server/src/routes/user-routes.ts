import { Router } from "express";

import {
  getConsent,
  putConsent,
} from "../controllers/consent-controller.js";
import { getProfile } from "../controllers/user-controller.js";
import {
  requireCustomerOwner,
  requireDemoUser,
} from "../middleware/demo-user-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import { userIdParamsSchema } from "../schemas/demo-schemas.js";
import { putConsentBodySchema } from "../schemas/consent-schemas.js";

export const userRouter = Router();

userRouter.get(
  "/:userId/consent",
  validateRequest({ params: userIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  requireCustomerOwner,
  getConsent,
);
userRouter.put(
  "/:userId/consent",
  validateRequest({
    params: userIdParamsSchema,
    query: emptyQuerySchema,
    body: putConsentBodySchema,
  }),
  requireDemoUser,
  requireCustomerOwner,
  putConsent,
);

userRouter.get(
  "/:userId/profile",
  validateRequest({ params: userIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  requireCustomerOwner,
  getProfile,
);
