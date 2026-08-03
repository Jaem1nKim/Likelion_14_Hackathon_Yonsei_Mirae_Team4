import type { CreateInteractionRequest, JourneyAggregate } from "@mcm/shared";

import { isSupportedJourneyStage } from "../../constants/journey.js";
import { AppError } from "../../errors/app-error.js";
import { isPrismaUniqueError } from "../../errors/prisma-error.js";
import { prisma } from "../../lib/prisma.js";
import { findEligibleProductInTransaction } from "../../repositories/journey-candidate-repository.js";
import {
  createInteractionInTransaction,
  findInteractionById,
  findInteractionByIdInTransaction,
  findJourneyForInteractionInTransaction,
  findJourneyMutationStateInTransaction,
  updateStepSelectionInTransaction,
} from "../../repositories/journey-repository.js";
import type { DemoUserContext } from "../../types/demo-user.js";
import {
  assertJourneyOwner,
  getJourneyAggregateForOwner,
  getJourneyAggregateInternal,
} from "./journey-state-service.js";
import {
  isRetryableJourneyError,
  exhaustedJourneyError,
  JOURNEY_TRANSACTION_ATTEMPTS,
  waitForRetry,
} from "./transaction-retry.js";

function samePayload(
  existing: {
    journeyId: string;
    journeyStepId: string;
    productId: string;
    type: string;
  },
  journeyId: string,
  input: CreateInteractionRequest,
) {
  return (
    existing.journeyId === journeyId &&
    existing.journeyStepId === input.journeyStepId &&
    existing.productId === input.productId &&
    existing.type === input.type
  );
}

export async function createJourneyInteraction(
  actor: DemoUserContext,
  journeyId: string,
  input: CreateInteractionRequest,
): Promise<JourneyAggregate> {
  await getJourneyAggregateForOwner(actor, journeyId);

  for (let attempt = 0; attempt < JOURNEY_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const existing = await findInteractionByIdInTransaction(
          transaction,
          input.interactionId,
        );
        if (existing) {
          if (!samePayload(existing, journeyId, input)) {
            throw new AppError(
              409,
              "RESOURCE_CONFLICT",
              "The interaction id is already associated with a different request.",
            );
          }
          const existingJourney = await findJourneyMutationStateInTransaction(
            transaction,
            journeyId,
          );
          if (!existingJourney) {
            throw new AppError(
              404,
              "RESOURCE_NOT_FOUND",
              "The requested Journey was not found.",
            );
          }
          assertJourneyOwner(actor, existingJourney.userId);
          return;
        }

        const journey = await findJourneyForInteractionInTransaction(
          transaction,
          journeyId,
        );
        if (!journey) {
          throw new AppError(404, "RESOURCE_NOT_FOUND", "The requested Journey was not found.");
        }
        assertJourneyOwner(actor, journey.userId);
        const step = journey.steps[0];
        if (
          journey.status !== "ACTIVE" ||
          !isSupportedJourneyStage(journey.currentStage) ||
          !step ||
          step.id !== input.journeyStepId ||
          step.stepNumber !== journey.currentStepNumber ||
          step.stage !== journey.currentStage ||
          step.status !== "IN_PROGRESS"
        ) {
          throw new AppError(409, "INVALID_STATE", "The interaction does not target the current Journey step.");
        }

        const eligible = await findEligibleProductInTransaction(transaction, {
          storeId: journey.storeId,
          zoneId: step.zoneId,
          productId: input.productId,
          stage: journey.currentStage,
        });
        if (!eligible) {
          throw new AppError(409, "PRODUCT_NOT_ELIGIBLE", "The product is not eligible for the current Journey step.");
        }
        if (input.type === "REJECTED" && step.selectedProductId === input.productId) {
          throw new AppError(409, "INVALID_STATE", "Deselect the current product before rejecting it.");
        }
        if (input.type === "DESELECTED" && step.selectedProductId !== input.productId) {
          throw new AppError(409, "INVALID_STATE", "Only the currently selected product can be deselected.");
        }

        let sequence = (journey.interactions[0]?.sequence ?? 0) + 1;
        if (
          input.type === "SELECTED" &&
          step.selectedProductId &&
          step.selectedProductId !== input.productId
        ) {
          await createInteractionInTransaction(transaction, {
            journeyId,
            journeyStepId: step.id,
            productId: step.selectedProductId,
            type: "DESELECTED",
            sequence,
          });
          sequence += 1;
        }

        await createInteractionInTransaction(transaction, {
          id: input.interactionId,
          journeyId,
          journeyStepId: step.id,
          productId: input.productId,
          type: input.type,
          sequence,
        });

        if (input.type === "SELECTED") {
          await updateStepSelectionInTransaction(transaction, step.id, input.productId);
        } else if (input.type === "DESELECTED") {
          await updateStepSelectionInTransaction(transaction, step.id, null);
        }
      });
      return getJourneyAggregateInternal(journeyId);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const existing = await findInteractionById(input.interactionId);
        if (existing) {
          if (!samePayload(existing, journeyId, input)) {
            throw new AppError(
              409,
              "RESOURCE_CONFLICT",
              "The interaction id is already associated with a different request.",
            );
          }
          return getJourneyAggregateForOwner(actor, journeyId);
        }
      }
      if (!isRetryableJourneyError(error) || attempt === JOURNEY_TRANSACTION_ATTEMPTS - 1) {
        throw exhaustedJourneyError(error);
      }
      await waitForRetry(attempt);
    }
  }
  throw new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}
