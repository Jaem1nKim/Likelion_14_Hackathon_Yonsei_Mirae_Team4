export type UserRole = "CUSTOMER" | "STAFF";

export type ProductCategory = "BAG" | "APPAREL" | "SHOES" | "ACCESSORY";

export type ReservationStatus =
  | "RESERVED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type JourneyStatus = "READY" | "ACTIVE" | "FINISHED" | "CANCELLED";

export type JourneyStage =
  | "INTRO"
  | "BAG"
  | "APPAREL"
  | "SHOES"
  | "ACCESSORY"
  | "RESULT";

export type JourneyStepStatus =
  | "GENERATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";

export type InteractionType =
  | "VIEWED"
  | "COMPARED"
  | "SELECTED"
  | "REJECTED"
  | "DESELECTED";

export type RecommendationType = "MATCH" | "COMPARE" | "CHALLENGE";

export type PreferenceType =
  | "CATEGORY"
  | "COLOR"
  | "STYLE"
  | "MATERIAL"
  | "FUNCTION";

export type ProductTagType = "STYLE" | "FUNCTION" | "SILHOUETTE" | "MOOD";
