import { RESERVATION_STATUS_VALUES } from "@mcm/shared";
import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

function isCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const staffReservationQuerySchema = z.strictObject({
  storeId: identifierSchema.optional(),
  status: z.enum(RESERVATION_STATUS_VALUES).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isCalendarDate, "date must be a valid YYYY-MM-DD value")
    .optional(),
});

export const staffJourneyParamsSchema = z.strictObject({
  journeyId: identifierSchema,
});

export type StaffReservationQuery = z.infer<typeof staffReservationQuerySchema>;
export type StaffJourneyParams = z.infer<typeof staffJourneyParamsSchema>;
