import type { Request, RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../errors/app-error.js";

type ValidationSource = "body" | "params" | "query";
type RequestSchemas = Partial<Record<ValidationSource, z.ZodType>>;

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    const validatedInput: Partial<Record<ValidationSource, unknown>> = {};
    const details: Array<{ path: string; reason: string }> = [];

    for (const source of ["params", "query", "body"] as const) {
      const schema = schemas[source];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(request[source]);
      if (result.success) {
        validatedInput[source] = result.data;
        continue;
      }

      details.push(
        ...result.error.issues.map((issue) => ({
          path: [source, ...issue.path].map(String).join("."),
          reason: issue.message,
        })),
      );
    }

    if (details.length > 0) {
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "The request input is invalid.",
          details,
        ),
      );
      return;
    }

    request.validatedInput = validatedInput;
    next();
  };
}

export function getValidatedInput<T>(
  request: Request,
  source: ValidationSource,
): T {
  const value = request.validatedInput?.[source];
  if (value === undefined) {
    throw new AppError(500, "INTERNAL_ERROR", "Validated input is unavailable.");
  }

  return value as T;
}
