import { describe, expect, it } from "vitest";

import { journeyResultAiOutputSchema } from "../services/ai/journey-result-schema.js";
import { journeyStepAiOutputSchema } from "../services/ai/journey-step-schema.js";

const validStep = {
  scenarioTitle: "허용된 스타일을 선택해보세요",
  scenarioText: "현재 후보 안에서 제품을 직접 비교해보세요.",
  nextZoneId: "zone-1",
  recommendedProductIds: ["p1", "p2", "p3"],
  challengeProductId: "p3",
  recommendationReasons: [
    { productId: "p1", reason: "첫 번째 이유입니다." },
    { productId: "p2", reason: "두 번째 이유입니다." },
    { productId: "p3", reason: "세 번째 이유입니다." },
  ],
  canFinishJourney: false,
};

const validResult = {
  signatureName: "MCM Urban Journey",
  signatureStory: "선택한 제품이 하나의 스타일 흐름을 완성했습니다.",
  finalLookSummary: "가방과 의류를 연결한 MCM 룩입니다.",
  productReasons: [
    { productId: "p1", reason: "가방이 전체 선택의 중심을 만듭니다." },
    { productId: "p2", reason: "의류가 색상 흐름을 이어갑니다." },
  ],
  staffSummary: "두 제품을 최종 선택했습니다.",
  sceneKey: "scene-1",
};

describe("Journey Step strict schema contract", () => {
  it.each<[string, unknown]>([
    ["empty title", { ...validStep, scenarioTitle: "" }],
    ["title over 60", { ...validStep, scenarioTitle: "가".repeat(61) }],
    ["empty text", { ...validStep, scenarioText: "" }],
    ["text over 400", { ...validStep, scenarioText: "가".repeat(401) }],
    ["empty zone", { ...validStep, nextZoneId: " " }],
    ["zero products", { ...validStep, recommendedProductIds: [] }],
    ["four products", { ...validStep, recommendedProductIds: ["p1", "p2", "p3", "p4"] }],
    ["duplicate products", { ...validStep, recommendedProductIds: ["p1", "p1", "p3"] }],
    ["empty product id", { ...validStep, recommendedProductIds: ["p1", "", "p3"] }],
    ["empty challenge id", { ...validStep, challengeProductId: "" }],
    ["zero reasons", { ...validStep, recommendationReasons: [] }],
    ["reason over 240", { ...validStep, recommendationReasons: [{ productId: "p1", reason: "가".repeat(241) }] }],
    ["empty reason", { ...validStep, recommendationReasons: [{ productId: "p1", reason: "" }] }],
    ["empty reason product id", { ...validStep, recommendationReasons: [{ productId: "", reason: "이유" }] }],
    ["extra top-level field", { ...validStep, unexpected: true }],
    ["extra reason field", { ...validStep, recommendationReasons: [{ productId: "p1", reason: "이유", extra: true }] }],
    ["non-boolean finish flag", { ...validStep, canFinishJourney: "false" }],
    ["HTML title", { ...validStep, scenarioTitle: "<b>제목</b>" }],
    ["Markdown link text", { ...validStep, scenarioText: "[설명](https://example.com)" }],
  ])("rejects %s", (_name, value) => {
    expect(journeyStepAiOutputSchema.safeParse(value).success).toBe(false);
  });
});

describe("Journey Result strict schema contract", () => {
  it.each<[string, unknown]>([
    ["empty signature name", { ...validResult, signatureName: "" }],
    ["signature name over 60", { ...validResult, signatureName: "가".repeat(61) }],
    ["empty signature story", { ...validResult, signatureStory: "" }],
    ["signature story over 600", { ...validResult, signatureStory: "가".repeat(601) }],
    ["empty look summary", { ...validResult, finalLookSummary: "" }],
    ["look summary over 400", { ...validResult, finalLookSummary: "가".repeat(401) }],
    ["empty product reason", { ...validResult, productReasons: [{ productId: "p1", reason: "" }] }],
    ["product reason over 240", { ...validResult, productReasons: [{ productId: "p1", reason: "가".repeat(241) }] }],
    ["empty product id", { ...validResult, productReasons: [{ productId: "", reason: "이유" }] }],
    ["empty staff summary", { ...validResult, staffSummary: "" }],
    ["staff summary over 500", { ...validResult, staffSummary: "가".repeat(501) }],
    ["empty scene key", { ...validResult, sceneKey: "" }],
    ["extra top-level field", { ...validResult, unexpected: true }],
    ["extra product reason field", { ...validResult, productReasons: [{ productId: "p1", reason: "이유", extra: true }] }],
    ["script markup", { ...validResult, signatureStory: "<script>alert(1)</script>" }],
    ["Markdown link", { ...validResult, staffSummary: "[고객](https://example.com)" }],
  ])("rejects %s", (_name, value) => {
    expect(journeyResultAiOutputSchema.safeParse(value).success).toBe(false);
  });
});
