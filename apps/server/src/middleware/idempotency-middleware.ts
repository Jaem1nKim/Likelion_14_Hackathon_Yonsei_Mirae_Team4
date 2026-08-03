import { IDEMPOTENCY_KEY_HEADER_NAME } from "@mcm/shared";
import type { Request, RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { idempotencyKeySchema } from "../schemas/reservation-schemas.js";

export const requireIdempotencyKey: RequestHandler = (
  request,
  _response,
  next,
) => {
  const value = request.get(IDEMPOTENCY_KEY_HEADER_NAME);
  const parsed = idempotencyKeySchema.safeParse(value);

  if (!parsed.success) {
    next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "The request input is invalid.",
        parsed.error.issues.map((issue) => ({
          path: `headers.${IDEMPOTENCY_KEY_HEADER_NAME}`,
          reason: issue.message,
        })),
      ),
    );
    return;
  }

  request.idempotencyKey = parsed.data;
  next();
};

export function getIdempotencyKey(request: Request) {
  if (!request.idempotencyKey) {
    throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }

  return request.idempotencyKey;
}
