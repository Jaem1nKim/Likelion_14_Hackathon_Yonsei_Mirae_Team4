import { Router } from "express";

import { getProductDetail } from "../controllers/product-controller.js";
import { requireDemoUser } from "../middleware/demo-user-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { emptyQuerySchema } from "../schemas/common-schemas.js";
import { productIdParamsSchema } from "../schemas/product-schemas.js";

export const productRouter = Router();

productRouter.get(
  "/:productId",
  validateRequest({ params: productIdParamsSchema, query: emptyQuerySchema }),
  requireDemoUser,
  getProductDetail,
);
