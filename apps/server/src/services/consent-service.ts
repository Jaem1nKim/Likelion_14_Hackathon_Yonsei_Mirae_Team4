import type {
  ConsentResponse,
  PutConsentRequest,
} from "@mcm/shared";

import { CURRENT_CONSENT_VERSION } from "../constants/consent.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { mapConsent } from "../mappers/consent-mapper.js";
import {
  createConsentInTransaction,
  findCurrentConsent,
  findCurrentConsentInTransaction,
} from "../repositories/consent-repository.js";
import { findActiveCustomerInTransaction } from "../repositories/user-repository.js";

export async function getCurrentConsent(
  userId: string,
): Promise<ConsentResponse> {
  const consent = await findCurrentConsent(userId);
  return { currentConsent: consent ? mapConsent(consent) : null };
}

export async function putCurrentConsent(
  userId: string,
  input: PutConsentRequest,
): Promise<ConsentResponse> {
  const consent = await prisma.$transaction(async (transaction) => {
    const user = await findActiveCustomerInTransaction(transaction, userId);
    if (!user) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Only an active customer can update consent.",
      );
    }

    const current = await findCurrentConsentInTransaction(transaction, userId);
    if (
      current &&
      current.behaviorDataAllowed === input.behaviorDataAllowed &&
      current.journeyDataAllowed === input.journeyDataAllowed &&
      current.marketingAllowed === false
    ) {
      return current;
    }

    return createConsentInTransaction(transaction, {
      userId,
      consentVersion: CURRENT_CONSENT_VERSION,
      behaviorDataAllowed: input.behaviorDataAllowed,
      journeyDataAllowed: input.journeyDataAllowed,
    });
  });

  return { currentConsent: mapConsent(consent) };
}
