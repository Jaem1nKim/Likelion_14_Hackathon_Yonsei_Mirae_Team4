import type {
  ConsentResponse,
  DemoUser,
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
