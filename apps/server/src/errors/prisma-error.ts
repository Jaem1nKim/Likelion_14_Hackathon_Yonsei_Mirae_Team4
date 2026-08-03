import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "./app-error.js";

export function isPrismaUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function isPrismaContentionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1008" || error.code === "P2034";
  }
  return error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message);
}

export function mapPrismaError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return new AppError(
        404,
        "RESOURCE_NOT_FOUND",
        "The requested resource was not found.",
      );
    }
    if (error.code === "P2002") {
      return new AppError(
        409,
        "RESOURCE_CONFLICT",
        "The request conflicts with the current resource state.",
      );
    }
    if (error.code === "P1008" || error.code === "P2034") {
      return new AppError(
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
        null,
        "DATABASE_CONTENTION_EXHAUSTED",
      );
    }
  }
  if (error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message)) {
    return new AppError(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred.",
      null,
      "DATABASE_CONTENTION_EXHAUSTED",
    );
  }
  return null;
}
