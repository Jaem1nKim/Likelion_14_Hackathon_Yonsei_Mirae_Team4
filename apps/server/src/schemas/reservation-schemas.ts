import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

export const reservationCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{8}$/, "Reservation code must be 8 uppercase letters or digits.");

export const idempotencyKeySchema = z
  .string({ error: "Idempotency-Key is required." })
  .trim()
  .pipe(z.uuid("Idempotency-Key must be a UUID."));

const requiredCodeSchema = z.string().trim().min(1).max(64);

export const createReservationBodySchema = z.strictObject({
  storeId: identifierSchema,
  reservedAt: z.iso.datetime({ offset: true }),
  startQuestionCode: requiredCodeSchema,
  startAnswerCode: requiredCodeSchema,
  startAnswerLabel: z.string().trim().min(1).max(200),
});

export const reservationIdParamsSchema = z.strictObject({
  reservationId: identifierSchema,
});

export const reservationCodeParamsSchema = z.strictObject({
  reservationCode: reservationCodeSchema,
});

const qrCheckInSchema = z.strictObject({
  qrToken: z.string().trim().min(32).max(256),
});

const codeCheckInSchema = z.strictObject({
  reservationCode: reservationCodeSchema,
});

export const checkInBodySchema = z.union([qrCheckInSchema, codeCheckInSchema]);

export type CreateReservationBody = z.infer<typeof createReservationBodySchema>;
export type ReservationIdParams = z.infer<typeof reservationIdParamsSchema>;
export type ReservationCodeParams = z.infer<typeof reservationCodeParamsSchema>;
export type CheckInBody = z.infer<typeof checkInBodySchema>;
