import type { StoreView, StoreZoneView } from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { mapStore, mapStoreZone } from "../mappers/store-mapper.js";
import {
  findActiveJourneyStores,
  findActiveStoreById,
  findActiveStoreZones,
} from "../repositories/store-repository.js";

export async function listStores(): Promise<StoreView[]> {
  const stores = await findActiveJourneyStores();
  return stores.map(mapStore);
}

export async function getStore(storeId: string): Promise<StoreView> {
  const store = await findActiveStoreById(storeId);
  if (!store) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested store was not found.",
    );
  }

  return mapStore(store);
}

export async function listStoreZones(storeId: string): Promise<StoreZoneView[]> {
  const store = await findActiveStoreById(storeId);
  if (!store) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested store was not found.",
    );
  }

  const zones = await findActiveStoreZones(storeId);
  return zones.map(mapStoreZone);
}
