import type { ProductView } from "@mcm/shared";
import { PRODUCT_AR_ASSET_PATHS_BY_SKU } from "@mcm/shared";

import type { ApparelOverlayConfig } from "./apparel-pose";

export type ApparelArAsset = ApparelOverlayConfig & {
  path: string;
};

function collectionApparel(
  sku: keyof typeof PRODUCT_AR_ASSET_PATHS_BY_SKU,
  scaleMultiplier: number,
  offsetY: number,
): ApparelArAsset {
  return {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU[sku],
    scaleMultiplier,
    offsetX: 0,
    offsetY,
    rotationOffset: 0,
  };
}

const APPAREL_ASSETS_BY_SKU: Readonly<Record<string, ApparelArAsset>> = {
  "DEMO-APP-001": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-APP-001"],
    scaleMultiplier: 1.08,
    offsetX: 0,
    offsetY: 0.02,
    rotationOffset: 0,
  },
  "DEMO-APP-002": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-APP-002"],
    scaleMultiplier: 1.12,
    offsetX: 0,
    offsetY: -0.1,
    rotationOffset: 0,
  },
  "DEMO-APP-003": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-APP-003"],
    scaleMultiplier: 1,
    offsetX: 0,
    offsetY: -0.1,
    rotationOffset: 0,
  },
  "MCM-APP-001": collectionApparel("MCM-APP-001", 1.04, -0.06),
  "MCM-APP-002": collectionApparel("MCM-APP-002", 1.08, -0.08),
  "MCM-APP-003": collectionApparel("MCM-APP-003", 1.12, -0.08),
  "MCM-APP-004": collectionApparel("MCM-APP-004", 1.04, -0.07),
  "MCM-APP-005": collectionApparel("MCM-APP-005", 1.03, -0.06),
  "MCM-APP-006": collectionApparel("MCM-APP-006", 1.12, -0.08),
  "MCM-APP-007": collectionApparel("MCM-APP-007", 1.06, -0.07),
  "MCM-APP-008": collectionApparel("MCM-APP-008", 1.06, -0.07),
  "MCM-APP-009": collectionApparel("MCM-APP-009", 1.08, -0.08),
};

const APPAREL_ASSETS_BY_PRODUCT_ID: Readonly<Record<string, ApparelArAsset>> = {
  "40000000-0000-4000-8000-000000000004": APPAREL_ASSETS_BY_SKU["DEMO-APP-001"]!,
  "40000000-0000-4000-8000-000000000005": APPAREL_ASSETS_BY_SKU["DEMO-APP-002"]!,
  "40000000-0000-4000-8000-000000000006": APPAREL_ASSETS_BY_SKU["DEMO-APP-003"]!,
};

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
