import { describe, expect, it } from "vitest";

import { getBagArAsset, REQUIRED_BAG_AR_ASSET_PATHS } from "./bag-ar-assets";

describe("BAG AR asset mapping", () => {
  it("maps seeded BAG SKUs to transparent AR asset paths", () => {
    const asset = getBagArAsset({ id: "bag-1", sku: "DEMO-BAG-001", category: "BAG" });
    expect(asset?.path).toBe("/assets/ar/bag/demo-urban-carry-backpack.webp");
    expect(asset?.anchor).toBe("UPPER_TORSO");
    expect(asset?.scaleMultiplier).toBe(1.10);
    expect(REQUIRED_BAG_AR_ASSET_PATHS).toHaveLength(17);
  });

  it("maps all fourteen collection BAG SKUs to distinct product assets and calibration", () => {
    const assets = Array.from({ length: 14 }, (_, index) => {
      const sku = `MCM-BAG-${String(index + 1).padStart(3, "0")}`;
      return getBagArAsset({ id: sku, sku, category: "BAG" });
    });

    expect(assets.every((asset) => (
      asset !== null
      && asset.path.startsWith("/assets/products/mcm-collection/bag/")
      && asset.scaleMultiplier > 0
      && Number.isFinite(asset.offsetX)
      && Number.isFinite(asset.offsetY)
    ))).toBe(true);
    expect(new Set(assets.map((asset) => asset?.path))).toHaveLength(14);
    expect(assets[1]?.anchor).toBe("UPPER_TORSO");
    expect(assets[9]?.anchor).toBe("CROSSBODY");
  });

  it("never exposes a SHOES product through the BAG resolver", () => {
    expect(getBagArAsset({ id: "shoe-1", sku: "MCM-SHOES-001", category: "SHOES" }))
      .toBeNull();
  });

  it("does not map non-BAG products", () => {
    expect(getBagArAsset({ id: "apparel-1", sku: "DEMO-BAG-001", category: "APPAREL" })).toBeNull();
  });

  it("returns null when a BAG has no configured AR asset", () => {
    expect(getBagArAsset({ id: "bag-x", sku: "UNKNOWN-BAG", category: "BAG" })).toBeNull();
  });
});
