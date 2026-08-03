import type { ProductView, StoreProductView } from "@mcm/shared";

import type {
  ProductRecord,
  StoreProductRecord,
} from "../repositories/product-repository.js";

export function mapProduct(product: ProductRecord): ProductView {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    color: product.color,
    material: product.material,
    priceKrw: product.priceKrw,
    size: product.size,
    capacity: product.capacity,
    wearMethod: product.wearMethod,
    description: product.description,
    imageUrl: product.imageUrl,
    personaLayerUrl: product.personaLayerUrl,
    sceneBackgroundKey: product.sceneBackgroundKey,
    tags: product.tags.map((tag) => ({
      type: tag.type,
      name: tag.name,
      score: tag.score,
      verified: tag.verified,
    })),
  };
}

export function mapStoreProduct(inventory: StoreProductRecord): StoreProductView {
  return {
    ...mapProduct(inventory.product),
    inventory: {
      storeId: inventory.storeId,
      zoneId: inventory.zoneId,
      quantity: inventory.quantity,
      isDisplayAvailable: inventory.isDisplayAvailable,
    },
  };
}
