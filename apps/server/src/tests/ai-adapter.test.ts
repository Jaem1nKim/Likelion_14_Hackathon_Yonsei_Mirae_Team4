import { afterEach, describe, expect, it } from "vitest";

import { parseOpenAiEnabled, parseServerEnv } from "../config/env.js";
import { parseAiConfig } from "../services/ai/ai-config.js";
import { AiError } from "../services/ai/ai-error.js";
import { setAiRuntimeForTests } from "../services/ai/ai-runtime.js";
import type {
  AiConfig,
  AiResponseClient,
  JourneyResultAiInput,
  JourneyResultAiOutput,
  JourneyStepAiInput,
  JourneyStepAiOutput,
  StructuredResponse,
  StructuredResponseRequest,
} from "../services/ai/ai-types.js";
import {
  generateJourneyResultWithAi,
  JOURNEY_RESULT_MAX_OUTPUT_TOKENS,
  validateJourneyResultMeaning,
} from "../services/ai/journey-result-ai-service.js";
import {
  generateJourneyStepWithAi,
  JOURNEY_STEP_MAX_OUTPUT_TOKENS,
  validateJourneyStepMeaning,
} from "../services/ai/journey-step-ai-service.js";
import { OPENAI_SDK_MAX_RETRIES } from "../services/ai/openai-client.js";

const enabledConfig: AiConfig = {
  enabled: true,
  apiKey: "test-key-not-real",
  model: "gpt-5.6-terra",
  reasoningEffort: "medium",
  timeoutMs: 10_000,
};

class QueueClient implements AiResponseClient {
  readonly requests: StructuredResponseRequest[] = [];

  constructor(private readonly queue: Array<StructuredResponse | Error>) {}

  async generateStructured(request: StructuredResponseRequest) {
    this.requests.push(request);
    const value = this.queue.shift();
    if (!value) throw new Error("NO_FAKE_RESPONSE");
    if (value instanceof Error) throw value;
    return value;
  }
}

const snapshot = {
  longTermTasteSummary: "클래식하고 실용적인 취향",
  todayIntentSummary: "오늘의 Journey 방향: 나만의 시그니처 찾기",
  practicalityScore: 80,
  expressionScore: 60,
  noveltyScore: 70,
  preferences: [{ type: "COLOR" as const, value: "BLACK", score: 90 }],
  behaviorSummary: null,
};

const stepInput: JourneyStepAiInput = {
  purpose: "JOURNEY_STEP",
  promptVersion: "journey-step-v1",
  journeyId: "journey-1",
  profileSnapshot: snapshot,
  currentStage: "BAG",
  serverCanFinishJourney: false,
  candidateProducts: [
    { productId: "p1", sku: "SKU-1", name: "Bag One", category: "BAG", color: "BLACK", material: "LEATHER", size: null, capacity: null, wearMethod: null, description: "Demo bag one", tags: [{ type: "STYLE", name: "CLASSIC", score: 90 }], storeId: "s1", zoneId: "z1", ruleScore: 90, recommendationType: "MATCH", ruleReason: "reason 1", sceneBackgroundKey: "scene-1" },
    { productId: "p2", sku: "SKU-2", name: "Bag Two", category: "BAG", color: "WHITE", material: "CANVAS", size: null, capacity: null, wearMethod: null, description: "Demo bag two", tags: [{ type: "MOOD", name: "URBAN", score: 80 }], storeId: "s1", zoneId: "z1", ruleScore: 80, recommendationType: "COMPARE", ruleReason: "reason 2", sceneBackgroundKey: null },
    { productId: "p3", sku: "SKU-3", name: "Bag Three", category: "BAG", color: "RED", material: null, size: null, capacity: null, wearMethod: null, description: "Demo bag three", tags: [{ type: "STYLE", name: "BOLD", score: 85 }], storeId: "s1", zoneId: "z1", ruleScore: 70, recommendationType: "CHALLENGE", ruleReason: "reason 3", sceneBackgroundKey: null },
  ],
  previousSelectedProducts: [],
  previousRejectedProducts: [],
  allowedZones: [{ zoneId: "z1", storeId: "s1", category: "BAG", name: "Bag Zone", directionText: "1층", heritageTitle: null, heritageStory: null }],
};

const validStepOutput: JourneyStepAiOutput = {
  scenarioTitle: "오늘의 가방을 선택해보세요",
  scenarioText: "세 가지 방향을 직접 비교해보세요.",
  nextZoneId: "z1",
  recommendedProductIds: ["p1", "p2", "p3"],
  challengeProductId: "p3",
  recommendationReasons: [
    { productId: "p1", reason: "클래식한 방향을 이어갑니다." },
    { productId: "p2", reason: "밝은 대비를 비교합니다." },
    { productId: "p3", reason: "표현 범위를 확장합니다." },
  ],
  canFinishJourney: false,
};

const resultInput: JourneyResultAiInput = {
  purpose: "JOURNEY_RESULT",
  promptVersion: "journey-result-v1",
  journeyId: "journey-1",
  startQuestion: { code: "TODAY_INTENT", answerCode: "SIGNATURE", answerLabel: "나만의 시그니처 찾기" },
  profileSnapshot: snapshot,
  finalSelectedProducts: [
    { selectionOrder: 1, stepNumber: 1, stage: "BAG", productId: "p1", name: "Bag One", category: "BAG", color: "BLACK", material: "LEATHER", size: null, capacity: null, wearMethod: null, description: "Demo bag", tags: [{ type: "STYLE", name: "CLASSIC", score: 90 }], sceneBackgroundKey: "scene-1" },
    { selectionOrder: 2, stepNumber: 2, stage: "APPAREL", productId: "p4", name: "Jacket One", category: "APPAREL", color: "WHITE", material: "COTTON", size: null, capacity: null, wearMethod: null, description: "Demo jacket", tags: [{ type: "MOOD", name: "URBAN", score: 80 }], sceneBackgroundKey: null },
  ],
  decisionHistory: [
    { sequence: 1, stepNumber: 1, stage: "BAG", productId: "p1", type: "SELECTED" },
    { sequence: 2, stepNumber: 2, stage: "APPAREL", productId: "p4", type: "SELECTED" },
  ],
  allowedSceneKeys: ["scene-1"],
};

const validResultOutput: JourneyResultAiOutput = {
  signatureName: "MCM Urban Journey",
  signatureStory: "두 제품의 대비가 하나의 흐름을 완성했습니다.",
  finalLookSummary: "가방과 재킷을 연결한 MCM 룩입니다.",
  productReasons: [
    { productId: "p1", reason: "클래식한 중심을 만듭니다." },
    { productId: "p4", reason: "밝은 대비를 더합니다." },
  ],
  staffSummary: "가방과 재킷을 최종 선택했습니다.",
  sceneKey: "scene-1",
};

afterEach(() => setAiRuntimeForTests(null));

describe("AI config and retry policy", () => {
  it("defaults missing AI settings to disabled, luna and low", () => {
    const parsed = parseServerEnv({ DATABASE_URL: "file:./prisma/test.db" });
    expect(parsed).toMatchObject({
      OPENAI_ENABLED: false,
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-5.6-luna",
      OPENAI_REASONING_EFFORT: "low",
      OPENAI_TIMEOUT_MS: 10_000,
    });
  });

  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["1", false],
    ["yes", false],
    ["true", true],
    [" TRUE ", true],
  ])("parses OPENAI_ENABLED=%s as %s", (value, expected) => {
    expect(parseOpenAiEnabled(value)).toBe(expected);
  });

  it("uses validated model, effort and timeout configuration", () => {
    expect(parseAiConfig(enabledConfig)).toEqual(enabledConfig);
    expect(() => parseAiConfig({ ...enabledConfig, timeoutMs: 999 })).toThrow();
    expect(() => parseAiConfig({ ...enabledConfig, reasoningEffort: "xhigh" })).toThrow();
  });

  it("keeps the official SDK automatic retry disabled", () => {
    expect(OPENAI_SDK_MAX_RETRIES).toBe(0);
  });

  it("does not call a provider when AI is disabled", async () => {
    const client = new QueueClient([]);
    setAiRuntimeForTests({ config: { ...enabledConfig, enabled: false }, client });
    const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
    expect(result.usedFallback).toBe(true);
    expect(result.execution.errorCode).toBe("AI_DISABLED");
    expect(client.requests).toHaveLength(0);
  });

  it.each([undefined, "", "false"]) (
    "makes zero provider calls when OPENAI_ENABLED is %s",
    async (value) => {
      const client = new QueueClient([]);
      setAiRuntimeForTests({
        config: { ...enabledConfig, enabled: parseOpenAiEnabled(value) },
        client,
      });
      const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
      expect(result.execution.errorCode).toBe("AI_DISABLED");
      expect(client.requests).toHaveLength(0);
    },
  );

  it.each(["", "   "]) (
    "falls back without a provider call when the key is %j",
    async (apiKey) => {
    const client = new QueueClient([]);
    setAiRuntimeForTests({ config: { ...enabledConfig, apiKey }, client });
    const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
    expect(result.execution.errorCode).toBe("AI_API_KEY_MISSING");
    expect(client.requests).toHaveLength(0);
    },
  );

  it("passes model, effort, timeout and Step output cap to the provider", async () => {
    const client = new QueueClient([{ outputText: JSON.stringify(validStepOutput), modelName: "resolved-model" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
    expect(client.requests[0]).toMatchObject({
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      timeoutMs: 10_000,
      maxOutputTokens: JOURNEY_STEP_MAX_OUTPUT_TOKENS,
    });
    expect(result.execution.modelName).toBe("resolved-model");
  });
});

describe("Journey Step AI validation", () => {
  it("accepts a valid response and records only compact summaries", async () => {
    const client = new QueueClient([{ outputText: JSON.stringify(validStepOutput), modelName: "model-a" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
    expect(result).toMatchObject({ usedFallback: false, execution: { status: "SUCCESS", validated: true, errorCode: null } });
    expect(JSON.parse(result.execution.requestSummaryJson)).toEqual({ stage: "BAG", candidateCount: 3, selectedCount: 0, rejectedCount: 0 });
    expect(result.execution.responseSummaryJson).not.toContain(validStepOutput.scenarioText);
  });

  it("retries once and succeeds on the second response", async () => {
    const client = new QueueClient([new Error("temporary"), { outputText: JSON.stringify(validStepOutput), modelName: "model-a" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
    expect(result.usedFallback).toBe(false);
    expect(client.requests).toHaveLength(2);
  });

  it.each([
    ["malformed JSON", "{"],
    ["strict schema error", JSON.stringify({ ...validStepOutput, extra: true })],
    ["outside product", JSON.stringify({ ...validStepOutput, recommendedProductIds: ["p1", "p2", "outside"] })],
    ["duplicate product", JSON.stringify({ ...validStepOutput, recommendedProductIds: ["p1", "p1", "p3"] })],
    ["too few recommendations", JSON.stringify({ ...validStepOutput, recommendedProductIds: ["p1", "p2"], recommendationReasons: validStepOutput.recommendationReasons.slice(0, 2) })],
    ["outside zone", JSON.stringify({ ...validStepOutput, nextZoneId: "other-zone" })],
    ["missing reason", JSON.stringify({ ...validStepOutput, recommendationReasons: validStepOutput.recommendationReasons.slice(0, 2) })],
    ["outside reason", JSON.stringify({ ...validStepOutput, recommendationReasons: [...validStepOutput.recommendationReasons.slice(0, 2), { productId: "outside", reason: "wrong" }] })],
    ["invalid challenge", JSON.stringify({ ...validStepOutput, challengeProductId: "p2" })],
    ["changed finish flag", JSON.stringify({ ...validStepOutput, canFinishJourney: true })],
  ])("discards %s and falls back after exactly two attempts", async (_name, outputText) => {
    const client = new QueueClient([{ outputText, modelName: "model-a" }, { outputText, modelName: "model-a" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyStepWithAi(stepInput, validStepOutput);
    expect(result.usedFallback).toBe(true);
    expect(result.execution).toMatchObject({ status: "FALLBACK", validated: false });
    expect(client.requests).toHaveLength(2);
  });

  it("rejects a product that exists but is not in the candidate scope", () => {
    expect(() => validateJourneyStepMeaning(stepInput, { ...validStepOutput, recommendedProductIds: ["p1", "p2", "db-product"] })).toThrowError(new AiError("AI_PRODUCT_OUT_OF_SCOPE"));
  });
});

describe("Journey Result AI validation", () => {
  it("passes the Result output cap to the provider", async () => {
    const client = new QueueClient([{ outputText: JSON.stringify(validResultOutput), modelName: "model-r" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    await generateJourneyResultWithAi(resultInput, validResultOutput);
    expect(client.requests[0]?.maxOutputTokens).toBe(JOURNEY_RESULT_MAX_OUTPUT_TOKENS);
  });

  it("accepts a complete ordered Result response", async () => {
    const client = new QueueClient([{ outputText: JSON.stringify(validResultOutput), modelName: "model-r" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyResultWithAi(resultInput, validResultOutput);
    expect(result).toMatchObject({ usedFallback: false, execution: { status: "SUCCESS", validated: true } });
    expect(result.execution.responseSummaryJson).not.toContain(validResultOutput.staffSummary);
  });

  it.each([
    ["outside product", { ...validResultOutput, productReasons: [{ productId: "outside", reason: "wrong" }, validResultOutput.productReasons[1]!] }],
    ["missing product", { ...validResultOutput, productReasons: validResultOutput.productReasons.slice(0, 1) }],
    ["wrong order", { ...validResultOutput, productReasons: [...validResultOutput.productReasons].reverse() }],
    ["outside scene", { ...validResultOutput, sceneKey: "other-scene" }],
    ["HTML", { ...validResultOutput, signatureStory: "<script>alert(1)</script>" }],
    ["email in staff summary", { ...validResultOutput, staffSummary: "customer@example.com 고객" }],
  ])("rejects %s and uses the deterministic result", async (_name, invalid) => {
    const outputText = JSON.stringify(invalid);
    const client = new QueueClient([{ outputText, modelName: "model-r" }, { outputText, modelName: "model-r" }]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyResultWithAi(resultInput, validResultOutput);
    expect(result.usedFallback).toBe(true);
    expect(result.execution.status).toBe("FALLBACK");
    expect(client.requests).toHaveLength(2);
  });

  it("normalizes a timeout without exposing the provider error", async () => {
    const client = new QueueClient([new AiError("AI_TIMEOUT"), new AiError("AI_TIMEOUT")]);
    setAiRuntimeForTests({ config: enabledConfig, client });
    const result = await generateJourneyResultWithAi(resultInput, validResultOutput);
    expect(result.execution.errorCode).toBe("AI_TIMEOUT");
    expect(result.execution.responseSummaryJson).toBeNull();
  });

  it("enforces ordered product reasons and allowed scenes directly", () => {
    expect(() => validateJourneyResultMeaning(resultInput, { ...validResultOutput, sceneKey: "outside" })).toThrowError(new AiError("AI_SCENE_OUT_OF_SCOPE"));
  });
});
