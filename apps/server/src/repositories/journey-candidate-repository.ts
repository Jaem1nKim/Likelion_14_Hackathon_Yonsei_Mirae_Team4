import type { ProductCategory } from "@mcm/shared";

import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const candidateSelect = {
  product: {
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      color: true,
      material: true,
      size: true,
      capacity: true,
      wearMethod: true,
      description: true,
      sceneBackgroundKey: true,
      tags: {
        select: { type: true, name: true, score: true, verified: true },
        orderBy: [{ type: "asc" }, { score: "desc" }, { name: "asc" }],
      },
    },
  },
  zone: {
    select: {
      id: true,
      code: true,
      name: true,
      floor: true,
      directionText: true,
      heritageTitle: true,
      heritageStory: true,
      displayOrder: true,
    },
  },
} satisfies Prisma.InventorySelect;

export async function findJourneyCandidates(input: {
  storeId: string;
  stage: ProductCategory;
  excludedProductIds: string[];
}) {
  const inventories = await prisma.inventory.findMany({
    where: {
      storeId: input.storeId,
      quantity: { gt: 0 },
      isDisplayAvailable: true,
      ...(input.excludedProductIds.length > 0
        ? { productId: { notIn: input.excludedProductIds } }
        : {}),
      store: { is: { isActive: true, isJourneyEnabled: true } },
      zone: { is: { isActive: true, category: input.stage } },
      product: { is: { isActive: true, category: input.stage } },
    },
    select: candidateSelect,
  });

  return inventories.map((inventory) => ({
    ...inventory.product,
    zoneId: inventory.zone.id,
    zoneCode: inventory.zone.code,
    zoneName: inventory.zone.name,
    zoneFloor: inventory.zone.floor,
    directionText: inventory.zone.directionText,
    heritageTitle: inventory.zone.heritageTitle,
    heritageStory: inventory.zone.heritageStory,
    zoneDisplayOrder: inventory.zone.displayOrder,
  }));
}

export function findEligibleProductInTransaction(
  transaction: Prisma.TransactionClient,
  input: {
    storeId: string;
    zoneId: string;
    productId: string;
    stage: ProductCategory;
  },
) {
  return transaction.inventory.findFirst({
    where: {
      storeId: input.storeId,
      zoneId: input.zoneId,
      productId: input.productId,
      quantity: { gt: 0 },
      isDisplayAvailable: true,
      store: { is: { isActive: true, isJourneyEnabled: true } },
      zone: { is: { isActive: true, category: input.stage } },
      product: { is: { isActive: true, category: input.stage } },
    },
    select: { id: true },
  });
}

export async function areStepCandidatesStillEligible(
  transaction: Prisma.TransactionClient,
  input: {
    storeId: string;
    zoneId: string;
    stage: ProductCategory;
    productIds: string[];
  },
) {
  const count = await transaction.inventory.count({
    where: {
      storeId: input.storeId,
      zoneId: input.zoneId,
      productId: { in: input.productIds },
      quantity: { gt: 0 },
      isDisplayAvailable: true,
      store: { is: { isActive: true, isJourneyEnabled: true } },
      zone: { is: { isActive: true, category: input.stage } },
      product: { is: { isActive: true, category: input.stage } },
    },
  });

  return count === input.productIds.length;
}
