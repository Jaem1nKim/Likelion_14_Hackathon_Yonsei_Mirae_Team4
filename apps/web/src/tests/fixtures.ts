import type {
  ConsentResponse,
  DemoUser,
  JourneyAggregate,
  JourneyStage,
  ReservationView,
  StoreView,
  UserProfileResponse,
} from "@mcm/shared";

export const customer: DemoUser = {
  id: "user-stable",
  email: "stable@example.demo",
  name: "Stable Explorer",
  role: "CUSTOMER",
  profileType: "Classic Urban",
  avatarUrl: null,
};

export const secondCustomer: DemoUser = {
  id: "user-bold",
  email: "bold@example.demo",
  name: "Bold Mover",
  role: "CUSTOMER",
  profileType: "Bold Expression",
  avatarUrl: null,
};

export const staff: DemoUser = {
  id: "user-staff",
  email: "staff@example.demo",
  name: "Demo Staff",
  role: "STAFF",
  profileType: null,
  avatarUrl: null,
};

export const consentAllowed: ConsentResponse = {
  currentConsent: {
    id: "consent-1",
    userId: customer.id,
    consentVersion: "mvp-v1",
    behaviorDataAllowed: true,
    journeyDataAllowed: true,
    marketingAllowed: false,
    agreedAt: "2026-08-04T01:00:00.000Z",
    withdrawnAt: null,
  },
};

export const consentMissing: ConsentResponse = { currentConsent: null };

export const profile: UserProfileResponse = {
  user: customer,
  tasteProfile: {
    id: "taste-1",
    userId: customer.id,
    summary: "실용적인 구조와 클래식한 컬러를 선호합니다.",
    practicalityScore: 88,
    expressionScore: 56,
    noveltyScore: 32,
    confidenceScore: 91,
    calculatedAt: "2026-08-03T01:00:00.000Z",
    updatedAt: "2026-08-03T01:00:00.000Z",
    preferences: [
      { type: "CATEGORY", value: "BAG", score: 92, source: "SEED" },
      { type: "COLOR", value: "BLACK", score: 90, source: "SEED" },
      { type: "STYLE", value: "CLASSIC", score: 86, source: "SEED" },
      { type: "MATERIAL", value: "LEATHER", score: 72, source: "SEED" },
      { type: "FUNCTION", value: "PRACTICAL", score: 89, source: "SEED" },
    ],
  },
};

export const store: StoreView = {
  id: "store-demo",
  code: "FLAGSHIP-DEMO",
  name: "MCM Journey Flagship Demo Store",
  location: "Seoul Demo District",
  description: "Journey 전용 시연 매장",
  imageUrl: null,
  isJourneyEnabled: true,
};

export const reservation: ReservationView = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  userId: customer.id,
  store,
  reservedAt: "2099-08-05T05:00:00.000Z",
  startQuestionCode: "TODAY_INTENT",
  startAnswerCode: "LIGHT_EXPLORATION",
  startAnswerLabel: "새로운 스타일을 가볍게 시도하고 싶어요",
  qrToken: "qr-token-abcdefghijklmnopqrstuvwxyz-1234567890",
  reservationCode: "ABCD2345",
  status: "RESERVED",
  checkedInAt: null,
  completedAt: null,
  cancelledAt: null,
  createdAt: "2026-08-04T01:00:00.000Z",
  updatedAt: "2026-08-04T01:00:00.000Z",
};

export function success(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function apiFailure(
  status: number,
  code: string,
  message: string,
) {
  return new Response(
    JSON.stringify({ error: { code, message, details: null } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const products = [
  { id: "product-bag-1", sku: "DEMO-BAG-01", name: "Demo Visetos Carry Bag", category: "BAG" as const, color: "BLACK" },
  { id: "product-bag-2", sku: "DEMO-BAG-02", name: "Demo Structured Tote", category: "BAG" as const, color: "BROWN" },
  { id: "product-bag-3", sku: "DEMO-BAG-03", name: "Demo Mini Crossbody", category: "BAG" as const, color: "WHITE" },
  { id: "product-apparel-1", sku: "DEMO-APP-01", name: "Demo Urban Jacket", category: "APPAREL" as const, color: "BLACK" },
  { id: "product-accessory-1", sku: "DEMO-ACC-01", name: "Demo Heritage Scarf", category: "ACCESSORY" as const, color: "GOLD" },
].map((item) => ({
  ...item,
  material: "Demo leather",
  priceKrw: 100000,
  size: "M",
  capacity: null,
  wearMethod: null,
  description: `${item.name} description`,
  imageUrl: `/images/${item.id}.jpg`,
  personaLayerUrl: null,
  sceneBackgroundKey: "demo-scene",
  tags: [{ type: "STYLE" as const, name: "CLASSIC", score: 90, verified: true }],
}));

function stageProduct(stage: JourneyStage) {
  if (stage === "APPAREL") return products[3]!;
  if (stage === "ACCESSORY") return products[4]!;
  return products[0]!;
}

function step(stage: "BAG" | "APPAREL" | "ACCESSORY", stepNumber: number, selected = false) {
  const available = stage === "BAG" ? products.slice(0, 3) : [stageProduct(stage)];
  return {
    id: `step-${stepNumber}`,
    journeyId: "journey-1",
    stepNumber,
    stage,
    status: "IN_PROGRESS" as const,
    scenarioTitle: `${stage} 시나리오`,
    scenarioText: `${stage} 추천을 직접 비교해보세요.`,
    zone: {
      id: `zone-${stage.toLowerCase()}`,
      storeId: store.id,
      code: `${stage}-ZONE`,
      name: `${stage} ZONE`,
      category: stage,
      floor: "1F",
      directionText: `${stage} 전시 구역으로 이동해 주세요.`,
      heritageTitle: `${stage} Heritage`,
      heritageStory: `${stage} heritage story from database.`,
      displayOrder: stepNumber,
    },
    heritageTitle: `${stage} Heritage`,
    heritageText: `${stage} heritage story from database.`,
    selectedProduct: selected ? available[0]! : null,
    canFinishJourney: stage !== "BAG",
    usedFallback: true,
    recommendations: available.map((product, index) => ({
      id: `recommendation-${stepNumber}-${index + 1}`,
      type: (["MATCH", "COMPARE", "CHALLENGE"] as const)[index] ?? "MATCH",
      rank: index + 1,
      ruleScore: 90 - index * 10,
      reason: `${product.name} 서버 추천 이유`,
      isAiSelected: false,
      product,
    })),
    createdAt: "2026-08-04T02:00:00.000Z",
    completedAt: null,
  };
}

export function journeyAggregate(
  stage: "READY" | "BAG" | "APPAREL" | "ACCESSORY" | "FINISHED",
  selected = false,
): JourneyAggregate {
  const currentStage = stage === "READY" ? "INTRO" : stage === "FINISHED" ? "RESULT" : stage;
  const currentStepNumber = stage === "READY" ? 0 : stage === "BAG" ? 1 : stage === "APPAREL" ? 2 : stage === "ACCESSORY" ? 3 : 3;
  const completed = [] as JourneyAggregate["completedSteps"];
  if (["APPAREL", "ACCESSORY", "FINISHED"].includes(stage)) completed.push({ ...step("BAG", 1, true), status: "COMPLETED", completedAt: "2026-08-04T02:10:00.000Z" });
  if (["ACCESSORY", "FINISHED"].includes(stage)) completed.push({ ...step("APPAREL", 2, true), status: "COMPLETED", completedAt: "2026-08-04T02:20:00.000Z" });
  if (stage === "FINISHED") completed.push({ ...step("ACCESSORY", 3, true), status: "COMPLETED", completedAt: "2026-08-04T02:30:00.000Z" });
  const currentStep = stage === "BAG" ? step("BAG", 1, selected) : stage === "APPAREL" ? step("APPAREL", 2, selected) : stage === "ACCESSORY" ? step("ACCESSORY", 3, selected) : null;
  const canFinish = stage === "APPAREL" ? selected : stage === "ACCESSORY" ? true : stage === "FINISHED";
  return {
    journey: {
      id: "journey-1",
      userId: customer.id,
      reservationId: reservation.id,
      storeId: store.id,
      status: stage === "READY" ? "READY" : stage === "FINISHED" ? "FINISHED" : "ACTIVE",
      currentStage,
      currentStepNumber,
      startedAt: stage === "READY" ? null : "2026-08-04T02:00:00.000Z",
      finishedAt: stage === "FINISHED" ? "2026-08-04T02:30:00.000Z" : null,
      cancelledAt: null,
      createdAt: "2026-08-04T01:50:00.000Z",
      updatedAt: "2026-08-04T02:30:00.000Z",
    },
    reservation: {
      id: reservation.id,
      userId: reservation.userId,
      store: reservation.store,
      reservedAt: reservation.reservedAt,
      startQuestionCode: reservation.startQuestionCode,
      startAnswerCode: reservation.startAnswerCode,
      startAnswerLabel: reservation.startAnswerLabel,
      status: stage === "FINISHED" ? "COMPLETED" : "CHECKED_IN",
      checkedInAt: "2026-08-04T01:50:00.000Z",
      completedAt: stage === "FINISHED" ? "2026-08-04T02:30:00.000Z" : null,
      cancelledAt: null,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    },
    profileSnapshot: stage === "READY" ? null : {
      longTermTasteSummary: "클래식한 취향",
      todayIntentSummary: "오늘의 Journey 방향",
      practicalityScore: 88,
      expressionScore: 56,
      noveltyScore: 32,
      preferences: [{ type: "STYLE", value: "CLASSIC", score: 90 }],
    },
    currentStep,
    completedSteps: completed,
    interactions: selected && currentStep ? [{ id: "interaction-selected", journeyStepId: currentStep.id, productId: currentStep.selectedProduct!.id, type: "SELECTED", sequence: 1, createdAt: "2026-08-04T02:05:00.000Z" }] : [],
    canFinishJourney: canFinish,
    result: stage === "FINISHED" ? {
      id: "result-1",
      journeyId: "journey-1",
      signatureName: "MCM Classic Journey",
      signatureStory: "Journey signature story",
      finalLookSummary: "Final look summary",
      personaBaseKey: null,
      sceneKey: "demo-scene",
      shareToken: "share-token-demo",
      usedFallback: true,
      items: completed.map((item, index) => ({
        id: `result-item-${index + 1}`,
        product: item.selectedProduct!,
        category: item.stage as "BAG" | "APPAREL" | "ACCESSORY",
        selectionOrder: index + 1,
        recommendationReason: "result reason",
        personaLayerUrl: null,
      })),
      createdAt: "2026-08-04T02:30:00.000Z",
      updatedAt: "2026-08-04T02:30:00.000Z",
    } : null,
  };
}
