import { describe, expect, it } from "vitest";

import {
  getAccessoryArAsset,
  REQUIRED_ACCESSORY_AR_ASSET_PATHS,
} from "./accessory-ar-assets";

describe("ACCESSORY AR asset mapping", () => {
  it.each([
    ["DEMO-ACC-001", "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp", "WAIST", 1],
    ["DEMO-ACC-002", "/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp", "NECK", 0.88],
    ["DEMO-ACC-003", "/assets/ar/accessory/demo-aren-rabbit-2d-charm-pink.webp", "BAG_ATTACHED", 0.92],
  ] as const)(
    "maps %s to its transparent overlay and calibration",
    (sku, path, anchor, scaleMultiplier) => {
      const asset = getAccessoryArAsset({ id: sku, sku, category: "ACCESSORY" });
      expect(asset).toMatchObject({ path, anchor, scaleMultiplier });
    },
  );

  it("lists all required ACCESSORY assets", () => {
    expect(REQUIRED_ACCESSORY_AR_ASSET_PATHS).toHaveLength(3);
  });

  it("does not map a non-ACCESSORY product", () => {
    expect(getAccessoryArAsset({
      id: "bag-1",
      sku: "DEMO-ACC-001",
      category: "BAG",
    })).toBeNull();
  });

  it("returns null when an ACCESSORY SKU has no configured asset", () => {
    expect(getAccessoryArAsset({
      id: "acc-x",
      sku: "UNKNOWN-ACC",
      category: "ACCESSORY",
    })).toBeNull();
  });
});
