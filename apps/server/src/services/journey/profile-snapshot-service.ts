import type { JourneyStartPlan } from "../../repositories/journey-repository.js";
import type { SnapshotData } from "../../types/journey.js";

function uniqueSorted(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))]
    .sort((left, right) => left.localeCompare(right, "en"));
}

export function buildProfileSnapshot(plan: JourneyStartPlan): SnapshotData {
  const profile = plan.user.tasteProfile;
  const consent = plan.user.consents[0];
  if (!profile || !consent?.journeyDataAllowed) {
    throw new Error("SNAPSHOT_INPUT_UNAVAILABLE");
  }

  const preferences = [...profile.preferences].sort(
    (left, right) =>
      left.type.localeCompare(right.type, "en") ||
      right.score - left.score ||
      left.value.localeCompare(right.value, "en"),
  );

  const behaviorSummary = consent.behaviorDataAllowed
    ? {
        repeatedViewProductIds: uniqueSorted(
          plan.user.onlineBehaviors
            .filter((event) => event.eventType === "REPEAT_VIEW")
            .map((event) => event.productId),
        ),
        wishlistProductIds: uniqueSorted(
          plan.user.onlineBehaviors
            .filter((event) => event.eventType === "WISHLIST")
            .map((event) => event.productId),
        ),
        cartProductIds: uniqueSorted(
          plan.user.onlineBehaviors
            .filter((event) => event.eventType === "CART")
            .map((event) => event.productId),
        ),
        selectedColors: uniqueSorted(
          plan.user.onlineBehaviors.map((event) => event.selectedColor),
        ),
      }
    : null;

  return {
    longTermTasteSummary: profile.summary,
    todayIntentSummary: `오늘의 Journey 방향: ${plan.reservation.startAnswerLabel}`,
    practicalityScore: profile.practicalityScore,
    expressionScore: profile.expressionScore,
    noveltyScore: profile.noveltyScore,
    preferencesJson: JSON.stringify(preferences),
    behaviorSummaryJson:
      behaviorSummary === null ? null : JSON.stringify(behaviorSummary),
  };
}
