import type { ApiSuccess, ProductView } from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type { ProductIdParams } from "../schemas/product-schemas.js";
import { getProduct } from "../services/product-service.js";

export async function getProductDetail(
  request: Request,
  response: Response<ApiSuccess<ProductView>>,
) {
  const { productId } = getValidatedInput<ProductIdParams>(request, "params");
  response.status(200).json({ data: await getProduct(productId) });
}
