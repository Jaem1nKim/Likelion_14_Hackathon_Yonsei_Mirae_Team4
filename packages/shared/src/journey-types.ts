import type {
  ProductView,
  StoreView,
  StoreZoneView,
} from "./api-types.js";
import type {
  InteractionType,
  JourneyStage,
  JourneyStatus,
  JourneyStepStatus,
  PreferenceType,
  ProductCategory,
  RecommendationType,
  ReservationStatus,
} from "./enums.js";

export type CreateReservationRequest = {
  storeId: string;
  reservedAt: string;
  startQuestionCode: string;
  startAnswerCode: string;
  startAnswerLabel: string;
};

export type CheckInRequest =
  | { qrToken: string; reservationCode?: never }
  | { qrToken?: never; reservationCode: string };

export type ReservationView = {
  id: string;
  userId: string;
  store: StoreView;
  reservedAt: string;
  startQuestionCode: string;
  startAnswerCode: string;
  startAnswerLabel: string;
  qrToken: string;
  reservationCode: string;
  status: ReservationStatus;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JourneyReservationSummary = Omit<
  ReservationView,
  "qrToken" | "reservationCode"
>;

export type JourneyProfileSnapshotView = {
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
};

export type StepRecommendationView = {
  id: string;
  type: RecommendationType;
  rank: number;
  ruleScore: number;
  reason: string;
  isAiSelected: boolean;
  product: ProductView;
};

export type ProductInteractionView = {
  id: string;
  journeyStepId: string;
  productId: string;
  type: InteractionType;
  sequence: number;
  createdAt: string;
};

export type JourneyStepView = {
  id: string;
  journeyId: string;
  stepNumber: number;
  stage: JourneyStage;
  status: JourneyStepStatus;
  scenarioTitle: string;
  scenarioText: string;
  zone: StoreZoneView;
  heritageTitle: string | null;
  heritageText: string | null;
  selectedProduct: ProductView | null;
  canFinishJourney: boolean;
  usedFallback: boolean;
  recommendations: StepRecommendationView[];
  createdAt: string;
  completedAt: string | null;
};

export type JourneyView = {
  id: string;
  userId: string;
  reservationId: string;
  storeId: string;
  status: JourneyStatus;
  currentStage: JourneyStage;
  currentStepNumber: number;
  startedAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JourneyResultItemView = {
  id: string;
  product: ProductView;
  category: ProductCategory;
  selectionOrder: number;
  recommendationReason: string;
  personaLayerUrl: string | null;
};

export type CustomerJourneyResultView = {
  id: string;
  journeyId: string;
  signatureName: string;
  signatureStory: string;
  finalLookSummary: string;
  personaBaseKey: string | null;
  sceneKey: string | null;
  shareToken: string;
  usedFallback: boolean;
  items: JourneyResultItemView[];
  createdAt: string;
  updatedAt: string;
};

export type JourneyAggregate = {
  journey: JourneyView;
  reservation: JourneyReservationSummary;
  profileSnapshot: JourneyProfileSnapshotView | null;
  currentStep: JourneyStepView | null;
  completedSteps: JourneyStepView[];
  interactions: ProductInteractionView[];
  canFinishJourney: boolean;
  result: CustomerJourneyResultView | null;
};
