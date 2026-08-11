import { Router } from "express";

import { getSharedResult } from "../controllers/share-controller.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import { shareTokenParamsSchema } from "../schemas/result-schemas.js";

export const shareRouter = Router();

shareRouter.get(
  "/:shareToken",
  validateRequest({ params: shareTokenParamsSchema, query: emptyQuerySchema }),
  getSharedResult,
);
