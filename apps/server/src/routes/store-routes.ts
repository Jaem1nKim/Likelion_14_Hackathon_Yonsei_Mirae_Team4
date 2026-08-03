import { Router } from "express";

import {
  getStoreDetail,
  getStoreProducts,
  getStores,
  getStoreZones,
} from "../controllers/store-controller.js";
import { requireDemoUser } from "../middleware/demo-user-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import {
  storeIdParamsSchema,
  storeProductsQuerySchema,
} from "../schemas/store-schemas.js";

export const storeRouter = Router();

storeRouter.get(
  "/",
  validateRequest({ query: emptyQuerySchema }),
  requireDemoUser,
  getStores,
);
storeRouter.get(
  "/:storeId/zones",
  validateRequest({ params: storeIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  getStoreZones,
);
storeRouter.get(
  "/:storeId/products",
  validateRequest({
    params: storeIdParamsSchema,
    query: storeProductsQuerySchema,
  }),
  requireDemoUser,
  getStoreProducts,
);
storeRouter.get(
  "/:storeId",
  validateRequest({ params: storeIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  getStoreDetail,
);
