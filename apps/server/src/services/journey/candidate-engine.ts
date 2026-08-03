import type { PreferenceType, RecommendationType } from "@mcm/shared";

import {
  RECOMMENDATION_TYPE_ORDER,
  RULE_SCORE_WEIGHTS,
} from "../../constants/journey.js";
import type {
  CandidateProduct,
  JourneyPreferenceInput,
  ScoredCandidate,
  TasteScoreInput,
} from "../../types/journey.js";

function normalize(value: string | null) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function valuesMatch(left: string | null, right: string | null) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  const leftTokens = new Set(normalizedLeft.split("_"));
  const rightTokens = normalizedRight.split("_");
  return rightTokens.some((token) => token.length > 2 && leftTokens.has(token));
}

function maxPreferenceScore(
  preferences: JourneyPreferenceInput[],
  type: PreferenceType,
  values: Array<string | null>,
) {
  return preferences
    .filter(
      (preference) =>
        preference.type === type &&
        values.some((value) => valuesMatch(preference.value, value)),
    )
    .reduce((maximum, preference) => Math.max(maximum, preference.score), 0);
}

function verifiedTags(candidate: CandidateProduct) {
  return candidate.tags.filter((tag) => tag.verified);
}

function roundedContribution(score: number, weight: number) {
  return (score / 100) * weight;
}

function candidateSignals(candidate: CandidateProduct, input: TasteScoreInput) {
  const tags = verifiedTags(candidate);
  const styleTags = tags.filter((tag) => tag.type === "STYLE" || tag.type === "MOOD");
  const functionTags = tags.filter((tag) => tag.type === "FUNCTION");
  const categoryMatch = maxPreferenceScore(input.preferences, "CATEGORY", [candidate.category]);
  const colorMatch = maxPreferenceScore(input.preferences, "COLOR", [candidate.color]);
  const materialMatch = maxPreferenceScore(input.preferences, "MATERIAL", [candidate.material]);
  const styleMatch = maxPreferenceScore(
    input.preferences,
    "STYLE",
    styleTags.map((tag) => tag.name),
  );
  const functionMatch = maxPreferenceScore(
    input.preferences,
    "FUNCTION",
    functionTags.map((tag) => tag.name),
  );
  const functionIntensity = functionTags.reduce(
    (maximum, tag) => Math.max(maximum, tag.score),
    0,
  );
  const expressionIntensity = styleTags.reduce(
    (maximum, tag) => Math.max(maximum, tag.score),
    0,
  );
  const unmatchedStyleIntensity = styleTags
    .filter(
      (tag) =>
        maxPreferenceScore(input.preferences, "STYLE", [tag.name]) === 0,
    )
    .reduce((maximum, tag) => Math.max(maximum, tag.score), 0);

  return {
    categoryMatch,
    colorMatch,
    materialMatch,
    styleMatch,
    functionMatch,
    functionIntensity,
    expressionIntensity,
    unmatchedStyleIntensity,
  };
}

function makeReason(candidate: CandidateProduct, signals: ReturnType<typeof candidateSignals>) {
  const matched: string[] = [];
  if (signals.colorMatch > 0) matched.push(candidate.color);
  if (signals.styleMatch > 0) {
    const style = verifiedTags(candidate)
      .filter((tag) => tag.type === "STYLE" || tag.type === "MOOD")
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "en"))[0];
    if (style) matched.push(style.name);
  }
  if (signals.functionMatch > 0) {
    const functional = verifiedTags(candidate)
      .filter((tag) => tag.type === "FUNCTION")
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "en"))[0];
    if (functional) matched.push(functional.name);
  }
  if (matched.length === 0) matched.push(candidate.category, candidate.color);

  return `${candidate.name}은(는) ${matched.join(", ")} 기준에서 현재 취향과 연결됩니다.`;
}

export function scoreJourneyCandidates(
  candidates: CandidateProduct[],
  input: TasteScoreInput,
): ScoredCandidate[] {
  const provisional = candidates.map((candidate) => {
    const signals = candidateSignals(candidate, input);
    const score =
      RULE_SCORE_WEIGHTS.base +
      roundedContribution(signals.categoryMatch, RULE_SCORE_WEIGHTS.category) +
      roundedContribution(signals.colorMatch, RULE_SCORE_WEIGHTS.color) +
      roundedContribution(signals.materialMatch, RULE_SCORE_WEIGHTS.material) +
      roundedContribution(signals.styleMatch, RULE_SCORE_WEIGHTS.style) +
      roundedContribution(signals.functionMatch, RULE_SCORE_WEIGHTS.function) +
      (input.practicalityScore / 100) *
        (signals.functionIntensity / 100) *
        RULE_SCORE_WEIGHTS.practicality +
      (input.expressionScore / 100) *
        (signals.expressionIntensity / 100) *
        RULE_SCORE_WEIGHTS.expression +
      (input.noveltyScore / 100) *
        (signals.unmatchedStyleIntensity / 100) *
        RULE_SCORE_WEIGHTS.novelty;

    return {
      ...candidate,
      ruleScore: Math.max(0, Math.min(100, Math.round(score))),
      type: "COMPARE" as RecommendationType,
      reason: makeReason(candidate, signals),
      challengeScore:
        (signals.unmatchedStyleIntensity / 100) *
        Math.max(input.noveltyScore, input.expressionScore),
    };
  });

  provisional.sort(
    (left, right) =>
      right.ruleScore - left.ruleScore ||
      left.sku.localeCompare(right.sku, "en") ||
      left.id.localeCompare(right.id, "en"),
  );

  if (provisional[0]) provisional[0].type = "MATCH";
  if (Math.max(input.noveltyScore, input.expressionScore) >= 70) {
    const challenge = provisional
      .slice(1)
      .filter((candidate) => candidate.challengeScore > 0)
      .sort(
        (left, right) =>
          right.challengeScore - left.challengeScore ||
          left.sku.localeCompare(right.sku, "en") ||
          left.id.localeCompare(right.id, "en"),
      )[0];
    if (challenge) challenge.type = "CHALLENGE";
  }

  return provisional.sort(
    (left, right) =>
      right.ruleScore - left.ruleScore ||
      RECOMMENDATION_TYPE_ORDER[left.type] - RECOMMENDATION_TYPE_ORDER[right.type] ||
      left.sku.localeCompare(right.sku, "en") ||
      left.id.localeCompare(right.id, "en"),
  );
}
