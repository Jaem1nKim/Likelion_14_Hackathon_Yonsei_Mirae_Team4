import { INTERACTION_TYPE_VALUES } from "@mcm/shared";
import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

export const journeyIdParamsSchema = z.strictObject({
  journeyId: identifierSchema,
});

export const createInteractionBodySchema = z.strictObject({
  interactionId: z.uuid(),
  journeyStepId: identifierSchema,
  productId: identifierSchema,
  type: z.enum(INTERACTION_TYPE_VALUES),
});

export const journeyMutationBodySchema = z.strictObject({
  expectedStepNumber: z.number().int().min(1).max(3),
});

export type JourneyIdParams = z.infer<typeof journeyIdParamsSchema>;
export type CreateInteractionBody = z.infer<typeof createInteractionBodySchema>;
export type JourneyMutationBody = z.infer<typeof journeyMutationBodySchema>;
