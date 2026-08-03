import type {
  ProductCategory,
  ProductView,
  StoreProductView,
} from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { mapProduct, mapStoreProduct } from "../mappers/product-mapper.js";
import {
  findActiveProductById,
  findEligibleStoreProducts,
} from "../repositories/product-repository.js";
import {
  findActiveJourneyStoreById,
  findActiveStoreZone,
} from "../repositories/store-repository.js";

export async function listStoreProducts(
  storeId: string,
  filters: {
    category?: ProductCategory | undefined;
    zoneId?: string | undefined;
  },
): Promise<StoreProductView[]> {
  const store = await findActiveJourneyStoreById(storeId);
  if (!store) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested Journey store was not found.",
    );
  }

  if (filters.zoneId) {
    const zone = await findActiveStoreZone(storeId, filters.zoneId);
    if (!zone) {
      throw new AppError(
        404,
        "RESOURCE_NOT_FOUND",
        "The requested store zone was not found.",
      );
    }
  }

  const products = await findEligibleStoreProducts(storeId, filters);
  return products.map(mapStoreProduct);
}

export async function getProduct(productId: string): Promise<ProductView> {
  const product = await findActiveProductById(productId);
  if (!product) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested product was not found.",
    );
  }

  return mapProduct(product);
}
