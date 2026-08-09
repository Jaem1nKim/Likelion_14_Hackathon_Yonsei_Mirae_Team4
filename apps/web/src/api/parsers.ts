import type {
  ConsentResponse,
  DemoUser,
  PreferenceType,
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
