import type { ProductView } from "@mcm/shared";
import { PRODUCT_AR_ASSET_PATHS_BY_SKU } from "@mcm/shared";

import type { BagOverlayConfig } from "./bag-pose";

export type BagArAsset = BagOverlayConfig & {
  path: string;
};

function collectionBag(
  sku: keyof typeof PRODUCT_AR_ASSET_PATHS_BY_SKU,
  anchor: BagOverlayConfig["anchor"],
  scaleMultiplier: number,
  offsetX: number,
  offsetY: number,
): BagArAsset {
  return {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU[sku],
    aspectRatio: 0.923,
    scaleMultiplier,
    offsetX,
    offsetY,
    rotationOffset: anchor === "CROSSBODY" ? -0.06 : anchor === "LOWER_SIDE" ? 0.02 : 0,
    anchor,
  };
}

const BAG_ASSETS_BY_SKU: Readonly<Record<string, BagArAsset>> = {
  "DEMO-BAG-001": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-BAG-001"],
    aspectRatio: 0.82,
    scaleMultiplier: 1.10,
    offsetX: 0,
    offsetY: 0.46,
    rotationOffset: 0,
    anchor: "UPPER_TORSO",
  },
  "DEMO-BAG-002": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-BAG-002"],
    aspectRatio: 1.28,
    scaleMultiplier: 1.02,
    offsetX: 0.58,
    offsetY: 0.76,
    rotationOffset: 0.025,
    anchor: "LOWER_SIDE",
  },
  "DEMO-BAG-003": {
    path: PRODUCT_AR_ASSET_PATHS_BY_SKU["DEMO-BAG-003"],
    aspectRatio: 0.86,
    scaleMultiplier: 0.72,
    offsetX: -0.24,
    offsetY: 0.63,
    rotationOffset: -0.075,
    anchor: "CROSSBODY",
  },
  "MCM-BAG-001": collectionBag("MCM-BAG-001", "LOWER_SIDE", 0.82, 0.5, 0.67),
  "MCM-BAG-002": collectionBag("MCM-BAG-002", "UPPER_TORSO", 1.02, 0, 0.47),
  "MCM-BAG-003": collectionBag("MCM-BAG-003", "UPPER_TORSO", 0.96, 0, 0.49),
  "MCM-BAG-004": collectionBag("MCM-BAG-004", "LOWER_SIDE", 0.78, 0.5, 0.66),
  "MCM-BAG-005": collectionBag("MCM-BAG-005", "LOWER_SIDE", 0.8, 0.5, 0.67),
  "MCM-BAG-006": collectionBag("MCM-BAG-006", "LOWER_SIDE", 0.82, 0.5, 0.67),
  "MCM-BAG-007": collectionBag("MCM-BAG-007", "LOWER_SIDE", 0.82, 0.5, 0.68),
  "MCM-BAG-008": collectionBag("MCM-BAG-008", "LOWER_SIDE", 0.8, 0.5, 0.67),
  "MCM-BAG-009": collectionBag("MCM-BAG-009", "LOWER_SIDE", 0.88, 0.48, 0.69),
  "MCM-BAG-010": collectionBag("MCM-BAG-010", "CROSSBODY", 0.74, -0.24, 0.62),
  "MCM-BAG-011": collectionBag("MCM-BAG-011", "LOWER_SIDE", 0.94, 0.48, 0.7),
  "MCM-BAG-012": collectionBag("MCM-BAG-012", "LOWER_SIDE", 0.94, 0.48, 0.7),
  "MCM-BAG-013": collectionBag("MCM-BAG-013", "LOWER_SIDE", 1.02, 0.46, 0.72),
  "MCM-BAG-014": collectionBag("MCM-BAG-014", "UPPER_TORSO", 1.06, 0, 0.48),
};

const BAG_ASSETS_BY_PRODUCT_ID: Readonly<Record<string, BagArAsset>> = {
  "40000000-0000-4000-8000-000000000001": BAG_ASSETS_BY_SKU["DEMO-BAG-001"]!,
  "40000000-0000-4000-8000-000000000002": BAG_ASSETS_BY_SKU["DEMO-BAG-002"]!,
  "40000000-0000-4000-8000-000000000003": BAG_ASSETS_BY_SKU["DEMO-BAG-003"]!,
};

export function getBagArAsset(
  product: Pick<ProductView, "id" | "sku" | "category">,
): BagArAsset | null {
  if (product.category !== "BAG") return null;
  return BAG_ASSETS_BY_PRODUCT_ID[product.id] ?? BAG_ASSETS_BY_SKU[product.sku] ?? null;
}

export const REQUIRED_BAG_AR_ASSET_PATHS = Object.values(BAG_ASSETS_BY_SKU)
  .map(({ path }) => path)
  .sort();
