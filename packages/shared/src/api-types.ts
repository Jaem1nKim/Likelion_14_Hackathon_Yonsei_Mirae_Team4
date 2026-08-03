import type {
  PreferenceType,
  ProductCategory,
  ProductTagType,
  UserRole,
} from "./enums.js";

export type ApiSuccess<T> = {
  data: T;
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "DEMO_USER_REQUIRED"
  | "DEMO_USER_NOT_FOUND"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "CONSENT_REQUIRED"
  | "INVALID_STATE"
  | "RESOURCE_CONFLICT"
  | "STALE_JOURNEY_STEP"
  | "PRODUCT_NOT_ELIGIBLE"
  | "NO_ELIGIBLE_CANDIDATES"
  | "MINIMUM_SELECTION_REQUIRED"
  | "RESULT_NOT_READY"
  | "DEV_ENDPOINT_DISABLED"
  | "INTERNAL_ERROR";

export type ApiErrorDetail = {
  path: string;
  reason: string;
};

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    details: ApiErrorDetail[] | null;
  };
};

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileType: string | null;
  avatarUrl: string | null;
};

export type DemoLoginRequest = {
  userId: string;
};

export type TastePreferenceView = {
  type: PreferenceType;
  value: string;
  score: number;
  source: string;
};

export type TasteProfileView = {
  id: string;
  userId: string;
  summary: string;
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  confidenceScore: number;
  calculatedAt: string;
  updatedAt: string;
  preferences: TastePreferenceView[];
};

export type UserProfileResponse = {
  user: DemoUser;
  tasteProfile: TasteProfileView;
};

export type ConsentView = {
  id: string;
  userId: string;
  consentVersion: string;
  behaviorDataAllowed: boolean;
  journeyDataAllowed: boolean;
  marketingAllowed: false;
  agreedAt: string;
  withdrawnAt: null;
};

export type ConsentResponse = {
  currentConsent: ConsentView | null;
};

export type PutConsentRequest = {
  behaviorDataAllowed: boolean;
  journeyDataAllowed: boolean;
};

export type StoreView = {
  id: string;
  code: string;
  name: string;
  location: string;
  description: string | null;
  imageUrl: string | null;
  isJourneyEnabled: boolean;
};

export type StoreZoneView = {
  id: string;
  storeId: string;
  code: string;
  name: string;
  category: ProductCategory;
  floor: string | null;
  directionText: string;
  heritageTitle: string | null;
  heritageStory: string | null;
  displayOrder: number;
};

export type ProductTagView = {
  type: ProductTagType;
  name: string;
  score: number;
  verified: boolean;
};

export type ProductView = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  color: string;
  material: string | null;
  priceKrw: number;
  size: string | null;
  capacity: string | null;
  wearMethod: string | null;
  description: string;
  imageUrl: string;
  personaLayerUrl: string | null;
  sceneBackgroundKey: string | null;
  tags: ProductTagView[];
};

export type StoreProductView = ProductView & {
  inventory: {
    storeId: string;
    zoneId: string;
    quantity: number;
    isDisplayAvailable: boolean;
  };
};
