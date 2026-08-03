import type { JourneyStage, RecommendationType } from "@mcm/shared";

export const JOURNEY_STAGE_SEQUENCE = ["BAG", "APPAREL", "ACCESSORY"] as const;

export const JOURNEY_STEP_COPY: Record<
  (typeof JOURNEY_STAGE_SEQUENCE)[number],
  { scenarioTitle: string; scenarioText: string; canFinishJourney: boolean }
> = {
  BAG: {
    scenarioTitle: "여정의 중심을 선택해보세요",
    scenarioText: "오늘의 방향과 취향에 맞는 MCM 가방을 직접 비교해보세요.",
    canFinishJourney: false,
  },
  APPAREL: {
    scenarioTitle: "선택한 가방에서 룩을 확장해보세요",
    scenarioText: "방금 선택한 가방의 색상과 분위기를 이어갈 의류를 확인해보세요.",
    canFinishJourney: true,
  },
  ACCESSORY: {
    scenarioTitle: "마지막 디테일을 완성해보세요",
    scenarioText: "지금까지의 선택을 연결할 액세서리로 Journey Signature를 완성해보세요.",
    canFinishJourney: true,
  },
};

export const RULE_SCORE_WEIGHTS = {
  base: 5,
  category: 15,
  color: 20,
  material: 10,
  style: 20,
  function: 15,
  practicality: 6,
  expression: 5,
  novelty: 4,
} as const;

export const RECOMMENDATION_TYPE_ORDER: Record<RecommendationType, number> = {
  MATCH: 0,
  COMPARE: 1,
  CHALLENGE: 2,
};

export const PERSONA_BASE_KEY: string | null = null;

export function isSupportedJourneyStage(
  stage: JourneyStage,
): stage is (typeof JOURNEY_STAGE_SEQUENCE)[number] {
  return JOURNEY_STAGE_SEQUENCE.includes(
    stage as (typeof JOURNEY_STAGE_SEQUENCE)[number],
  );
}
