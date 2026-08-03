import {
  PRODUCT_CATEGORY_VALUES,
  type ProductCategory,
} from "@mcm/shared";

import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const productViewSelect = {
  id: true,
  sku: true,
  name: true,
  category: true,
  color: true,
  material: true,
  priceKrw: true,
  size: true,
  capacity: true,
  wearMethod: true,
  description: true,
  imageUrl: true,
  personaLayerUrl: true,
  sceneBackgroundKey: true,
  tags: {
    select: {
      type: true,
      name: true,
      score: true,
      verified: true,
    },
    orderBy: [{ type: "asc" }, { score: "desc" }, { name: "asc" }],
  },
} satisfies Prisma.ProductSelect;

const categoryOrder = new Map(
  PRODUCT_CATEGORY_VALUES.map((category, index) => [category, index]),
);

export function findActiveProductById(productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: productViewSelect,
  });
}

export async function findEligibleStoreProducts(
  storeId: string,
  filters: {
    category?: ProductCategory | undefined;
    zoneId?: string | undefined;
  },
) {
  const inventories = await prisma.inventory.findMany({
    where: {
      storeId,
      quantity: { gt: 0 },
      isDisplayAvailable: true,
      ...(filters.zoneId ? { zoneId: filters.zoneId } : {}),
      zone: { is: { isActive: true } },
      product: {
        is: {
          isActive: true,
          ...(filters.category ? { category: filters.category } : {}),
        },
      },
    },
    select: {
      storeId: true,
      zoneId: true,
      quantity: true,
      isDisplayAvailable: true,
      product: { select: productViewSelect },
    },
  });

  return inventories.sort((left, right) => {
    const categoryDifference =
      (categoryOrder.get(left.product.category) ?? Number.MAX_SAFE_INTEGER) -
      (categoryOrder.get(right.product.category) ?? Number.MAX_SAFE_INTEGER);

    return (
      categoryDifference ||
      left.product.name.localeCompare(right.product.name, "en") ||
      left.product.id.localeCompare(right.product.id, "en")
    );
  });
}

export type ProductRecord = NonNullable<
  Awaited<ReturnType<typeof findActiveProductById>>
>;
export type StoreProductRecord = Awaited<
  ReturnType<typeof findEligibleStoreProducts>
>[number];
