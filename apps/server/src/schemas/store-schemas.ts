import { PRODUCT_CATEGORY_VALUES } from "@mcm/shared";
import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

export const storeIdParamsSchema = z.strictObject({
  storeId: identifierSchema,
});

export const storeProductsQuerySchema = z.strictObject({
  category: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
  zoneId: identifierSchema.optional(),
});

export type StoreIdParams = z.infer<typeof storeIdParamsSchema>;
export type StoreProductsQuery = z.infer<typeof storeProductsQuerySchema>;
