import type { StoreView, StoreZoneView } from "@mcm/shared";

import type {
  StoreRecord,
  StoreZoneRecord,
} from "../repositories/store-repository.js";

export function mapStore(store: StoreRecord): StoreView {
  return {
    id: store.id,
    code: store.code,
    name: store.name,
    location: store.location,
    description: store.description,
    imageUrl: store.imageUrl,
    isJourneyEnabled: store.isJourneyEnabled,
  };
}

export function mapStoreZone(zone: StoreZoneRecord): StoreZoneView {
  return {
    id: zone.id,
    storeId: zone.storeId,
    code: zone.code,
    name: zone.name,
    category: zone.category,
    floor: zone.floor,
    directionText: zone.directionText,
    heritageTitle: zone.heritageTitle,
    heritageStory: zone.heritageStory,
    displayOrder: zone.displayOrder,
  };
}
