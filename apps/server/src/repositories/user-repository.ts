import type { UserRole } from "@mcm/shared";

import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const demoUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  profileType: true,
  avatarUrl: true,
} as const;

export function findActiveUsers(role?: UserRole) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      ...(role ? { role } : {}),
    },
    select: demoUserSelect,
    orderBy: [{ role: "asc" }, { name: "asc" }, { id: "asc" }],
  });
}

export function findActiveDemoUserById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: demoUserSelect,
  });
}

export function findActiveUserContextById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { id: true, role: true },
  });
}

export function findActiveCustomerInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  return transaction.user.findFirst({
    where: { id: userId, isActive: true, role: "CUSTOMER" },
    select: { id: true },
  });
}

export function findActiveCustomerProfileById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true, role: "CUSTOMER" },
    select: {
      ...demoUserSelect,
      tasteProfile: {
        select: {
          id: true,
          userId: true,
          summary: true,
          practicalityScore: true,
          expressionScore: true,
          noveltyScore: true,
          confidenceScore: true,
          calculatedAt: true,
          updatedAt: true,
          preferences: {
            select: {
              type: true,
              value: true,
              score: true,
              source: true,
            },
            orderBy: [{ type: "asc" }, { score: "desc" }, { value: "asc" }],
          },
        },
      },
    },
  });
}

export type DemoUserRecord = Awaited<
  ReturnType<typeof findActiveDemoUserById>
>;
export type UserProfileRecord = NonNullable<
  Awaited<ReturnType<typeof findActiveCustomerProfileById>>
>;
