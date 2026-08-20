import type { ProductView } from "@mcm/shared";
import { PRODUCT_AR_ASSET_PATHS_BY_SKU } from "@mcm/shared";

import type { AccessoryOverlayConfig } from "./accessory-pose";

export type AccessoryArAsset = AccessoryOverlayConfig & {
  path: string;
};

function collectionGlasses(
  sku: keyof typeof PRODUCT_AR_ASSET_PATHS_BY_SKU,
  scaleMultiplier: number,
  offsetY: number,
): AccessoryArAsset {
  return {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU[sku],
    anchor: "GLASSES",
    aspectRatio: 2.35,
    scaleMultiplier,
    offsetX: 0,
    offsetY,
    rotationOffset: 0,
  };
}

const ACCESSORY_ASSETS_BY_SKU: Readonly<Record<string, AccessoryArAsset>> = {
  "DEMO-ACC-001": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-ACC-001"],
    anchor: "WAIST",
    aspectRatio: 4.4,
    scaleMultiplier: 1,
    offsetX: 0,
    offsetY: 0,
    rotationOffset: 0,
  },
  "DEMO-ACC-002": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-ACC-002"],
    anchor: "NECK",
    aspectRatio: 1,
    scaleMultiplier: 0.88,
    offsetX: 0,
    offsetY: 0.04,
    rotationOffset: 0,
  },
  "DEMO-ACC-003": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-ACC-003"],
    anchor: "BAG_ATTACHED",
    aspectRatio: 0.3,
    scaleMultiplier: 0.92,
    offsetX: 0.04,
    offsetY: 0.02,
    rotationOffset: 0.08,
  },
  "MCM-ACC-001": collectionGlasses("MCM-ACC-001", 1, 0.03),
  "MCM-ACC-002": collectionGlasses("MCM-ACC-002", 0.98, 0.03),
  "MCM-ACC-003": collectionGlasses("MCM-ACC-003", 0.94, 0.035),
  "MCM-ACC-004": collectionGlasses("MCM-ACC-004", 1.08, 0.035),
};

const ACCESSORY_ASSETS_BY_PRODUCT_ID: Readonly<Record<string, AccessoryArAsset>> = {
  "40000000-0000-4000-8000-000000000007": ACCESSORY_ASSETS_BY_SKU["DEMO-ACC-001"]!,
  "40000000-0000-4000-8000-000000000008": ACCESSORY_ASSETS_BY_SKU["DEMO-ACC-002"]!,
  "40000000-0000-4000-8000-000000000009": ACCESSORY_ASSETS_BY_SKU["DEMO-ACC-003"]!,
};

export function getAccessoryArAsset(
  product: Pick<ProductView, "id" | "sku" | "category">,
): AccessoryArAsset | null {
  if (product.category !== "ACCESSORY") return null;
  return ACCESSORY_ASSETS_BY_PRODUCT_ID[product.id]
    ?? ACCESSORY_ASSETS_BY_SKU[product.sku]
    ?? null;
}

export const REQUIRED_ACCESSORY_AR_ASSET_PATHS = Object.values(ACCESSORY_ASSETS_BY_SKU)
  .map(({ path }) => path)
  .sort();
