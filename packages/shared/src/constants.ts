import type {
  InteractionType,
  JourneyStage,
  JourneyStatus,
  JourneyStepStatus,
  PreferenceType,
  ProductCategory,
  ProductTagType,
  RecommendationType,
  ReservationStatus,
  UserRole,
} from "./enums.js";

export const API_BASE_PATH = "/api" as const;
export const DEMO_USER_HEADER_NAME = "X-Demo-User-Id" as const;
export const IDEMPOTENCY_KEY_HEADER_NAME = "Idempotency-Key" as const;

export const USER_ROLE_VALUES = ["CUSTOMER", "STAFF"] as const satisfies readonly UserRole[];
export const PRODUCT_CATEGORY_VALUES = [
  "BAG",
  "APPAREL",
  "SHOES",
  "ACCESSORY",
] as const satisfies readonly ProductCategory[];
export const RESERVATION_STATUS_VALUES = [
  "RESERVED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const satisfies readonly ReservationStatus[];
export const JOURNEY_STATUS_VALUES = [
  "READY",
  "ACTIVE",
  "FINISHED",
  "CANCELLED",
] as const satisfies readonly JourneyStatus[];
export const JOURNEY_STAGE_VALUES = [
  "INTRO",
  "BAG",
  "APPAREL",
  "SHOES",
  "ACCESSORY",
  "RESULT",
] as const satisfies readonly JourneyStage[];
export const JOURNEY_STEP_STATUS_VALUES = [
  "GENERATED",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
] as const satisfies readonly JourneyStepStatus[];
export const INTERACTION_TYPE_VALUES = [
  "VIEWED",
  "COMPARED",
  "SELECTED",
  "REJECTED",
  "DESELECTED",
] as const satisfies readonly InteractionType[];
export const RECOMMENDATION_TYPE_VALUES = [
  "MATCH",
  "COMPARE",
  "CHALLENGE",
] as const satisfies readonly RecommendationType[];
export const PREFERENCE_TYPE_VALUES = [
  "CATEGORY",
  "COLOR",
  "STYLE",
  "MATERIAL",
  "FUNCTION",
] as const satisfies readonly PreferenceType[];
export const PRODUCT_TAG_TYPE_VALUES = [
  "STYLE",
  "FUNCTION",
  "SILHOUETTE",
  "MOOD",
] as const satisfies readonly ProductTagType[];
