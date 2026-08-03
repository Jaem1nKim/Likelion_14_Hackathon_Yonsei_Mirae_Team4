import { PREFERENCE_TYPE_VALUES } from "@mcm/shared";
import { z } from "zod";

import { AppError } from "../../errors/app-error.js";

const preferenceSchema = z.array(
  z.strictObject({
    type: z.enum(PREFERENCE_TYPE_VALUES),
    value: z.string(),
    score: z.number().int().min(0).max(100),
  }),
);

export function parseJourneyPreferences(value: string) {
  try {
    const parsed = preferenceSchema.safeParse(JSON.parse(value));
    if (parsed.success) return parsed.data;
  } catch {
    // The caller converts persisted JSON corruption into a stable API error.
  }
  throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}
