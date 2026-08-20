import type { ProductView } from "@mcm/shared";

import { getAccessoryArAsset } from "../ar/accessory-ar-assets";
import { getApparelArAsset } from "../ar/apparel-ar-assets";
import { getBagArAsset } from "../ar/bag-ar-assets";

export type ProductImageData = Pick<ProductView, "id" | "sku" | "category"> & {
  imageUrl?: string | null;
};

const MISSING_DEMO_PRODUCT_IMAGE =
  /^\/assets\/demo\/products\/demo-(?:bag|app|acc)-00[1-3]\.png(?:[?#].*)?$/i;

function getRegisteredProductAsset(product: ProductImageData): string | null {
  return getBagArAsset(product)?.path
    ?? getApparelArAsset(product)?.path
    ?? getAccessoryArAsset(product)?.path
    ?? null;
}

export function getProductImageSources(product: ProductImageData): string[] {
  const productImage = product.imageUrl?.trim() ?? "";
  const registeredAsset = getRegisteredProductAsset(product);
  const sources: string[] = [];

  // Checked-in product assets are the canonical card images for demo SKUs.
  // API imageUrl is retained only as a fallback for products without a usable mapping.
  if (registeredAsset) sources.push(registeredAsset);
  if (productImage && !MISSING_DEMO_PRODUCT_IMAGE.test(productImage)) sources.push(productImage);

  return [...new Set(sources)];
}
