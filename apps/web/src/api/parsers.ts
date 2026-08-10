import type {
  ConsentResponse,
  DemoUser,
  JourneyAggregate,
  JourneyStage,
  JourneyStatus,
  JourneyStepStatus,
  InteractionType,
  PreferenceType,
  ProductCategory,
  ProductTagType,
  ProductView,
  RecommendationType,
  ReservationStatus,
  ReservationView,
  StoreView,
  TastePreferenceView,
  TasteProfileView,
  UserProfileResponse,
  UserRole,
} from "@mcm/shared";

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function nullableString(value: unknown, label: string) {
  if (value === null) {
    return null;
  }
  return string(value, label);
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function number(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

function array<T>(
  value: unknown,
  label: string,
  parser: (item: unknown) => T,
) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map(parser);
}

function userRole(value: unknown): UserRole {
  if (value !== "CUSTOMER" && value !== "STAFF") {
    throw new Error("role is invalid");
  }
  return value;
}

function preferenceType(value: unknown): PreferenceType {
  const values: PreferenceType[] = [
    "CATEGORY",
    "COLOR",
    "STYLE",
    "MATERIAL",
    "FUNCTION",
  ];
  if (typeof value !== "string" || !values.includes(value as PreferenceType)) {
    throw new Error("preference type is invalid");
  }
  return value as PreferenceType;
}

function reservationStatus(value: unknown): ReservationStatus {
  const values: ReservationStatus[] = [
    "RESERVED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
  ];
  if (typeof value !== "string" || !values.includes(value as ReservationStatus)) {
    throw new Error("reservation status is invalid");
  }
  return value as ReservationStatus;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${label} is invalid`);
  }
  return value as T;
}

function journeyStatus(value: unknown) {
  return oneOf<JourneyStatus>(value, ["READY", "ACTIVE", "FINISHED", "CANCELLED"], "journey.status");
}

function journeyStage(value: unknown) {
  return oneOf<JourneyStage>(value, ["INTRO", "BAG", "APPAREL", "SHOES", "ACCESSORY", "RESULT"], "journey.stage");
}

function journeyStepStatus(value: unknown) {
  return oneOf<JourneyStepStatus>(value, ["GENERATED", "IN_PROGRESS", "COMPLETED", "SKIPPED"], "step.status");
}

function productCategory(value: unknown) {
  return oneOf<ProductCategory>(value, ["BAG", "APPAREL", "SHOES", "ACCESSORY"], "product.category");
}

function productTagType(value: unknown) {
  return oneOf<ProductTagType>(value, ["STYLE", "FUNCTION", "SILHOUETTE", "MOOD"], "tag.type");
}

function recommendationType(value: unknown) {
  return oneOf<RecommendationType>(value, ["MATCH", "COMPARE", "CHALLENGE"], "recommendation.type");
}

function interactionType(value: unknown) {
  return oneOf<InteractionType>(value, ["VIEWED", "COMPARED", "SELECTED", "REJECTED", "DESELECTED"], "interaction.type");
}

export function parseDemoUser(value: unknown): DemoUser {
  const source = record(value, "user");
  return {
    id: string(source.id, "user.id"),
    email: string(source.email, "user.email"),
    name: string(source.name, "user.name"),
    role: userRole(source.role),
    profileType: nullableString(source.profileType, "user.profileType"),
    avatarUrl: nullableString(source.avatarUrl, "user.avatarUrl"),
  };
}

export function parseDemoUsers(value: unknown) {
  return array(value, "users", parseDemoUser);
}

function parsePreference(value: unknown): TastePreferenceView {
  const source = record(value, "preference");
  return {
    type: preferenceType(source.type),
    value: string(source.value, "preference.value"),
    score: number(source.score, "preference.score"),
    source: string(source.source, "preference.source"),
  };
}

function parseTasteProfile(value: unknown): TasteProfileView {
  const source = record(value, "tasteProfile");
  return {
    id: string(source.id, "tasteProfile.id"),
    userId: string(source.userId, "tasteProfile.userId"),
    summary: string(source.summary, "tasteProfile.summary"),
    practicalityScore: number(
      source.practicalityScore,
      "tasteProfile.practicalityScore",
    ),
    expressionScore: number(
      source.expressionScore,
      "tasteProfile.expressionScore",
    ),
    noveltyScore: number(source.noveltyScore, "tasteProfile.noveltyScore"),
    confidenceScore: number(
      source.confidenceScore,
      "tasteProfile.confidenceScore",
    ),
    calculatedAt: string(source.calculatedAt, "tasteProfile.calculatedAt"),
    updatedAt: string(source.updatedAt, "tasteProfile.updatedAt"),
    preferences: array(
      source.preferences,
      "tasteProfile.preferences",
      parsePreference,
    ),
  };
}

export function parseUserProfile(value: unknown): UserProfileResponse {
  const source = record(value, "profile");
  return {
    user: parseDemoUser(source.user),
    tasteProfile: parseTasteProfile(source.tasteProfile),
  };
}

export function parseConsentResponse(value: unknown): ConsentResponse {
  const source = record(value, "consentResponse");
  if (source.currentConsent === null) {
    return { currentConsent: null };
  }

  const consent = record(source.currentConsent, "consent");
  const marketingAllowed = boolean(
    consent.marketingAllowed,
    "consent.marketingAllowed",
  );
  if (marketingAllowed) {
    throw new Error("marketingAllowed must be false");
  }
  if (consent.withdrawnAt !== null) {
    throw new Error("withdrawnAt must be null");
  }

  return {
    currentConsent: {
      id: string(consent.id, "consent.id"),
      userId: string(consent.userId, "consent.userId"),
      consentVersion: string(consent.consentVersion, "consent.consentVersion"),
      behaviorDataAllowed: boolean(
        consent.behaviorDataAllowed,
        "consent.behaviorDataAllowed",
      ),
      journeyDataAllowed: boolean(
        consent.journeyDataAllowed,
        "consent.journeyDataAllowed",
      ),
      marketingAllowed: false,
      agreedAt: string(consent.agreedAt, "consent.agreedAt"),
      withdrawnAt: null,
    },
  };
}

export function parseStore(value: unknown): StoreView {
  const source = record(value, "store");
  return {
    id: string(source.id, "store.id"),
    code: string(source.code, "store.code"),
    name: string(source.name, "store.name"),
    location: string(source.location, "store.location"),
    description: nullableString(source.description, "store.description"),
    imageUrl: nullableString(source.imageUrl, "store.imageUrl"),
    isJourneyEnabled: boolean(
      source.isJourneyEnabled,
      "store.isJourneyEnabled",
    ),
  };
}

export function parseStores(value: unknown) {
  return array(value, "stores", parseStore);
}

export function parseReservation(value: unknown): ReservationView {
  const source = record(value, "reservation");
  return {
    id: string(source.id, "reservation.id"),
    userId: string(source.userId, "reservation.userId"),
    store: parseStore(source.store),
    reservedAt: string(source.reservedAt, "reservation.reservedAt"),
    startQuestionCode: string(
      source.startQuestionCode,
      "reservation.startQuestionCode",
    ),
    startAnswerCode: string(
      source.startAnswerCode,
      "reservation.startAnswerCode",
    ),
    startAnswerLabel: string(
      source.startAnswerLabel,
      "reservation.startAnswerLabel",
    ),
    qrToken: string(source.qrToken, "reservation.qrToken"),
    reservationCode: string(
      source.reservationCode,
      "reservation.reservationCode",
    ),
    status: reservationStatus(source.status),
    checkedInAt: nullableString(source.checkedInAt, "reservation.checkedInAt"),
    completedAt: nullableString(source.completedAt, "reservation.completedAt"),
    cancelledAt: nullableString(source.cancelledAt, "reservation.cancelledAt"),
    createdAt: string(source.createdAt, "reservation.createdAt"),
    updatedAt: string(source.updatedAt, "reservation.updatedAt"),
  };
}

function parseStoreZone(value: unknown) {
  const source = record(value, "zone");
  return {
    id: string(source.id, "zone.id"),
    storeId: string(source.storeId, "zone.storeId"),
    code: string(source.code, "zone.code"),
    name: string(source.name, "zone.name"),
    category: productCategory(source.category),
    floor: nullableString(source.floor, "zone.floor"),
    directionText: string(source.directionText, "zone.directionText"),
    heritageTitle: nullableString(source.heritageTitle, "zone.heritageTitle"),
    heritageStory: nullableString(source.heritageStory, "zone.heritageStory"),
    displayOrder: number(source.displayOrder, "zone.displayOrder"),
  };
}

function parseProduct(value: unknown): ProductView {
  const source = record(value, "product");
  return {
    id: string(source.id, "product.id"),
    sku: string(source.sku, "product.sku"),
    name: string(source.name, "product.name"),
    category: productCategory(source.category),
    color: string(source.color, "product.color"),
    material: nullableString(source.material, "product.material"),
    priceKrw: number(source.priceKrw, "product.priceKrw"),
    size: nullableString(source.size, "product.size"),
    capacity: nullableString(source.capacity, "product.capacity"),
    wearMethod: nullableString(source.wearMethod, "product.wearMethod"),
    description: string(source.description, "product.description"),
    imageUrl: string(source.imageUrl, "product.imageUrl"),
    personaLayerUrl: nullableString(source.personaLayerUrl, "product.personaLayerUrl"),
    sceneBackgroundKey: nullableString(source.sceneBackgroundKey, "product.sceneBackgroundKey"),
    tags: array(source.tags, "product.tags", (item) => {
      const tag = record(item, "tag");
      return {
        type: productTagType(tag.type),
        name: string(tag.name, "tag.name"),
        score: number(tag.score, "tag.score"),
        verified: boolean(tag.verified, "tag.verified"),
      };
    }),
  };
}

function parseJourneyReservation(value: unknown) {
  const source = record(value, "journey.reservation");
  return {
    id: string(source.id, "reservation.id"),
    userId: string(source.userId, "reservation.userId"),
    store: parseStore(source.store),
    reservedAt: string(source.reservedAt, "reservation.reservedAt"),
    startQuestionCode: string(source.startQuestionCode, "reservation.startQuestionCode"),
    startAnswerCode: string(source.startAnswerCode, "reservation.startAnswerCode"),
    startAnswerLabel: string(source.startAnswerLabel, "reservation.startAnswerLabel"),
    status: reservationStatus(source.status),
    checkedInAt: nullableString(source.checkedInAt, "reservation.checkedInAt"),
    completedAt: nullableString(source.completedAt, "reservation.completedAt"),
    cancelledAt: nullableString(source.cancelledAt, "reservation.cancelledAt"),
    createdAt: string(source.createdAt, "reservation.createdAt"),
    updatedAt: string(source.updatedAt, "reservation.updatedAt"),
  };
}

function parseJourneyStep(value: unknown) {
  const source = record(value, "step");
  return {
    id: string(source.id, "step.id"),
    journeyId: string(source.journeyId, "step.journeyId"),
    stepNumber: number(source.stepNumber, "step.stepNumber"),
    stage: journeyStage(source.stage),
    status: journeyStepStatus(source.status),
    scenarioTitle: string(source.scenarioTitle, "step.scenarioTitle"),
    scenarioText: string(source.scenarioText, "step.scenarioText"),
    zone: parseStoreZone(source.zone),
    heritageTitle: nullableString(source.heritageTitle, "step.heritageTitle"),
    heritageText: nullableString(source.heritageText, "step.heritageText"),
    selectedProduct: source.selectedProduct === null ? null : parseProduct(source.selectedProduct),
    canFinishJourney: boolean(source.canFinishJourney, "step.canFinishJourney"),
    usedFallback: boolean(source.usedFallback, "step.usedFallback"),
    recommendations: array(source.recommendations, "step.recommendations", (item) => {
      const recommendation = record(item, "recommendation");
      return {
        id: string(recommendation.id, "recommendation.id"),
        type: recommendationType(recommendation.type),
        rank: number(recommendation.rank, "recommendation.rank"),
        ruleScore: number(recommendation.ruleScore, "recommendation.ruleScore"),
        reason: string(recommendation.reason, "recommendation.reason"),
        isAiSelected: boolean(recommendation.isAiSelected, "recommendation.isAiSelected"),
        product: parseProduct(recommendation.product),
      };
    }),
    createdAt: string(source.createdAt, "step.createdAt"),
    completedAt: nullableString(source.completedAt, "step.completedAt"),
  };
}

export function parseJourneyAggregate(value: unknown): JourneyAggregate {
  const source = record(value, "journeyAggregate");
  const journey = record(source.journey, "journey");
  const profileSnapshot = source.profileSnapshot === null ? null : record(source.profileSnapshot, "profileSnapshot");
  const result = source.result === null ? null : record(source.result, "result");

  return {
    journey: {
      id: string(journey.id, "journey.id"),
      userId: string(journey.userId, "journey.userId"),
      reservationId: string(journey.reservationId, "journey.reservationId"),
      storeId: string(journey.storeId, "journey.storeId"),
      status: journeyStatus(journey.status),
      currentStage: journeyStage(journey.currentStage),
      currentStepNumber: number(journey.currentStepNumber, "journey.currentStepNumber"),
      startedAt: nullableString(journey.startedAt, "journey.startedAt"),
      finishedAt: nullableString(journey.finishedAt, "journey.finishedAt"),
      cancelledAt: nullableString(journey.cancelledAt, "journey.cancelledAt"),
      createdAt: string(journey.createdAt, "journey.createdAt"),
      updatedAt: string(journey.updatedAt, "journey.updatedAt"),
    },
    reservation: parseJourneyReservation(source.reservation),
    profileSnapshot: profileSnapshot === null ? null : {
      longTermTasteSummary: string(profileSnapshot.longTermTasteSummary, "profileSnapshot.longTermTasteSummary"),
      todayIntentSummary: string(profileSnapshot.todayIntentSummary, "profileSnapshot.todayIntentSummary"),
      practicalityScore: number(profileSnapshot.practicalityScore, "profileSnapshot.practicalityScore"),
      expressionScore: number(profileSnapshot.expressionScore, "profileSnapshot.expressionScore"),
      noveltyScore: number(profileSnapshot.noveltyScore, "profileSnapshot.noveltyScore"),
      preferences: array(profileSnapshot.preferences, "profileSnapshot.preferences", (item) => {
        const preference = record(item, "snapshot.preference");
        return {
          type: preferenceType(preference.type),
          value: string(preference.value, "snapshot.preference.value"),
          score: number(preference.score, "snapshot.preference.score"),
        };
      }),
    },
    currentStep: source.currentStep === null ? null : parseJourneyStep(source.currentStep),
    completedSteps: array(source.completedSteps, "completedSteps", parseJourneyStep),
    interactions: array(source.interactions, "interactions", (item) => {
      const interaction = record(item, "interaction");
      return {
        id: string(interaction.id, "interaction.id"),
        journeyStepId: string(interaction.journeyStepId, "interaction.journeyStepId"),
        productId: string(interaction.productId, "interaction.productId"),
        type: interactionType(interaction.type),
        sequence: number(interaction.sequence, "interaction.sequence"),
        createdAt: string(interaction.createdAt, "interaction.createdAt"),
      };
    }),
    canFinishJourney: boolean(source.canFinishJourney, "canFinishJourney"),
    result: result === null ? null : {
      id: string(result.id, "result.id"),
      journeyId: string(result.journeyId, "result.journeyId"),
      signatureName: string(result.signatureName, "result.signatureName"),
      signatureStory: string(result.signatureStory, "result.signatureStory"),
      finalLookSummary: string(result.finalLookSummary, "result.finalLookSummary"),
      personaBaseKey: nullableString(result.personaBaseKey, "result.personaBaseKey"),
      sceneKey: nullableString(result.sceneKey, "result.sceneKey"),
      shareToken: string(result.shareToken, "result.shareToken"),
      usedFallback: boolean(result.usedFallback, "result.usedFallback"),
      items: array(result.items, "result.items", (item) => {
        const resultItem = record(item, "result.item");
        return {
          id: string(resultItem.id, "result.item.id"),
          product: parseProduct(resultItem.product),
          category: productCategory(resultItem.category),
          selectionOrder: number(resultItem.selectionOrder, "result.item.selectionOrder"),
          recommendationReason: string(resultItem.recommendationReason, "result.item.recommendationReason"),
          personaLayerUrl: nullableString(resultItem.personaLayerUrl, "result.item.personaLayerUrl"),
        };
      }),
      createdAt: string(result.createdAt, "result.createdAt"),
      updatedAt: string(result.updatedAt, "result.updatedAt"),
    },
  };
}
