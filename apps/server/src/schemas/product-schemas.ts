import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

export const productIdParamsSchema = z.strictObject({
  productId: identifierSchema,
});

export type ProductIdParams = z.infer<typeof productIdParamsSchema>;
