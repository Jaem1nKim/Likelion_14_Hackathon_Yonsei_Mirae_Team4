import type { ProductView } from "@mcm/shared";

import type { AccessoryOverlayConfig } from "./accessory-pose";

export type AccessoryArAsset = AccessoryOverlayConfig & {
  path: string;
};

const ACCESSORY_ASSETS_BY_SKU: Readonly<Record<string, AccessoryArAsset>> = {
  "DEMO-ACC-001": {
    path: "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp",
    anchor: "WAIST",
    aspectRatio: 4.4,
    scaleMultiplier: 1,
    offsetX: 0,
    offsetY: 0,
    rotationOffset: 0,
  },
  "DEMO-ACC-002": {
    path: "/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp",
    anchor: "NECK",
    aspectRatio: 1,
    scaleMultiplier: 0.88,
    offsetX: 0,
    offsetY: 0.04,
    rotationOffset: 0,
  },
  "DEMO-ACC-003": {
    path: "/assets/ar/accessory/demo-aren-rabbit-2d-charm-pink.webp",
    anchor: "BAG_ATTACHED",
    aspectRatio: 0.3,
    scaleMultiplier: 0.92,
    offsetX: 0.04,
    offsetY: 0.02,
    rotationOffset: 0.08,
  },
};

const ACCESSORY_ASSETS_BY_PRODUCT_ID: Readonly<Record<string, AccessoryArAsset>> = {};

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
