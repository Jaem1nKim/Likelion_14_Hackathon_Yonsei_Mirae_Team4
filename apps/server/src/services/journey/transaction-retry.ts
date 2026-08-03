import {
  isPrismaContentionError,
  isPrismaUniqueError,
  mapPrismaError,
} from "../../errors/prisma-error.js";

export const JOURNEY_TRANSACTION_ATTEMPTS = 5;

export function isRetryableJourneyError(error: unknown) {
  return isPrismaUniqueError(error) || isPrismaContentionError(error);
}

export function exhaustedJourneyError(error: unknown) {
  return mapPrismaError(error) ?? error;
}

export async function waitForRetry(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
}
