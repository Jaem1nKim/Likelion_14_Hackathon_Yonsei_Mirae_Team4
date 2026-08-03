import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const storeViewSelect = {
  id: true,
  code: true,
  name: true,
  location: true,
  description: true,
  imageUrl: true,
  isJourneyEnabled: true,
} as const;

export function findActiveJourneyStores() {
  return prisma.store.findMany({
    where: { isActive: true, isJourneyEnabled: true },
    select: storeViewSelect,
    orderBy: [{ name: "asc" }, { code: "asc" }, { id: "asc" }],
  });
}

export function findActiveStoreById(storeId: string) {
  return prisma.store.findFirst({
    where: { id: storeId, isActive: true },
    select: storeViewSelect,
  });
}

export function findActiveJourneyStoreById(storeId: string) {
  return prisma.store.findFirst({
    where: { id: storeId, isActive: true, isJourneyEnabled: true },
    select: storeViewSelect,
  });
}

export function findActiveJourneyStoreInTransaction(
  transaction: Prisma.TransactionClient,
  storeId: string,
) {
  return transaction.store.findFirst({
    where: { id: storeId, isActive: true, isJourneyEnabled: true },
    select: storeViewSelect,
  });
}

export function findActiveStoreZone(storeId: string, zoneId: string) {
  return prisma.storeZone.findFirst({
    where: { id: zoneId, storeId, isActive: true },
    select: { id: true },
  });
}

export function findActiveStoreZones(storeId: string) {
  return prisma.storeZone.findMany({
    where: { storeId, isActive: true },
    select: {
      id: true,
      storeId: true,
      code: true,
      name: true,
      category: true,
      floor: true,
      directionText: true,
      heritageTitle: true,
      heritageStory: true,
      displayOrder: true,
    },
    orderBy: [{ displayOrder: "asc" }, { code: "asc" }, { id: "asc" }],
  });
}

export type StoreRecord = NonNullable<
  Awaited<ReturnType<typeof findActiveStoreById>>
>;
export type StoreZoneRecord = Awaited<
  ReturnType<typeof findActiveStoreZones>
>[number];
