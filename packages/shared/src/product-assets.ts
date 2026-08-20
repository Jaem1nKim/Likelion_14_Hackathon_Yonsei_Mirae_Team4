import type { ProductCategory } from "./enums.js";

export const PRODUCT_AR_ASSET_PATHS_BY_SKU = {
  "DEMO-BAG-001": "/assets/ar/bag/demo-urban-carry-backpack.webp",
  "DEMO-BAG-002": "/assets/ar/bag/demo-classic-boston-bag.webp",
  "DEMO-BAG-003": "/assets/ar/bag/demo-signal-mini-crossbody.webp",
  "DEMO-APP-001": "/assets/ar/apparel/demo-monogram-backpack-vest.webp",
  "DEMO-APP-002": "/assets/ar/apparel/demo-blouson-leather-jacket.webp",
  "DEMO-APP-003": "/assets/ar/apparel/demo-essential-logo-patch-varsity-jacket.webp",
  "DEMO-ACC-001": "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp",
  "DEMO-ACC-002": "/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp",
  "DEMO-ACC-003": "/assets/ar/accessory/demo-aren-rabbit-2d-charm-pink.webp",
  "MCM-BAG-001": "/assets/products/mcm-collection/bag/travia-crushed-leather-quilted-shoulder-bag-black.webp",
  "MCM-BAG-002": "/assets/products/mcm-collection/bag/aren-nova-monogram-econyl-backpack-black.webp",
  "MCM-BAG-003": "/assets/products/mcm-collection/bag/aren-maxi-monogram-leather-drawstring-backpack-pink.webp",
  "MCM-BAG-004": "/assets/products/mcm-collection/bag/aren-visetos-east-west-shoulder-bag-black.webp",
  "MCM-BAG-005": "/assets/products/mcm-collection/bag/aren-lamb-leather-shoulder-bag-black-white.webp",
  "MCM-BAG-006": "/assets/products/mcm-collection/bag/dia-quilted-calfskin-shoulder-bag-black.webp",
  "MCM-BAG-007": "/assets/products/mcm-collection/bag/diamant-3d-visetos-leather-mix-shoulder-bag-black.webp",
  "MCM-BAG-008": "/assets/products/mcm-collection/bag/diamant-calf-leather-shoulder-bag-black.webp",
  "MCM-BAG-009": "/assets/products/mcm-collection/bag/himmel-sequin-drawstring-bag.webp",
  "MCM-BAG-010": "/assets/products/mcm-collection/bag/klassik-maxi-monogram-leather-crossbody-navy-blazer.webp",
  "MCM-BAG-011": "/assets/products/mcm-collection/bag/leni-visetos-shopper-cognac.webp",
  "MCM-BAG-012": "/assets/products/mcm-collection/bag/new-liz-embossed-monogram-leather-shopper-black.webp",
  "MCM-BAG-013": "/assets/products/mcm-collection/bag/ottomar-maxi-monogram-leather-weekender-bag-navy-blazer.webp",
  "MCM-BAG-014": "/assets/products/mcm-collection/bag/stark-side-stud-visetos-backpack-cognac.webp",
  "MCM-APP-001": "/assets/products/mcm-collection/apparel/monogram-denim-jacquard-jacket-denim-blue.webp",
  "MCM-APP-002": "/assets/products/mcm-collection/apparel/monogram-print-leather-wool-twill-jacket-khaki.webp",
  "MCM-APP-003": "/assets/products/mcm-collection/apparel/shearling-econyl-aviator-jacket-beige.webp",
  "MCM-APP-004": "/assets/products/mcm-collection/apparel/essential-logo-ponte-track-jacket-black.webp",
  "MCM-APP-005": "/assets/products/mcm-collection/apparel/wool-recycled-cashmere-laurel-cardigan-dark-grey.webp",
  "MCM-APP-006": "/assets/products/mcm-collection/apparel/detachable-faux-fur-sleeve-fleece-jacket-cognac.webp",
  "MCM-APP-007": "/assets/products/mcm-collection/apparel/econyl-reversible-monogram-print-windbreaker-black.webp",
  "MCM-APP-008": "/assets/products/mcm-collection/apparel/econyl-laurel-logo-windbreaker-navy.webp",
  "MCM-APP-009": "/assets/products/mcm-collection/apparel/munchen-ponte-varsity-jacket-black-white.webp",
  "MCM-ACC-001": "/assets/products/mcm-collection/accessory/laurel-geometric-sunglasses.webp",
  "MCM-ACC-002": "/assets/products/mcm-collection/accessory/square-sunglasses.webp",
  "MCM-ACC-003": "/assets/products/mcm-collection/accessory/oval-sunglasses.webp",
  "MCM-ACC-004": "/assets/products/mcm-collection/accessory/oversized-square-sunglasses.webp",
} as const satisfies Readonly<Record<string, string>>;

const CATEGORY_ASSET_PREFIXES: Partial<Record<ProductCategory, readonly string[]>> = {
  BAG: ["/assets/ar/bag/", "/assets/products/mcm-collection/bag/"],
  APPAREL: ["/assets/ar/apparel/", "/assets/products/mcm-collection/apparel/"],
  ACCESSORY: ["/assets/ar/accessory/", "/assets/products/mcm-collection/accessory/"],
};

export function getProductArAssetPath(
  sku: string,
  category: ProductCategory,
): string | null {
  const assetPath = (
    PRODUCT_AR_ASSET_PATHS_BY_SKU as Readonly<Record<string, string>>
  )[sku];
  const categoryPrefixes = CATEGORY_ASSET_PREFIXES[category];

  return assetPath && categoryPrefixes?.some((prefix) => assetPath.startsWith(prefix))
    ? assetPath
    : null;
}
