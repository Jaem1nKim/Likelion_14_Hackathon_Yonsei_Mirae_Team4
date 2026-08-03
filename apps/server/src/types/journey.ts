import type {
  JourneyStage,
  PreferenceType,
  ProductCategory,
  ProductTagType,
  RecommendationType,
} from "@mcm/shared";

export type JourneyPreferenceInput = {
  type: PreferenceType;
  value: string;
  score: number;
};

export type CandidateTag = {
  type: ProductTagType;
  name: string;
  score: number;
  verified: boolean;
};

export type CandidateProduct = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  color: string;
  material: string | null;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  zoneFloor: string | null;
  directionText: string;
  heritageTitle: string | null;
  heritageStory: string | null;
  zoneDisplayOrder: number;
  tags: CandidateTag[];
};

export type ScoredCandidate = CandidateProduct & {
  ruleScore: number;
  type: RecommendationType;
  reason: string;
  challengeScore: number;
};

export type TasteScoreInput = {
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  preferences: JourneyPreferenceInput[];
};

export type FallbackStepData = {
  stage: Extract<JourneyStage, "BAG" | "APPAREL" | "ACCESSORY">;
  stepNumber: number;
  zoneId: string;
  scenarioTitle: string;
  scenarioText: string;
  heritageTitle: string | null;
  heritageText: string | null;
  canFinishJourney: boolean;
  recommendations: Array<{
    productId: string;
    type: RecommendationType;
    rank: number;
    ruleScore: number;
    reason: string;
  }>;
};

export type SnapshotData = {
  longTermTasteSummary: string;
  todayIntentSummary: string;
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  preferencesJson: string;
  behaviorSummaryJson: string | null;
};
