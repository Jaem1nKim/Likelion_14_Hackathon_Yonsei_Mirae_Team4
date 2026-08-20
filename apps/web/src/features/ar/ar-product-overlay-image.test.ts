import { describe, expect, it } from "vitest";

import {
  imageAspectRatio,
  isCollectionProductAssetPath,
  removeNeutralBackground,
} from "./ar-product-overlay-image";

describe("collection product AR image preparation", () => {
  it("only preprocesses the registered collection asset tree", () => {
    expect(isCollectionProductAssetPath(
      "/assets/products/mcm-collection/bag/example.webp",
    )).toBe(true);
    expect(isCollectionProductAssetPath("/assets/ar/bag/demo.webp")).toBe(false);
  });

  it("makes neutral background transparent and retains product pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255,
      25, 30, 35, 255,
      245, 244, 246, 255,
      40, 45, 50, 255,
    ]);

    const bounds = removeNeutralBackground(pixels, 2, 2);

    expect(pixels[3]).toBe(0);
    expect(pixels[7]).toBe(255);
    expect(pixels[11]).toBeLessThan(255);
    expect(bounds).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
  });

  it("uses the prepared image aspect ratio without losing the configured fallback", () => {
    expect(imageAspectRatio(null, 1.25)).toBe(1.25);
    expect(imageAspectRatio({ naturalWidth: 300, naturalHeight: 100 } as HTMLImageElement, 1))
      .toBe(3);
  });
});
