import type { CheckInRequest, JourneyAggregate } from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { mapMinimalJourneyAggregate } from "../mappers/journey-aggregate-mapper.js";
import {
  createReadyJourneyInTransaction,
  findJourneyByReservationInTransaction,
  findMinimalJourneyAggregate,
} from "../repositories/journey-repository.js";
import {
  findReservationForCheckInInTransaction,
  markReservationCheckedInInTransaction,
} from "../repositories/reservation-repository.js";
import type { DemoUserContext } from "../types/demo-user.js";
import { assertReservationAccess } from "./reservation-access.js";

const CHECK_IN_ATTEMPTS = 5;

function isRetryableCheckInError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1008", "P2002", "P2034"].includes(error.code);
  }

  return error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message);
}

function checkInIdentifier(
  input: CheckInRequest,
): { qrToken: string } | { reservationCode: string } {
  if ("qrToken" in input && input.qrToken !== undefined) {
    return { qrToken: input.qrToken };
  }

  return { reservationCode: input.reservationCode as string };
}

export async function checkInReservation(
  actor: DemoUserContext,
  input: CheckInRequest,
): Promise<JourneyAggregate> {
  const identifier = checkInIdentifier(input);

  for (let attempt = 0; attempt < CHECK_IN_ATTEMPTS; attempt += 1) {
    try {
      const journeyId = await prisma.$transaction(async (transaction) => {
        const reservation = await findReservationForCheckInInTransaction(
          transaction,
          identifier,
        );
        if (!reservation) {
          throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The requested reservation was not found.",
          );
        }

        assertReservationAccess(actor, reservation.userId);

        if (reservation.status === "CANCELLED" || reservation.status === "EXPIRED") {
          throw new AppError(
            409,
            "INVALID_STATE",
            "The reservation cannot be checked in from its current state.",
          );
        }

        let journey = await findJourneyByReservationInTransaction(
          transaction,
          reservation.id,
        );

        if (reservation.status === "RESERVED") {
          await markReservationCheckedInInTransaction(
            transaction,
            reservation.id,
            new Date(),
          );
        }

        if (!journey) {
          if (reservation.status === "COMPLETED") {
            throw new AppError(
              500,
              "INTERNAL_ERROR",
              "An unexpected error occurred.",
            );
          }

          journey = await createReadyJourneyInTransaction(transaction, {
            userId: reservation.userId,
            reservationId: reservation.id,
            storeId: reservation.storeId,
          });
        }

        return journey.id;
      });

      const aggregate = await findMinimalJourneyAggregate(journeyId);
      if (!aggregate) {
        throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
      }

      return mapMinimalJourneyAggregate(aggregate);
    } catch (error) {
      if (!isRetryableCheckInError(error) || attempt === CHECK_IN_ATTEMPTS - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }

  throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}
