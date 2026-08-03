import { z } from "zod";

export const putConsentBodySchema = z.strictObject({
  behaviorDataAllowed: z.boolean(),
  journeyDataAllowed: z.boolean(),
});

export type PutConsentBody = z.infer<typeof putConsentBodySchema>;
