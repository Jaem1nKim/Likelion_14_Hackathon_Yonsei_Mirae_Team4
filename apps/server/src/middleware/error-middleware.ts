import type { ApiError } from "@mcm/shared";
import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { mapPrismaError } from "../errors/prisma-error.js";

function logInternalError(error: AppError) {
  if (error.code === "INTERNAL_ERROR") {
    console.error(`[server-error] ${error.logCode ?? "INTERNAL_ERROR"}`);
  }
}

function sendAppError(response: Parameters<ErrorRequestHandler>[2], error: AppError) {
  logInternalError(error);
  response.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  });
}

export const errorMiddleware: ErrorRequestHandler<
  Record<string, never>,
  ApiError
> = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendAppError(response, error);
    return;
  }

  const persistenceError = mapPrismaError(error);
  if (persistenceError) {
    sendAppError(response, persistenceError);
    return;
  }

  console.error("[server-error] UNEXPECTED_ERROR");

  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: null,
    },
  });
};
