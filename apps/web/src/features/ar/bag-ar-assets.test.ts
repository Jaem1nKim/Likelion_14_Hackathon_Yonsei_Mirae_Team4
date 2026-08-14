import { describe, expect, it } from "vitest";

import { getBagArAsset, REQUIRED_BAG_AR_ASSET_PATHS } from "./bag-ar-assets";

describe("BAG AR asset mapping", () => {
  it("maps seeded BAG SKUs to transparent AR asset paths", () => {
    const asset = getBagArAsset({ id: "bag-1", sku: "DEMO-BAG-001", category: "BAG" });
    expect(asset?.path).toBe("/assets/ar/bag/demo-urban-carry-backpack.webp");
    expect(asset?.anchor).toBe("UPPER_TORSO");
    expect(asset?.scaleMultiplier).toBe(1.10);
    expect(REQUIRED_BAG_AR_ASSET_PATHS).toHaveLength(3);
  });

  it("does not map non-BAG products", () => {
    expect(getBagArAsset({ id: "apparel-1", sku: "DEMO-BAG-001", category: "APPAREL" })).toBeNull();
  });

  it("returns null when a BAG has no configured AR asset", () => {
    expect(getBagArAsset({ id: "bag-x", sku: "UNKNOWN-BAG", category: "BAG" })).toBeNull();
  });
});
