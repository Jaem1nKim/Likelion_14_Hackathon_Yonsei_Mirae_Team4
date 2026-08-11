import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

export const resultJourneyParamsSchema = z.strictObject({
  journeyId: identifierSchema,
});

export const shareTokenParamsSchema = z.strictObject({
  shareToken: z.string().trim().min(1).max(256),
});

export type ResultJourneyParams = z.infer<typeof resultJourneyParamsSchema>;
export type ShareTokenParams = z.infer<typeof shareTokenParamsSchema>;
