import {
  OnlineEventType,
  PreferenceType,
  ProductCategory,
  ProductTagType,
  TagSource,
  UserRole,
} from "../apps/server/src/generated/prisma/enums.js";
import {
  disconnectPrisma,
  prisma,
} from "../apps/server/src/lib/prisma.js";
import {
  mcmProductSeeds,
  mcmTagSeeds,
} from "./mcm-product-catalog.js";

const seedDate = new Date("2026-08-01T09:00:00.000Z");

const userSeeds = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    email: "stable.explorer@example.demo",
    name: "Stable Explorer",
    role: UserRole.CUSTOMER,
    profileType: "STABLE_EXPLORER",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    email: "bold.mover@example.demo",
    name: "Bold Mover",
    role: UserRole.CUSTOMER,
    profileType: "BOLD_MOVER",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    email: "journey.staff@example.demo",
    name: "Journey Demo Staff",
    role: UserRole.STAFF,
    profileType: null,
  },
] as const;

const demoProductSeeds = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    sku: "DEMO-BAG-001",
    name: "Demo Urban Carry Backpack",
    category: ProductCategory.BAG,
    color: "BLACK",
    material: "Coated canvas",
    priceKrw: 890000,
    size: "Medium",
    capacity: "Daily essentials and a compact laptop",
    wearMethod: "Backpack or top handle",
    description: "A practical demo backpack with a clean urban structure.",
    imageUrl: "/assets/demo/products/demo-bag-001.png",
    personaLayerUrl: "/assets/demo/persona/demo-bag-001.png",
    sceneBackgroundKey: "CITY_TRANSIT",
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    sku: "DEMO-BAG-002",
    name: "Demo Classic Boston Bag",
    category: ProductCategory.BAG,
    color: "BROWN",
    material: "Coated canvas with synthetic trim",
    priceKrw: 1050000,
    size: "Medium",
    capacity: "Day trip essentials",
    wearMethod: "Top handle or shoulder strap",
    description: "A rounded demo carry bag balancing classic form and flexible use.",
    imageUrl: "/assets/demo/products/demo-bag-002.png",
    personaLayerUrl: "/assets/demo/persona/demo-bag-002.png",
    sceneBackgroundKey: "HERITAGE_LOUNGE",
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    sku: "DEMO-BAG-003",
    name: "Demo Signal Mini Crossbody",
    category: ProductCategory.BAG,
    color: "COBALT",
    material: "Synthetic leather",
    priceKrw: 690000,
    size: "Mini",
    capacity: "Phone, card case and small essentials",
    wearMethod: "Crossbody",
    description: "A compact demo bag using strong color for visible self-expression.",
    imageUrl: "/assets/demo/products/demo-bag-003.png",
    personaLayerUrl: "/assets/demo/persona/demo-bag-003.png",
    sceneBackgroundKey: "COLOR_GALLERY",
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    sku: "DEMO-APP-001",
    name: "Monogram Backpack Vest",
    category: ProductCategory.APPAREL,
    color: "BLACK",
    material: "Technical twill",
    priceKrw: 1290000,
    size: "Unisex M",
    capacity: "Multiple utility pockets",
    wearMethod: "Layered outerwear",
    description: "A monogram backpack vest that combines an apparel silhouette with utility-inspired storage details.",
    imageUrl: "/assets/demo/products/demo-app-001.png",
    personaLayerUrl: "/assets/demo/persona/demo-app-001.png",
    sceneBackgroundKey: "CITY_TRANSIT",
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    sku: "DEMO-APP-002",
    name: "Blouson Leather Jacket",
    category: ProductCategory.APPAREL,
    color: "IVORY",
    material: "Lightweight nylon blend",
    priceKrw: 1190000,
    size: "Unisex M",
    capacity: null,
    wearMethod: "Light outer layer",
    description: "A leather blouson jacket with a streamlined silhouette for a polished layered look.",
    imageUrl: "/assets/demo/products/demo-app-002.png",
    personaLayerUrl: "/assets/demo/persona/demo-app-002.png",
    sceneBackgroundKey: "LIGHT_ATRIUM",
  },
  {
    id: "40000000-0000-4000-8000-000000000006",
    sku: "DEMO-APP-003",
    name: "Essential Logo Patch Varsity Jacket",
    category: ProductCategory.APPAREL,
    color: "COBALT",
    material: "Quilted technical fabric",
    priceKrw: 990000,
    size: "Unisex M",
    capacity: "Two front pockets",
    wearMethod: "Layering vest",
    description: "An essential varsity jacket defined by a logo patch and a relaxed collegiate silhouette.",
    imageUrl: "/assets/demo/products/demo-app-003.png",
    personaLayerUrl: "/assets/demo/persona/demo-app-003.png",
    sceneBackgroundKey: "COLOR_GALLERY",
  },
  {
    id: "40000000-0000-4000-8000-000000000007",
    sku: "DEMO-ACC-001",
    name: "Adjustable M-Art Reversible Belt 1.5” in Lauretos Grey",
    category: ProductCategory.ACCESSORY,
    color: "BLACK_BROWN",
    material: "Synthetic leather",
    priceKrw: 390000,
    size: "Adjustable",
    capacity: null,
    wearMethod: "Waist belt",
    description: "An adjustable 1.5-inch reversible belt in Lauretos Grey, finished with the M-Art buckle.",
    imageUrl: "/assets/demo/products/demo-acc-001.png",
    personaLayerUrl: "/assets/demo/persona/demo-acc-001.png",
    sceneBackgroundKey: "HERITAGE_LOUNGE",
  },
  {
    id: "40000000-0000-4000-8000-000000000008",
    sku: "DEMO-ACC-002",
    name: "MCM Silk Visetos Scarf - Brown",
    category: ProductCategory.ACCESSORY,
    color: "RED_COBALT",
    material: "Silk blend",
    priceKrw: 320000,
    size: "70 x 70 cm",
    capacity: null,
    wearMethod: "Neck, bag handle or hair accessory",
    description: "A brown silk scarf featuring the Visetos motif for versatile styling.",
    imageUrl: "/assets/demo/products/demo-acc-002.png",
    personaLayerUrl: "/assets/demo/persona/demo-acc-002.png",
    sceneBackgroundKey: "COLOR_GALLERY",
  },
  {
    id: "40000000-0000-4000-8000-000000000009",
    sku: "DEMO-ACC-003",
    name: "Aren Rabbit 2D Charm in Visetos Pink",
    category: ProductCategory.ACCESSORY,
    color: "SILVER_YELLOW",
    material: "Metal and woven cord",
    priceKrw: 280000,
    size: "One size",
    capacity: null,
    wearMethod: "Bag strap or detachable charm",
    description: "A pink Aren rabbit 2D charm in Visetos designed as a playful finishing detail.",
    imageUrl: "/assets/demo/products/demo-acc-003.png",
    personaLayerUrl: "/assets/demo/persona/demo-acc-003.png",
    sceneBackgroundKey: "DESIGN_LAB",
  },
] as const;

const demoTagSeeds = [
  ["DEMO-BAG-001", ProductTagType.STYLE, "URBAN", 92],
  ["DEMO-BAG-001", ProductTagType.FUNCTION, "HIGH_CAPACITY", 95],
  ["DEMO-BAG-001", ProductTagType.SILHOUETTE, "STRUCTURED", 86],
  ["DEMO-BAG-002", ProductTagType.STYLE, "CLASSIC", 94],
  ["DEMO-BAG-002", ProductTagType.FUNCTION, "VERSATILE_CARRY", 88],
  ["DEMO-BAG-002", ProductTagType.SILHOUETTE, "ROUNDED", 82],
  ["DEMO-BAG-003", ProductTagType.MOOD, "BOLD", 96],
  ["DEMO-BAG-003", ProductTagType.FUNCTION, "HANDS_FREE", 90],
  ["DEMO-BAG-003", ProductTagType.SILHOUETTE, "COMPACT", 93],
  ["DEMO-APP-001", ProductTagType.STYLE, "PRACTICAL", 93],
  ["DEMO-APP-001", ProductTagType.FUNCTION, "UTILITY_POCKETS", 91],
  ["DEMO-APP-001", ProductTagType.SILHOUETTE, "STRUCTURED", 92],
  ["DEMO-APP-002", ProductTagType.STYLE, "MINIMAL", 88],
  ["DEMO-APP-002", ProductTagType.FUNCTION, "LIGHTWEIGHT", 94],
  ["DEMO-APP-002", ProductTagType.SILHOUETTE, "RELAXED", 87],
  ["DEMO-APP-003", ProductTagType.MOOD, "SELF_EXPRESSION", 97],
  ["DEMO-APP-003", ProductTagType.FUNCTION, "LAYERING", 86],
  ["DEMO-APP-003", ProductTagType.SILHOUETTE, "STRUCTURED", 89],
  ["DEMO-ACC-001", ProductTagType.STYLE, "CLASSIC", 91],
  ["DEMO-ACC-001", ProductTagType.FUNCTION, "REVERSIBLE", 96],
  ["DEMO-ACC-001", ProductTagType.SILHOUETTE, "CLEAN_LINE", 84],
  ["DEMO-ACC-002", ProductTagType.MOOD, "BOLD", 95],
  ["DEMO-ACC-002", ProductTagType.FUNCTION, "MULTI_WEAR", 92],
  ["DEMO-ACC-002", ProductTagType.SILHOUETTE, "FLUID", 88],
  ["DEMO-ACC-003", ProductTagType.MOOD, "PLAYFUL", 90],
  ["DEMO-ACC-003", ProductTagType.FUNCTION, "MODULAR", 97],
  ["DEMO-ACC-003", ProductTagType.SILHOUETTE, "LINEAR", 82],
] as const;

const productSeeds = [...demoProductSeeds, ...mcmProductSeeds];
const tagSeeds = [...demoTagSeeds, ...mcmTagSeeds];

async function seedUsers() {
  return Promise.all(
    userSeeds.map(({ id, email, ...data }) =>
      prisma.user.upsert({
        where: { email },
        update: { email, ...data, avatarUrl: null, isActive: true },
        create: { id, email, ...data, avatarUrl: null, isActive: true },
      }),
    ),
  );
}

async function seedConsents(stableUserId: string, boldUserId: string) {
  const consents = [
    {
      id: "11000000-0000-4000-8000-000000000001",
      userId: stableUserId,
      behaviorDataAllowed: true,
    },
    {
      id: "11000000-0000-4000-8000-000000000002",
      userId: boldUserId,
      behaviorDataAllowed: false,
    },
  ];

  for (const consent of consents) {
    await prisma.consent.upsert({
      where: { id: consent.id },
      update: {
        userId: consent.userId,
        consentVersion: "MVP-2026-08",
        behaviorDataAllowed: consent.behaviorDataAllowed,
        journeyDataAllowed: true,
        marketingAllowed: false,
        agreedAt: seedDate,
        withdrawnAt: null,
      },
      create: {
        ...consent,
        consentVersion: "MVP-2026-08",
        journeyDataAllowed: true,
        marketingAllowed: false,
        agreedAt: seedDate,
      },
    });
  }
}

async function seedTasteProfiles(stableUserId: string, boldUserId: string) {
  const profiles = [
    {
      id: "12000000-0000-4000-8000-000000000001",
      userId: stableUserId,
      summary: "Prefers practical bags, restrained colors and classic urban styling.",
      practicalityScore: 92,
      expressionScore: 58,
      noveltyScore: 30,
      confidenceScore: 92,
      preferences: [
        [PreferenceType.CATEGORY, "BAG", 95],
        [PreferenceType.COLOR, "BLACK", 92],
        [PreferenceType.COLOR, "BROWN", 85],
        [PreferenceType.STYLE, "PRACTICAL", 94],
        [PreferenceType.STYLE, "CLASSIC", 88],
        [PreferenceType.STYLE, "URBAN", 82],
        [PreferenceType.MATERIAL, "COATED_CANVAS", 75],
        [PreferenceType.FUNCTION, "STORAGE", 95],
      ] as const,
    },
    {
      id: "12000000-0000-4000-8000-000000000002",
      userId: boldUserId,
      summary: "Favors mini bags, accessories, strong contrast and expressive structure.",
      practicalityScore: 58,
      expressionScore: 95,
      noveltyScore: 91,
      confidenceScore: 89,
      preferences: [
        [PreferenceType.CATEGORY, "ACCESSORY", 94],
        [PreferenceType.CATEGORY, "BAG", 88],
        [PreferenceType.COLOR, "COBALT", 92],
        [PreferenceType.COLOR, "RED", 88],
        [PreferenceType.STYLE, "BOLD", 97],
        [PreferenceType.STYLE, "SELF_EXPRESSION", 96],
        [PreferenceType.STYLE, "STRUCTURED", 90],
        [PreferenceType.FUNCTION, "MODULAR", 80],
      ] as const,
    },
  ];

  for (const profileSeed of profiles) {
    const { preferences, ...profileData } = profileSeed;
    const profile = await prisma.tasteProfile.upsert({
      where: { userId: profileData.userId },
      update: {
        summary: profileData.summary,
        practicalityScore: profileData.practicalityScore,
        expressionScore: profileData.expressionScore,
        noveltyScore: profileData.noveltyScore,
        confidenceScore: profileData.confidenceScore,
        calculatedAt: seedDate,
      },
      create: { ...profileData, calculatedAt: seedDate },
    });

    for (const [type, value, score] of preferences) {
      await prisma.tastePreference.upsert({
        where: {
          tasteProfileId_type_value: {
            tasteProfileId: profile.id,
            type,
            value,
          },
        },
        update: { score, source: "SEEDED_PROFILE" },
        create: {
          tasteProfileId: profile.id,
          type,
          value,
          score,
          source: "SEEDED_PROFILE",
        },
      });
    }
  }
}

async function seedStore() {
  const store = await prisma.store.upsert({
    where: { code: "MCM-JOURNEY-DEMO" },
    update: {
      name: "MCM Journey Flagship Demo Store",
      location: "Seoul Demo District",
      description: "A fictional flagship environment created only for the hackathon demo.",
      imageUrl: "/assets/demo/store/flagship.png",
      isJourneyEnabled: true,
      isActive: true,
    },
    create: {
      id: "20000000-0000-4000-8000-000000000001",
      code: "MCM-JOURNEY-DEMO",
      name: "MCM Journey Flagship Demo Store",
      location: "Seoul Demo District",
      description: "A fictional flagship environment created only for the hackathon demo.",
      imageUrl: "/assets/demo/store/flagship.png",
      isJourneyEnabled: true,
      isActive: true,
    },
  });

  const zoneSeeds = [
    {
      id: "30000000-0000-4000-8000-000000000001",
      code: "ZONE_BAG",
      name: "Journey Bag Gallery",
      category: ProductCategory.BAG,
      floor: "1F",
      directionText: "Continue to the central bag gallery on the first floor.",
      heritageTitle: "Travel as a starting point",
      heritageStory: "Explore how a bag can become the anchor for a personal journey.",
      displayOrder: 1,
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      code: "ZONE_APPAREL",
      name: "Journey Apparel Studio",
      category: ProductCategory.APPAREL,
      floor: "2F",
      directionText: "Move upstairs to the apparel studio beside the open staircase.",
      heritageTitle: "A complete point of view",
      heritageStory: "Connect the selected bag with an apparel silhouette that extends its mood.",
      displayOrder: 2,
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      code: "ZONE_SHOES",
      name: "Journey Footwear Room",
      category: ProductCategory.SHOES,
      floor: "2F",
      directionText: "The footwear room is located beyond the apparel studio.",
      heritageTitle: "Movement and identity",
      heritageStory: "The footwear zone is retained for schema compatibility and later expansion.",
      displayOrder: 3,
    },
    {
      id: "30000000-0000-4000-8000-000000000004",
      code: "ZONE_ACCESSORY",
      name: "Journey Detail Bar",
      category: ProductCategory.ACCESSORY,
      floor: "2F",
      directionText: "Finish at the detail bar next to the apparel studio.",
      heritageTitle: "Details complete the journey",
      heritageStory: "Use a final detail to connect the colors and functions already selected.",
      displayOrder: 4,
    },
  ];

  const zones = [];
  for (const zone of zoneSeeds) {
    zones.push(
      await prisma.storeZone.upsert({
        where: { storeId_code: { storeId: store.id, code: zone.code } },
        update: { ...zone, storeId: store.id, isActive: true },
        create: { ...zone, storeId: store.id, isActive: true },
      }),
    );
  }

  return { store, zones };
}

async function seedProductsAndInventory(
  storeId: string,
  zones: Array<{ id: string; category: ProductCategory }>,
) {
  const products = [];
  for (const productSeed of productSeeds) {
    const { id, sku, ...data } = productSeed;
    products.push(
      await prisma.product.upsert({
        where: { sku },
        update: { sku, ...data, isActive: true },
        create: { id, sku, ...data, isActive: true },
      }),
    );
  }

  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  for (const [sku, type, name, score] of tagSeeds) {
    const product = productsBySku.get(sku);
    if (!product) {
      throw new Error(`Missing seeded product for tag: ${sku}`);
    }

    await prisma.productTag.upsert({
      where: { productId_type_name: { productId: product.id, type, name } },
      update: { score, source: TagSource.MANUAL, verified: true },
      create: {
        productId: product.id,
        type,
        name,
        score,
        source: TagSource.MANUAL,
        verified: true,
      },
    });
  }

  const zoneByCategory = new Map(zones.map((zone) => [zone.category, zone]));
  for (const product of products) {
    const zone = zoneByCategory.get(product.category);
    if (!zone) {
      throw new Error(`Missing seeded zone for category: ${product.category}`);
    }

    await prisma.inventory.upsert({
      where: { storeId_productId: { storeId, productId: product.id } },
      update: { zoneId: zone.id, quantity: 5, isDisplayAvailable: true },
      create: {
        storeId,
        zoneId: zone.id,
        productId: product.id,
        quantity: 5,
        isDisplayAvailable: true,
      },
    });
  }

  return productsBySku;
}

async function seedOnlineBehaviors(
  stableUserId: string,
  boldUserId: string,
  productsBySku: Map<string, { id: string }>,
) {
  const productId = (sku: string) => {
    const product = productsBySku.get(sku);
    if (!product) {
      throw new Error(`Missing seeded product for behavior: ${sku}`);
    }
    return product.id;
  };

  const behaviorSeeds = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      userId: stableUserId,
      productId: productId("DEMO-BAG-001"),
      eventType: OnlineEventType.REPEAT_VIEW,
      selectedColor: "BLACK",
      selectedOption: "MEDIUM",
      durationSeconds: 96,
      occurredAt: new Date("2026-07-26T10:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      userId: stableUserId,
      productId: productId("DEMO-BAG-002"),
      eventType: OnlineEventType.WISHLIST,
      selectedColor: "BROWN",
      selectedOption: null,
      durationSeconds: 71,
      occurredAt: new Date("2026-07-27T11:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      userId: stableUserId,
      productId: productId("DEMO-APP-001"),
      eventType: OnlineEventType.VIEW,
      selectedColor: "BLACK",
      selectedOption: "M",
      durationSeconds: 54,
      occurredAt: new Date("2026-07-28T12:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000004",
      userId: stableUserId,
      productId: productId("DEMO-ACC-001"),
      eventType: OnlineEventType.CART,
      selectedColor: "BLACK_BROWN",
      selectedOption: null,
      durationSeconds: 43,
      occurredAt: new Date("2026-07-29T13:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000005",
      userId: stableUserId,
      productId: productId("DEMO-BAG-001"),
      eventType: OnlineEventType.PURCHASE,
      selectedColor: "BLACK",
      selectedOption: null,
      durationSeconds: null,
      occurredAt: new Date("2026-07-30T14:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000006",
      userId: boldUserId,
      productId: productId("DEMO-BAG-003"),
      eventType: OnlineEventType.REPEAT_VIEW,
      selectedColor: "COBALT",
      selectedOption: "MINI",
      durationSeconds: 105,
      occurredAt: new Date("2026-07-26T15:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000007",
      userId: boldUserId,
      productId: productId("DEMO-ACC-002"),
      eventType: OnlineEventType.WISHLIST,
      selectedColor: "RED_COBALT",
      selectedOption: null,
      durationSeconds: 87,
      occurredAt: new Date("2026-07-27T16:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000008",
      userId: boldUserId,
      productId: productId("DEMO-APP-003"),
      eventType: OnlineEventType.CART,
      selectedColor: "COBALT",
      selectedOption: "M",
      durationSeconds: 69,
      occurredAt: new Date("2026-07-28T17:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000009",
      userId: boldUserId,
      productId: productId("DEMO-ACC-003"),
      eventType: OnlineEventType.VIEW,
      selectedColor: "SILVER_YELLOW",
      selectedOption: null,
      durationSeconds: 58,
      occurredAt: new Date("2026-07-29T18:00:00.000Z"),
    },
    {
      id: "50000000-0000-4000-8000-000000000010",
      userId: boldUserId,
      productId: productId("DEMO-BAG-003"),
      eventType: OnlineEventType.PURCHASE,
      selectedColor: "COBALT",
      selectedOption: null,
      durationSeconds: null,
      occurredAt: new Date("2026-07-30T19:00:00.000Z"),
    },
  ];

  for (const behavior of behaviorSeeds) {
    await prisma.onlineBehavior.upsert({
      where: { id: behavior.id },
      update: { ...behavior, metadataJson: null },
      create: { ...behavior, metadataJson: null },
    });
  }
}

async function main() {
  const [stableUser, boldUser] = await seedUsers().then((users) => [
    users[0],
    users[1],
  ]);

  if (!stableUser || !boldUser) {
    throw new Error("Customer seed users were not created");
  }

  await seedConsents(stableUser.id, boldUser.id);
  await seedTasteProfiles(stableUser.id, boldUser.id);
  const { store, zones } = await seedStore();
  const productsBySku = await seedProductsAndInventory(store.id, zones);
  await seedOnlineBehaviors(stableUser.id, boldUser.id, productsBySku);

  const counts = {
    users: await prisma.user.count(),
    consents: await prisma.consent.count(),
    tasteProfiles: await prisma.tasteProfile.count(),
    tastePreferences: await prisma.tastePreference.count(),
    stores: await prisma.store.count(),
    zones: await prisma.storeZone.count(),
    products: await prisma.product.count(),
    productTags: await prisma.productTag.count(),
    inventories: await prisma.inventory.count(),
    onlineBehaviors: await prisma.onlineBehavior.count(),
  };

  console.log("Seed completed", counts);
  console.log(
    "Consent demo: Stable Explorer behaviorDataAllowed=true; Bold Mover behaviorDataAllowed=false; marketingAllowed=false for both.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
