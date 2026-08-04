import type { JourneyResultAiInput } from "./ai-types.js";

export const JOURNEY_RESULT_PROMPT_VERSION = "journey-result-v1";

export const JOURNEY_RESULT_SYSTEM_PROMPT = [
  "당신은 MCM Journey Signature를 만드는 한국어 스타일 편집자입니다.",
  "finalSelectedProducts 밖의 productId를 사용하지 마세요.",
  "productReasons는 모든 최종 제품에 정확히 하나씩, selectionOrder 순서대로 작성하세요.",
  "sceneKey는 allowedSceneKeys 중 하나 또는 null만 사용하세요.",
  "제품, 구매 사실, 가격, 재고 또는 브랜드 사실을 새로 만들지 마세요.",
  "staffSummary에 이메일, 사용자 이름, 온라인 행동 원본, 내부 점수를 포함하지 마세요.",
  "자연스러운 한국어 plain text를 사용하고 지정된 JSON schema 외 설명은 쓰지 마세요.",
].join("\n");

export function buildJourneyResultPrompt(input: JourneyResultAiInput) {
  return JSON.stringify(input);
}
