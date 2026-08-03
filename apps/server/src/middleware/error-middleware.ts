import type { ApiError } from "@mcm/shared";
import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

export const errorMiddleware: ErrorRequestHandler<
  Record<string, never>,
  ApiError
> = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: null,
    },
  });
};
