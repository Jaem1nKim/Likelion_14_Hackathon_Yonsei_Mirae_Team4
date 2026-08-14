import type { ProductView } from "@mcm/shared";

import type { BagOverlayConfig } from "./bag-pose";

export type BagArAsset = BagOverlayConfig & {
  path: string;
};

const BAG_ASSETS_BY_SKU: Readonly<Record<string, BagArAsset>> = {
  "DEMO-BAG-001": {
    path: "/assets/ar/bag/demo-urban-carry-backpack.webp",
    aspectRatio: 0.82,
    scaleMultiplier: 1.10,
    offsetX: 0,
    offsetY: 0.46,
    rotationOffset: 0,
    anchor: "UPPER_TORSO",
  },
  "DEMO-BAG-002": {
    path: "/assets/ar/bag/demo-classic-boston-bag.webp",
    aspectRatio: 1.28,
    scaleMultiplier: 1.02,
    offsetX: 0.58,
    offsetY: 0.76,
    rotationOffset: 0.025,
    anchor: "LOWER_SIDE",
  },
  "DEMO-BAG-003": {
    path: "/assets/ar/bag/demo-signal-mini-crossbody.webp",
    aspectRatio: 0.86,
    scaleMultiplier: 0.72,
    offsetX: -0.24,
    offsetY: 0.63,
    rotationOffset: -0.075,
    anchor: "CROSSBODY",
  },
};

const BAG_ASSETS_BY_PRODUCT_ID: Readonly<Record<string, BagArAsset>> = {};

export function getBagArAsset(
  product: Pick<ProductView, "id" | "sku" | "category">,
): BagArAsset | null {
  if (product.category !== "BAG") return null;
  return BAG_ASSETS_BY_PRODUCT_ID[product.id] ?? BAG_ASSETS_BY_SKU[product.sku] ?? null;
}

export const REQUIRED_BAG_AR_ASSET_PATHS = Object.values(BAG_ASSETS_BY_SKU)
  .map(({ path }) => path)
  .sort();
