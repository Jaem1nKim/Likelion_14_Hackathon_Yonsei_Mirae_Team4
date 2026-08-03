import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const consentViewSelect = {
  id: true,
  userId: true,
  consentVersion: true,
  behaviorDataAllowed: true,
  journeyDataAllowed: true,
  marketingAllowed: true,
  agreedAt: true,
  withdrawnAt: true,
} as const;

export function findCurrentConsent(userId: string) {
  return prisma.consent.findFirst({
    where: { userId, withdrawnAt: null },
    select: consentViewSelect,
    orderBy: [{ agreedAt: "desc" }, { id: "desc" }],
  });
}

export function findCurrentConsentInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  return transaction.consent.findFirst({
    where: { userId, withdrawnAt: null },
    select: consentViewSelect,
    orderBy: [{ agreedAt: "desc" }, { id: "desc" }],
  });
}

export function createConsentInTransaction(
  transaction: Prisma.TransactionClient,
  data: {
    userId: string;
    consentVersion: string;
    behaviorDataAllowed: boolean;
    journeyDataAllowed: boolean;
  },
) {
  return transaction.consent.create({
    data: {
      ...data,
      marketingAllowed: false,
      withdrawnAt: null,
    },
    select: consentViewSelect,
  });
}

export type ConsentRecord = NonNullable<
  Awaited<ReturnType<typeof findCurrentConsent>>
>;
