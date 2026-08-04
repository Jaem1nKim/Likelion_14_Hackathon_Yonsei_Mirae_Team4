import type {
  InteractionType,
  JourneyStage,
  PreferenceType,
  ProductCategory,
  ProductTagType,
  RecommendationType,
} from "@mcm/shared";

export const AI_ERROR_CODES = [
  "AI_DISABLED",
  "AI_API_KEY_MISSING",
  "AI_TIMEOUT",
  "AI_PROVIDER_ERROR",
  "AI_RATE_LIMITED",
  "AI_JSON_INVALID",
  "AI_SCHEMA_INVALID",
  "AI_PRODUCT_OUT_OF_SCOPE",
  "AI_ZONE_OUT_OF_SCOPE",
  "AI_REASON_PRODUCT_MISMATCH",
  "AI_SCENE_OUT_OF_SCOPE",
  "FALLBACK_INPUT_INVALID",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];
export type AiPurpose = "JOURNEY_STEP" | "JOURNEY_RESULT";
export type AiExecutionStatus = "SUCCESS" | "FALLBACK";
export type AiReasoningEffort = "none" | "low" | "medium" | "high";
export type SupportedJourneyStage = Extract<
  JourneyStage,
  "BAG" | "APPAREL" | "ACCESSORY"
>;

export type AiConfig = {
  enabled: boolean;
  apiKey: string;
  model: string;
  reasoningEffort: AiReasoningEffort;
  timeoutMs: number;
};

export type AiExecutionData = {
  purpose: AiPurpose;
  status: AiExecutionStatus;
  validated: boolean;
  modelName: string | null;
  promptVersion: string;
  latencyMs: number | null;
  requestSummaryJson: string;
  responseSummaryJson: string | null;
  errorCode: AiErrorCode | null;
};

export type AiGenerationResult<T> = {
  output: T;
  usedFallback: boolean;
  execution: AiExecutionData;
};

export type StructuredResponseRequest = {
  model: string;
  reasoningEffort: AiReasoningEffort;
  timeoutMs: number;
  maxOutputTokens: number;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

export type StructuredResponse = {
  outputText: string;
  modelName: string;
};

export interface AiResponseClient {
  generateStructured(request: StructuredResponseRequest): Promise<StructuredResponse>;
}

export type JourneyProfileSnapshotAiView = {
  longTermTasteSummary: string;
  todayIntentSummary: string;
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  preferences: Array<{
    type: PreferenceType;
    value: string;
    score: number;
  }>;
  behaviorSummary: {
    repeatedViewProductIds: string[];
    wishlistProductIds: string[];
    cartProductIds: string[];
    selectedColors: string[];
  } | null;
};

export type JourneyCandidateProduct = {
  productId: string;
  sku: string;
  name: string;
  category: SupportedJourneyStage;
  color: string;
  material: string | null;
  size: string | null;
  capacity: string | null;
  wearMethod: string | null;
  description: string;
  tags: Array<{
    type: ProductTagType;
    name: string;
    score: number;
  }>;
  storeId: string;
  zoneId: string;
  ruleScore: number;
  recommendationType: RecommendationType;
  ruleReason: string;
  sceneBackgroundKey: string | null;
};

export type JourneyStepAiInput = {
  purpose: "JOURNEY_STEP";
  promptVersion: string;
  journeyId: string;
  profileSnapshot: JourneyProfileSnapshotAiView;
  currentStage: SupportedJourneyStage;
  serverCanFinishJourney: boolean;
  candidateProducts: JourneyCandidateProduct[];
  previousSelectedProducts: Array<{
    stepNumber: number;
    stage: SupportedJourneyStage;
    productId: string;
    name: string;
    color: string;
    tags: Array<{ type: ProductTagType; name: string; score: number }>;
  }>;
  previousRejectedProducts: Array<{
    stage: SupportedJourneyStage;
    productId: string;
    name: string;
  }>;
  allowedZones: Array<{
    zoneId: string;
    storeId: string;
    category: SupportedJourneyStage;
    name: string;
    directionText: string;
    heritageTitle: string | null;
    heritageStory: string | null;
  }>;
};

export type JourneyStepAiOutput = {
  scenarioTitle: string;
  scenarioText: string;
  nextZoneId: string;
  recommendedProductIds: string[];
  challengeProductId: string | null;
  recommendationReasons: Array<{ productId: string; reason: string }>;
  canFinishJourney: boolean;
};

export type JourneyResultAiInput = {
  purpose: "JOURNEY_RESULT";
  promptVersion: string;
  journeyId: string;
  startQuestion: { code: string; answerCode: string; answerLabel: string };
  profileSnapshot: JourneyProfileSnapshotAiView;
  finalSelectedProducts: Array<{
    selectionOrder: number;
    stepNumber: number;
    stage: SupportedJourneyStage;
    productId: string;
    name: string;
    category: Extract<ProductCategory, SupportedJourneyStage>;
    color: string;
    material: string | null;
    size: string | null;
    capacity: string | null;
    wearMethod: string | null;
    description: string;
    tags: Array<{ type: ProductTagType; name: string; score: number }>;
    sceneBackgroundKey: string | null;
  }>;
  decisionHistory: Array<{
    sequence: number;
    stepNumber: number;
    stage: SupportedJourneyStage;
    productId: string;
    type: Extract<InteractionType, "SELECTED" | "REJECTED" | "DESELECTED">;
  }>;
  allowedSceneKeys: string[];
};

export type JourneyResultAiOutput = {
  signatureName: string;
  signatureStory: string;
  finalLookSummary: string;
  productReasons: Array<{ productId: string; reason: string }>;
  staffSummary: string;
  sceneKey: string | null;
};
