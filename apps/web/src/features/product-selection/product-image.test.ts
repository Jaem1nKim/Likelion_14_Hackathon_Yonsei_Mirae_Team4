import { describe, expect, it } from "vitest";

import { getProductImageSources } from "./product-image";

const mappings = [
  ["40000000-0000-4000-8000-000000000001", "DEMO-BAG-001", "BAG", "/assets/ar/bag/demo-urban-carry-backpack.webp"],
  ["40000000-0000-4000-8000-000000000002", "DEMO-BAG-002", "BAG", "/assets/ar/bag/demo-classic-boston-bag.webp"],
  ["40000000-0000-4000-8000-000000000003", "DEMO-BAG-003", "BAG", "/assets/ar/bag/demo-signal-mini-crossbody.webp"],
  ["40000000-0000-4000-8000-000000000004", "DEMO-APP-001", "APPAREL", "/assets/ar/apparel/demo-monogram-backpack-vest.webp"],
  ["40000000-0000-4000-8000-000000000005", "DEMO-APP-002", "APPAREL", "/assets/ar/apparel/demo-blouson-leather-jacket.webp"],
  ["40000000-0000-4000-8000-000000000006", "DEMO-APP-003", "APPAREL", "/assets/ar/apparel/demo-essential-logo-patch-varsity-jacket.webp"],
  ["40000000-0000-4000-8000-000000000007", "DEMO-ACC-001", "ACCESSORY", "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp"],
  ["40000000-0000-4000-8000-000000000008", "DEMO-ACC-002", "ACCESSORY", "/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp"],
  ["40000000-0000-4000-8000-000000000009", "DEMO-ACC-003", "ACCESSORY", "/assets/ar/accessory/demo-aren-rabbit-2d-charm-pink.webp"],
] as const;

describe("Figma product card image sources", () => {
  it.each(mappings)("maps SKU %s / %s to its registered WebP", (id, sku, category, path) => {
    expect(getProductImageSources({
      id,
      sku,
      category,
      imageUrl: `/assets/demo/products/${sku.toLowerCase()}.png`,
    })).toEqual([path]);
  });

  it.each(mappings)("also resolves product ID %s when SKU is unavailable", (id, _sku, category, path) => {
    expect(getProductImageSources({
      id,
      sku: "UNKNOWN-SKU",
      category,
      imageUrl: null,
    })).toEqual([path]);
  });

  it("uses the registered WebP before a non-placeholder API image", () => {
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

  it("returns no source when both registration and API image are absent", () => {
    expect(getProductImageSources({
      id: "unknown",
      sku: "UNKNOWN",
      category: "SHOES",
      imageUrl: null,
    })).toEqual([]);
  });
});
