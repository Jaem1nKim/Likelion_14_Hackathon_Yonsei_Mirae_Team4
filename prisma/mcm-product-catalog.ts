import {
  ProductCategory,
  ProductTagType,
} from "../apps/server/src/generated/prisma/enums.js";

const ASSET_ROOT = "/assets/products/mcm-collection";

const catalog = [
  ["41000000-0000-4000-8000-000000000001", "MCM-BAG-001", "Travia 크러쉬드 레더 퀼티드 숄더백", ProductCategory.BAG, "Black", "Leather", "bag/travia-crushed-leather-quilted-shoulder-bag-black.webp", "QUILTED", "SHOULDER_CARRY"],
  ["41000000-0000-4000-8000-000000000002", "MCM-BAG-002", "Aren 노바 모노그램 ECONYL® 백팩", ProductCategory.BAG, "Black", "ECONYL®", "bag/aren-nova-monogram-econyl-backpack-black.webp", "MONOGRAM", "BACKPACK_CARRY"],
  ["41000000-0000-4000-8000-000000000003", "MCM-BAG-003", "Aren 맥시 모노그램 가죽 드로우스트링 백팩", ProductCategory.BAG, "Pink", "Leather", "bag/aren-maxi-monogram-leather-drawstring-backpack-pink.webp", "MONOGRAM", "BACKPACK_CARRY"],
  ["41000000-0000-4000-8000-000000000004", "MCM-BAG-004", "Aren 비세토스 E/W 숄더백", ProductCategory.BAG, "Black", "Visetos", "bag/aren-visetos-east-west-shoulder-bag-black.webp", "VISETOS", "SHOULDER_CARRY"],
  ["41000000-0000-4000-8000-000000000005", "MCM-BAG-005", "Aren 양가죽 숄더백", ProductCategory.BAG, "Black & White", "Lamb leather", "bag/aren-lamb-leather-shoulder-bag-black-white.webp", "LEATHER", "SHOULDER_CARRY"],
  ["41000000-0000-4000-8000-000000000006", "MCM-BAG-006", "DIA 퀼팅 카프스킨 숄더백", ProductCategory.BAG, "Black", "Calfskin", "bag/dia-quilted-calfskin-shoulder-bag-black.webp", "QUILTED", "SHOULDER_CARRY"],
  ["41000000-0000-4000-8000-000000000007", "MCM-BAG-007", "Diamant 3D 비세토스 레더 믹스 숄더백", ProductCategory.BAG, "Black", "Visetos and leather", "bag/diamant-3d-visetos-leather-mix-shoulder-bag-black.webp", "VISETOS", "SHOULDER_CARRY"],
  ["41000000-0000-4000-8000-000000000008", "MCM-BAG-008", "Diamant 카프 레더 숄더백", ProductCategory.BAG, "Black", "Calf leather", "bag/diamant-calf-leather-shoulder-bag-black.webp", "LEATHER", "SHOULDER_CARRY"],
  ["41000000-0000-4000-8000-000000000009", "MCM-BAG-009", "Himmel 시퀸 드로우스트링 백", ProductCategory.BAG, "Unspecified", null, "bag/himmel-sequin-drawstring-bag.webp", "SEQUIN", "DRAWSTRING"],
  ["41000000-0000-4000-8000-000000000010", "MCM-BAG-010", "Klassik 맥시 모노그램 레더 크로스바디", ProductCategory.BAG, "Navy Blazer", "Leather", "bag/klassik-maxi-monogram-leather-crossbody-navy-blazer.webp", "MONOGRAM", "CROSSBODY"],
  ["41000000-0000-4000-8000-000000000011", "MCM-BAG-011", "Leni 비세토스 쇼퍼", ProductCategory.BAG, "Cognac", "Visetos", "bag/leni-visetos-shopper-cognac.webp", "VISETOS", "SHOPPER"],
  ["41000000-0000-4000-8000-000000000012", "MCM-BAG-012", "New Liz 엠보스드 모노그램 레더 쇼퍼", ProductCategory.BAG, "Black", "Embossed leather", "bag/new-liz-embossed-monogram-leather-shopper-black.webp", "EMBOSSED_MONOGRAM", "SHOPPER"],
  ["41000000-0000-4000-8000-000000000013", "MCM-BAG-013", "Ottomar 맥시 모노그램 레더 위켄더 백", ProductCategory.BAG, "Navy Blazer", "Leather", "bag/ottomar-maxi-monogram-leather-weekender-bag-navy-blazer.webp", "MONOGRAM", "WEEKENDER"],
  ["41000000-0000-4000-8000-000000000014", "MCM-BAG-014", "Stark 사이드 스터드 비세토스 백팩", ProductCategory.BAG, "Cognac", "Visetos", "bag/stark-side-stud-visetos-backpack-cognac.webp", "STUDDED_VISETOS", "BACKPACK_CARRY"],

  ["42000000-0000-4000-8000-000000000001", "MCM-APP-001", "모노그램 데님 자카드 재킷", ProductCategory.APPAREL, "Denim Blue", "Denim jacquard", "apparel/monogram-denim-jacquard-jacket-denim-blue.webp", "MONOGRAM", "LAYERING"],
  ["42000000-0000-4000-8000-000000000002", "MCM-APP-002", "모노그램 프린트 가죽 디테일 울 트윌 재킷", ProductCategory.APPAREL, "Khaki", "Wool twill and leather", "apparel/monogram-print-leather-wool-twill-jacket-khaki.webp", "MONOGRAM", "LAYERING"],
  ["42000000-0000-4000-8000-000000000003", "MCM-APP-003", "시어링 ECONYL® 애비에이터 재킷", ProductCategory.APPAREL, "Beige", "Shearling and ECONYL®", "apparel/shearling-econyl-aviator-jacket-beige.webp", "AVIATOR", "LAYERING"],
  ["42000000-0000-4000-8000-000000000004", "MCM-APP-004", "에센셜 로고 폰테 트랙 재킷", ProductCategory.APPAREL, "Black", "Ponte", "apparel/essential-logo-ponte-track-jacket-black.webp", "LOGO", "LAYERING"],
  ["42000000-0000-4000-8000-000000000005", "MCM-APP-005", "울 리사이클 캐시미어 라우렐 가디건", ProductCategory.APPAREL, "Dark Grey", "Wool and recycled cashmere", "apparel/wool-recycled-cashmere-laurel-cardigan-dark-grey.webp", "LAUREL", "LAYERING"],
  ["42000000-0000-4000-8000-000000000006", "MCM-APP-006", "페이크 퍼 소매 탈부착 플리스 재킷", ProductCategory.APPAREL, "Cognac", "Fleece and faux fur", "apparel/detachable-faux-fur-sleeve-fleece-jacket-cognac.webp", "DETACHABLE", "LAYERING"],
  ["42000000-0000-4000-8000-000000000007", "MCM-APP-007", "ECONYL® 리버서블 모노그램 프린트 윈드브레이커", ProductCategory.APPAREL, "Black", "ECONYL®", "apparel/econyl-reversible-monogram-print-windbreaker-black.webp", "REVERSIBLE_MONOGRAM", "LAYERING"],
  ["42000000-0000-4000-8000-000000000008", "MCM-APP-008", "ECONYL® 라우렐 로고 윈드브레이커", ProductCategory.APPAREL, "Navy", "ECONYL®", "apparel/econyl-laurel-logo-windbreaker-navy.webp", "LAUREL", "LAYERING"],
  ["42000000-0000-4000-8000-000000000009", "MCM-APP-009", "München 폰테 바시티 재킷", ProductCategory.APPAREL, "Black & White", "Ponte", "apparel/munchen-ponte-varsity-jacket-black-white.webp", "VARSITY", "LAYERING"],

  ["43000000-0000-4000-8000-000000000001", "MCM-ACC-001", "라우렐 지오메트릭 선글라스", ProductCategory.ACCESSORY, "Unspecified", null, "accessory/laurel-geometric-sunglasses.webp", "GEOMETRIC", "EYEWEAR"],
  ["43000000-0000-4000-8000-000000000002", "MCM-ACC-002", "스퀘어 선글라스", ProductCategory.ACCESSORY, "Unspecified", null, "accessory/square-sunglasses.webp", "SQUARE", "EYEWEAR"],
  ["43000000-0000-4000-8000-000000000003", "MCM-ACC-003", "오벌 선글라스", ProductCategory.ACCESSORY, "Unspecified", null, "accessory/oval-sunglasses.webp", "OVAL", "EYEWEAR"],
  ["43000000-0000-4000-8000-000000000004", "MCM-ACC-004", "오버사이즈 스퀘어 선글라스", ProductCategory.ACCESSORY, "Unspecified", null, "accessory/oversized-square-sunglasses.webp", "OVERSIZED_SQUARE", "EYEWEAR"],

  ["44000000-0000-4000-8000-000000000001", "MCM-SHOES-001", "Federlite 라우렐 스웨이드 로우탑 스니커즈", ProductCategory.SHOES, "Mocha Bisque", "Suede", "shoes/federlite-laurel-suede-low-top-sneakers-mocha-bisque.webp", "LAUREL", "FOOTWEAR"],
  ["44000000-0000-4000-8000-000000000002", "MCM-SHOES-002", "Federlite 퀼팅 가죽 로우탑 슬립온 스니커즈", ProductCategory.SHOES, "Unspecified", "Leather", "shoes/federlite-quilted-leather-low-top-slip-on-sneakers.webp", "QUILTED", "FOOTWEAR"],
  ["44000000-0000-4000-8000-000000000003", "MCM-SHOES-003", "Skywander 메탈릭 카프 레더 앵클 부츠", ProductCategory.SHOES, "Unspecified", "Calf leather", "shoes/skywander-metallic-calf-leather-ankle-boots.webp", "METALLIC", "FOOTWEAR"],
  ["44000000-0000-4000-8000-000000000004", "MCM-SHOES-004", "네오 터레인 모노그램 레더 로우탑 스니커즈", ProductCategory.SHOES, "Egret", "Leather", "shoes/neo-terrain-monogram-leather-low-top-sneakers-egret.webp", "MONOGRAM", "FOOTWEAR"],
  ["44000000-0000-4000-8000-000000000005", "MCM-SHOES-005", "Skywander 비세토스 로우탑 스니커즈", ProductCategory.SHOES, "Unspecified", "Visetos", "shoes/skywander-visetos-low-top-sneakers.webp", "VISETOS", "FOOTWEAR"],
] as const;

export const mcmProductSeeds = catalog.map(([
  id,
  sku,
  name,
  category,
  color,
  material,
  assetPath,
]) => ({
  id,
  sku,
  name: name.normalize("NFC"),
  category,
  color,
  material,
  priceKrw: 0,
  size: null,
  capacity: null,
  wearMethod: null,
  description: name.normalize("NFC"),
  imageUrl: `${ASSET_ROOT}/${assetPath}`,
  personaLayerUrl: null,
  sceneBackgroundKey: null,
}));

export const mcmTagSeeds: Array<readonly [string, ProductTagType, string, number]> =
  catalog.flatMap(([, sku, , , , , , styleTag, functionTag]) => [
    [sku, ProductTagType.STYLE, styleTag, 85] as const,
    [sku, ProductTagType.FUNCTION, functionTag, 85] as const,
  ]);
