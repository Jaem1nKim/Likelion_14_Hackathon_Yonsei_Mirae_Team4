import { DEMO_USER_HEADER_NAME } from "@mcm/shared";
import type { Request, RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { findActiveUserContextById } from "../repositories/user-repository.js";
import { identifierSchema } from "../schemas/common-schemas.js";
import type { UserIdParams } from "../schemas/demo-schemas.js";
import { getValidatedInput } from "./validation-middleware.js";

export function getDemoUser(request: Request) {
  if (!request.demoUser) {
    throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }

  return request.demoUser;
}

export const requireDemoUser: RequestHandler = async (request, _response, next) => {
  const headerValue = request.get(DEMO_USER_HEADER_NAME);
  if (!headerValue?.trim()) {
    throw new AppError(
      401,
      "DEMO_USER_REQUIRED",
      `${DEMO_USER_HEADER_NAME} header is required.`,
    );
  }

  const parsedHeader = identifierSchema.safeParse(headerValue);
  if (!parsedHeader.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "The request input is invalid.",
      parsedHeader.error.issues.map((issue) => ({
        path: `headers.${DEMO_USER_HEADER_NAME}`,
        reason: issue.message,
      })),
    );
  }

  const user = await findActiveUserContextById(parsedHeader.data);
  if (!user) {
    throw new AppError(
      401,
      "DEMO_USER_NOT_FOUND",
      "The demo user does not exist or is inactive.",
    );
  }

  request.demoUser = user;
  next();
};

export const requireCustomerOwner: RequestHandler = (request, _response, next) => {
  const user = request.demoUser;
  const { userId } = getValidatedInput<UserIdParams>(request, "params");

  if (!user || user.role !== "CUSTOMER" || user.id !== userId) {
    next(
      new AppError(
        403,
        "FORBIDDEN",
        "The demo user cannot access this customer resource.",
      ),
    );
    return;
  }

  next();
};

export const requireCustomer: RequestHandler = (request, _response, next) => {
  if (request.demoUser?.role !== "CUSTOMER") {
    next(
      new AppError(
        403,
        "FORBIDDEN",
        "Only an active customer can access this resource.",
      ),
    );
    return;
  }

  next();
};
