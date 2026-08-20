import { describe, expect, it } from "vitest";

import { getProductImageSources } from "./product-image";

describe("product recommendation image sources", () => {
  it.each([
    ["DEMO-BAG-001", "BAG", "/assets/ar/bag/demo-urban-carry-backpack.webp"],
    ["DEMO-BAG-002", "BAG", "/assets/ar/bag/demo-classic-boston-bag.webp"],
    ["DEMO-BAG-003", "BAG", "/assets/ar/bag/demo-signal-mini-crossbody.webp"],
    ["DEMO-APP-001", "APPAREL", "/assets/ar/apparel/demo-monogram-backpack-vest.webp"],
    ["DEMO-APP-002", "APPAREL", "/assets/ar/apparel/demo-blouson-leather-jacket.webp"],
    ["DEMO-APP-003", "APPAREL", "/assets/ar/apparel/demo-essential-logo-patch-varsity-jacket.webp"],
    ["DEMO-ACC-001", "ACCESSORY", "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp"],
    ["DEMO-ACC-002", "ACCESSORY", "/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp"],
    ["DEMO-ACC-003", "ACCESSORY", "/assets/ar/accessory/demo-aren-rabbit-2d-charm-pink.webp"],
  ] as const)("maps %s to its checked-in product asset", (sku, category, expectedPath) => {
    expect(getProductImageSources({
      id: `product-${sku}`,
      sku,
      category,
      imageUrl: `/assets/demo/products/${sku.toLowerCase()}.png`,
    })).toEqual([expectedPath]);
  });

  it("keeps the registered asset first and uses the API image only as fallback", () => {
    expect(getProductImageSources({
      id: "product-bag-1",
      sku: "DEMO-BAG-001",
      category: "BAG",
      imageUrl: "/images/product-bag-1.jpg",
    })).toEqual([
      "/assets/ar/bag/demo-urban-carry-backpack.webp",
      "/images/product-bag-1.jpg",
    ]);
  });

  it("uses the registered asset when imageUrl is null or a legacy placeholder", () => {
    const product = {
      id: "product-apparel-2",
      sku: "DEMO-APP-002",
      category: "APPAREL" as const,
    };

    expect(getProductImageSources({ ...product, imageUrl: null })).toEqual([
      "/assets/ar/apparel/demo-blouson-leather-jacket.webp",
    ]);
    expect(getProductImageSources({
      ...product,
      imageUrl: "/assets/demo/products/demo-app-002.png",
    })).toEqual([
      "/assets/ar/apparel/demo-blouson-leather-jacket.webp",
    ]);
  });

  it("returns no image when neither a mapping nor an API image exists", () => {
    expect(getProductImageSources({
      id: "unmapped-product",
      sku: "UNMAPPED-001",
      category: "SHOES",
      imageUrl: null,
    })).toEqual([]);
  });
});
