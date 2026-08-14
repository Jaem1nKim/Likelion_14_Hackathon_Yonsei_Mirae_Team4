import type { ProductView } from "@mcm/shared";

import type { ApparelOverlayConfig } from "./apparel-pose";

export type ApparelArAsset = ApparelOverlayConfig & {
  path: string;
};

const APPAREL_ASSETS_BY_SKU: Readonly<Record<string, ApparelArAsset>> = {
  "DEMO-APP-001": {
    path: "/assets/ar/apparel/demo-monogram-backpack-vest.webp",
    scaleMultiplier: 1.08,
    offsetX: 0,
    offsetY: 0.02,
    rotationOffset: 0,
  },
  "DEMO-APP-002": {
    path: "/assets/ar/apparel/demo-blouson-leather-jacket.webp",
    scaleMultiplier: 1.12,
    offsetX: 0,
    offsetY: -0.1,
    rotationOffset: 0,
  },
  "DEMO-APP-003": {
    path: "/assets/ar/apparel/demo-essential-logo-patch-varsity-jacket.webp",
    scaleMultiplier: 1,
    offsetX: 0,
    offsetY: -0.1,
    rotationOffset: 0,
  },
};

const APPAREL_ASSETS_BY_PRODUCT_ID: Readonly<Record<string, ApparelArAsset>> = {};

export function getApparelArAsset(
  product: Pick<ProductView, "id" | "sku" | "category">,
): ApparelArAsset | null {
  if (product.category !== "APPAREL") return null;
  return APPAREL_ASSETS_BY_PRODUCT_ID[product.id]
    ?? APPAREL_ASSETS_BY_SKU[product.sku]
    ?? null;
}

export const REQUIRED_APPAREL_AR_ASSET_PATHS = Object.values(APPAREL_ASSETS_BY_SKU)
  .map(({ path }) => path)
  .sort();
