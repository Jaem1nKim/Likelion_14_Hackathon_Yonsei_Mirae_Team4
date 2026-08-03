import { Router } from "express";

import { getDemoUsers, postDemoLogin } from "../controllers/demo-controller.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import {
  demoLoginBodySchema,
  demoUsersQuerySchema,
} from "../schemas/demo-schemas.js";

export const demoRouter = Router();

demoRouter.get(
  "/users",
  validateRequest({ query: demoUsersQuerySchema }),
  getDemoUsers,
);
demoRouter.post(
  "/login",
  validateRequest({ query: emptyQuerySchema, body: demoLoginBodySchema }),
  postDemoLogin,
);
