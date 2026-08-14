import { describe, expect, it } from "vitest";

import {
  getApparelArAsset,
  REQUIRED_APPAREL_AR_ASSET_PATHS,
} from "./apparel-ar-assets";

describe("APPAREL AR asset mapping", () => {
  it.each([
    ["DEMO-APP-001", "/assets/ar/apparel/demo-monogram-backpack-vest.webp", 1.08, 0.02],
    ["DEMO-APP-002", "/assets/ar/apparel/demo-blouson-leather-jacket.webp", 1.12, -0.1],
    ["DEMO-APP-003", "/assets/ar/apparel/demo-essential-logo-patch-varsity-jacket.webp", 1, -0.1],
  ])("maps %s to its transparent overlay and calibration", (sku, path, scaleMultiplier, offsetY) => {
    const asset = getApparelArAsset({ id: sku, sku, category: "APPAREL" });
    expect(asset?.path).toBe(path);
    expect(asset?.scaleMultiplier).toBe(scaleMultiplier);
    expect(asset?.offsetY).toBe(offsetY);
  });

  it("lists all required APPAREL assets", () => {
    expect(REQUIRED_APPAREL_AR_ASSET_PATHS).toHaveLength(3);
  });

  it("does not map a non-APPAREL product", () => {
    expect(getApparelArAsset({ id: "bag-1", sku: "DEMO-APP-001", category: "BAG" })).toBeNull();
  });

  it("returns null when an APPAREL SKU has no configured asset", () => {
    expect(getApparelArAsset({ id: "app-x", sku: "UNKNOWN-APP", category: "APPAREL" })).toBeNull();
  });
});
