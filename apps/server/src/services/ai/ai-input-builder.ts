import { PREFERENCE_TYPE_VALUES } from "@mcm/shared";
import { z } from "zod";

import type { SnapshotData, ScoredCandidate } from "../../types/journey.js";
import type {
  JourneyCandidateProduct,
  JourneyProfileSnapshotAiView,
  JourneyStepAiInput,
} from "./ai-types.js";

const preferencesSchema = z.array(
  z.strictObject({
    type: z.enum(PREFERENCE_TYPE_VALUES),
    value: z.string().trim().min(1),
    score: z.number().int().min(0).max(100),
  }),
);

const behaviorSummarySchema = z.strictObject({
  repeatedViewProductIds: z.array(z.string()),
  wishlistProductIds: z.array(z.string()),
  cartProductIds: z.array(z.string()),
  selectedColors: z.array(z.string()),
});

function parseJson(value: string): unknown {
  return JSON.parse(value);
}

export function buildSnapshotAiView(
  snapshot: SnapshotData,
): JourneyProfileSnapshotAiView {
  const preferences = preferencesSchema.parse(parseJson(snapshot.preferencesJson));
  const behaviorSummary =
    snapshot.behaviorSummaryJson === null
      ? null
      : behaviorSummarySchema.parse(parseJson(snapshot.behaviorSummaryJson));
  return {
    longTermTasteSummary: snapshot.longTermTasteSummary,
    todayIntentSummary: snapshot.todayIntentSummary,
    practicalityScore: snapshot.practicalityScore,
    expressionScore: snapshot.expressionScore,
    noveltyScore: snapshot.noveltyScore,
    preferences,
    behaviorSummary,
  };
}

export function scopeCandidatesToFallbackZone(
  candidates: ScoredCandidate[],
  zoneId: string,
) {
  return candidates.filter((candidate) => candidate.zoneId === zoneId);
}

export function buildCandidateAiViews(
  candidates: ScoredCandidate[],
  storeId: string,
): JourneyCandidateProduct[] {
  return candidates.map((candidate) => ({
    productId: candidate.id,
    sku: candidate.sku,
    name: candidate.name,
    category: candidate.category as JourneyCandidateProduct["category"],
    color: candidate.color,
    material: candidate.material,
    size: candidate.size,
    capacity: candidate.capacity,
    wearMethod: candidate.wearMethod,
    description: candidate.description,
    tags: candidate.tags
      .filter((tag) => tag.verified)
      .map((tag) => ({ type: tag.type, name: tag.name, score: tag.score })),
    storeId,
    zoneId: candidate.zoneId,
    ruleScore: candidate.ruleScore,
    recommendationType: candidate.type,
    ruleReason: candidate.reason,
    sceneBackgroundKey: candidate.sceneBackgroundKey,
  }));
}

export function buildAllowedZones(
  candidates: ScoredCandidate[],
  storeId: string,
): JourneyStepAiInput["allowedZones"] {
  const zones = new Map<string, JourneyStepAiInput["allowedZones"][number]>();
  for (const candidate of candidates) {
    zones.set(candidate.zoneId, {
      zoneId: candidate.zoneId,
      storeId,
      category: candidate.category as JourneyStepAiInput["currentStage"],
      name: candidate.zoneName,
      directionText: candidate.directionText,
      heritageTitle: candidate.heritageTitle,
      heritageStory: candidate.heritageStory,
    });
  }
  return [...zones.values()].sort((left, right) => left.zoneId.localeCompare(right.zoneId, "en"));
}
