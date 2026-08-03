import type {
  CreateReservationRequest,
  ReservationView,
} from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { mapReservation } from "../mappers/reservation-mapper.js";
import { findCurrentConsentInTransaction } from "../repositories/consent-repository.js";
import {
  createReservationInTransaction,
  findReservationByCode,
  findReservationById,
  findReservationByIdInTransaction,
  type ReservationRecord,
} from "../repositories/reservation-repository.js";
import { findActiveJourneyStoreInTransaction } from "../repositories/store-repository.js";
import { findActiveCustomerInTransaction } from "../repositories/user-repository.js";
import type { DemoUserContext } from "../types/demo-user.js";
import { assertReservationAccess } from "./reservation-access.js";
import { generateQrToken, generateReservationCode } from "./token-service.js";

const TOKEN_GENERATION_ATTEMPTS = 5;

export type CreateReservationResult = {
  reservation: ReservationView;
  created: boolean;
};

function matchesCreateRequest(
  reservation: ReservationRecord,
  userId: string,
  input: CreateReservationRequest,
) {
  return (
    reservation.userId === userId &&
    reservation.storeId === input.storeId &&
    reservation.reservedAt.getTime() === new Date(input.reservedAt).getTime() &&
    reservation.startQuestionCode === input.startQuestionCode &&
    reservation.startAnswerCode === input.startAnswerCode &&
    reservation.startAnswerLabel === input.startAnswerLabel
  );
}

function assertIdempotentMatch(
  reservation: ReservationRecord,
  userId: string,
  input: CreateReservationRequest,
) {
  if (!matchesCreateRequest(reservation, userId, input)) {
    throw new AppError(
      409,
      "RESOURCE_CONFLICT",
      "The Idempotency-Key is already used for a different reservation request.",
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function createReservation(
  userId: string,
  idempotencyKey: string,
  input: CreateReservationRequest,
): Promise<CreateReservationResult> {
  for (let attempt = 0; attempt < TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const existing = await findReservationByIdInTransaction(
          transaction,
          idempotencyKey,
        );
        if (existing) {
          assertIdempotentMatch(existing, userId, input);
          return { record: existing, created: false };
        }

        const user = await findActiveCustomerInTransaction(transaction, userId);
        if (!user) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Only an active customer can create a reservation.",
          );
        }

        const consent = await findCurrentConsentInTransaction(transaction, userId);
        if (!consent?.journeyDataAllowed) {
          throw new AppError(
            403,
            "CONSENT_REQUIRED",
            "Journey data consent is required to create a reservation.",
          );
        }

        const store = await findActiveJourneyStoreInTransaction(
          transaction,
          input.storeId,
        );
        if (!store) {
          throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The requested Journey store was not found.",
          );
        }

        const record = await createReservationInTransaction(transaction, {
          id: idempotencyKey,
          userId,
          storeId: input.storeId,
          reservedAt: new Date(input.reservedAt),
          startQuestionCode: input.startQuestionCode,
          startAnswerCode: input.startAnswerCode,
          startAnswerLabel: input.startAnswerLabel,
          qrToken: generateQrToken(),
          reservationCode: generateReservationCode(),
        });

        return { record, created: true };
      });

      return {
        reservation: mapReservation(result.record),
        created: result.created,
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existing = await findReservationById(idempotencyKey);
      if (existing) {
        assertIdempotentMatch(existing, userId, input);
        return { reservation: mapReservation(existing), created: false };
      }

      if (attempt === TOKEN_GENERATION_ATTEMPTS - 1) {
        throw new AppError(
          500,
          "INTERNAL_ERROR",
          "An unexpected error occurred.",
        );
      }
    }
  }

  throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}

export async function getReservationById(
  actor: DemoUserContext,
  reservationId: string,
): Promise<ReservationView> {
  const reservation = await findReservationById(reservationId);
  if (!reservation) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested reservation was not found.",
    );
  }

  assertReservationAccess(actor, reservation.userId);
  return mapReservation(reservation);
}

export async function getReservationByCode(
  actor: DemoUserContext,
  reservationCode: string,
): Promise<ReservationView> {
  const reservation = await findReservationByCode(reservationCode);
  if (!reservation) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested reservation was not found.",
    );
  }

  assertReservationAccess(actor, reservation.userId);
  return mapReservation(reservation);
}
