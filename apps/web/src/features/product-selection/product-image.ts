import type { ProductView } from "@mcm/shared";

import { getAccessoryArAsset } from "../ar/accessory-ar-assets";
import { getApparelArAsset } from "../ar/apparel-ar-assets";
import { getBagArAsset } from "../ar/bag-ar-assets";

export type ProductImageData = Pick<ProductView, "id" | "sku" | "category"> & {
  imageUrl?: string | null;
};

const LEGACY_DEMO_PLACEHOLDER =
  /^\/assets\/demo\/products\/demo-(?:bag|app|acc)-00[1-3]\.png(?:[?#].*)?$/i;

function getRegisteredProductAsset(product: ProductImageData): string | null {
  return getBagArAsset(product)?.path
    ?? getApparelArAsset(product)?.path
    ?? getAccessoryArAsset(product)?.path
    ?? null;
}

export function getProductImageSources(product: ProductImageData): string[] {
  const registeredAsset = getRegisteredProductAsset(product);
  const apiImage = product.imageUrl?.trim() ?? "";
  const sources: string[] = [];

  if (registeredAsset) sources.push(registeredAsset);
  if (apiImage && !LEGACY_DEMO_PLACEHOLDER.test(apiImage)) sources.push(apiImage);

  return [...new Set(sources)];
}
