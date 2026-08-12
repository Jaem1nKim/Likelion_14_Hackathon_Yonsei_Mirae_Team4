import { APIConnectionTimeoutError, APIError, RateLimitError } from "openai";

import { AiError } from "./ai-error.js";
import type {
  AiConfig,
  AiResponseClient,
  JourneyStepAiInput,
} from "./ai-types.js";
import {
  JOURNEY_STEP_MAX_OUTPUT_TOKENS,
  validateJourneyStepMeaning,
} from "./journey-step-ai-service.js";
import {
  buildJourneyStepPrompt,
  JOURNEY_STEP_PROMPT_VERSION,
  JOURNEY_STEP_SYSTEM_PROMPT,
} from "./journey-step-prompt.js";
import {
  journeyStepAiOutputSchema,
  journeyStepJsonSchema,
} from "./journey-step-schema.js";
import { OpenAiResponsesClient } from "./openai-client.js";

export const AI_SMOKE_ERROR_CODES = [
  "AI_DISABLED",
  "AI_API_KEY_MISSING",
  "MODEL_NOT_FOUND",
  "AUTHENTICATION_ERROR",
  "RATE_LIMIT",
  "INSUFFICIENT_QUOTA",
  "AI_TIMEOUT",
  "AI_PROVIDER_ERROR",
  "AI_JSON_INVALID",
  "AI_SCHEMA_INVALID",
] as const;

export type AiSmokeErrorCode = (typeof AI_SMOKE_ERROR_CODES)[number];

export class AiSmokeError extends Error {
  constructor(public readonly code: AiSmokeErrorCode) {
    super(code);
    this.name = "AiSmokeError";
  }
}

const smokeInput: JourneyStepAiInput = {
  purpose: "JOURNEY_STEP",
  promptVersion: JOURNEY_STEP_PROMPT_VERSION,
  journeyId: "smoke-fixture-journey",
  profileSnapshot: {
    longTermTasteSummary: "구조적인 형태와 절제된 색상을 선호합니다.",
    todayIntentSummary: "오늘의 Journey 방향: 새로운 스타일을 가볍게 시도하기",
    practicalityScore: 82,
    expressionScore: 64,
    noveltyScore: 55,
    preferences: [
      { type: "CATEGORY", value: "BAG", score: 95 },
      { type: "COLOR", value: "BLACK", score: 90 },
      { type: "STYLE", value: "CLASSIC", score: 86 },
    ],
    behaviorSummary: null,
  },
  currentStage: "BAG",
  serverCanFinishJourney: false,
  candidateProducts: [
    {
      productId: "smoke-bag-1",
      sku: "SMOKE-BAG-01",
      name: "Demo Structured Carry Bag",
      category: "BAG",
      color: "BLACK",
      material: "Demo leather",
      size: null,
      capacity: null,
      wearMethod: "HAND_CARRY",
      description: "구조적인 실루엣의 데모 가방",
      tags: [{ type: "STYLE", name: "CLASSIC", score: 92 }],
      storeId: "smoke-store",
      zoneId: "smoke-bag-zone",
      ruleScore: 92,
      recommendationType: "MATCH",
      ruleReason: "구조적인 형태와 검정 색상 선호에 맞습니다.",
      sceneBackgroundKey: "smoke-scene",
    },
    {
      productId: "smoke-bag-2",
      sku: "SMOKE-BAG-02",
      name: "Demo Contrast Tote",
      category: "BAG",
      color: "WHITE",
      material: "Demo canvas",
      size: null,
      capacity: null,
      wearMethod: "SHOULDER",
      description: "밝은 대비를 더한 데모 토트백",
      tags: [{ type: "MOOD", name: "URBAN", score: 84 }],
      storeId: "smoke-store",
      zoneId: "smoke-bag-zone",
      ruleScore: 78,
      recommendationType: "COMPARE",
      ruleReason: "기존 취향과 다른 밝은 대비를 비교할 수 있습니다.",
      sceneBackgroundKey: null,
    },
    {
      productId: "smoke-bag-3",
      sku: "SMOKE-BAG-03",
      name: "Demo Signal Mini Bag",
      category: "BAG",
      color: "RED",
      material: "Demo leather",
      size: null,
      capacity: null,
      wearMethod: "CROSSBODY",
      description: "표현적인 색상의 데모 미니백",
      tags: [{ type: "STYLE", name: "BOLD", score: 88 }],
      storeId: "smoke-store",
      zoneId: "smoke-bag-zone",
      ruleScore: 72,
      recommendationType: "CHALLENGE",
      ruleReason: "표현성과 새로움을 확장할 수 있습니다.",
      sceneBackgroundKey: null,
    },
  ],
  previousSelectedProducts: [],
  previousRejectedProducts: [],
  allowedZones: [
    {
      zoneId: "smoke-bag-zone",
      storeId: "smoke-store",
      category: "BAG",
      name: "Demo Bag Zone",
      directionText: "데모 가방 구역으로 이동합니다.",
      heritageTitle: "Demo Heritage",
      heritageStory: "Smoke 검증을 위한 비식별 데모 문장입니다.",
    },
  ],
};

function normalizeSmokeError(error: unknown): AiSmokeErrorCode {
  if (error instanceof AiSmokeError) return error.code;
  if (error instanceof AiError) {
    if (error.code === "AI_JSON_INVALID") return "AI_JSON_INVALID";
    if (error.code === "AI_SCHEMA_INVALID") return "AI_SCHEMA_INVALID";
    return "AI_SCHEMA_INVALID";
  }
  if (error instanceof APIConnectionTimeoutError) return "AI_TIMEOUT";
  if (error instanceof RateLimitError) {
    return error.code === "insufficient_quota" ? "INSUFFICIENT_QUOTA" : "RATE_LIMIT";
  }
  if (error instanceof APIError) {
    if (error.status === 401) return "AUTHENTICATION_ERROR";
    if (error.code === "model_not_found") return "MODEL_NOT_FOUND";
    if (error.code === "insufficient_quota") return "INSUFFICIENT_QUOTA";
    if (error.code === "invalid_json_schema") return "AI_SCHEMA_INVALID";
  }
  return "AI_PROVIDER_ERROR";
}

export type AiSmokeResult = {
  model: string;
  success: true;
  latencyMs: number;
  validated: true;
  recommendedProductCount: number;
};

export async function runJourneyStepAiSmoke(
  config: AiConfig,
  client: AiResponseClient | null = null,
): Promise<AiSmokeResult> {
  if (!config.enabled) throw new AiSmokeError("AI_DISABLED");
  if (!config.apiKey.trim()) throw new AiSmokeError("AI_API_KEY_MISSING");

  const provider = client ?? new OpenAiResponsesClient(config.apiKey);
  const startedAt = Date.now();
  try {
    const response = await provider.generateStructured({
      model: config.model,
      reasoningEffort: config.reasoningEffort,
      timeoutMs: config.timeoutMs,
      maxOutputTokens: JOURNEY_STEP_MAX_OUTPUT_TOKENS,
      instructions: JOURNEY_STEP_SYSTEM_PROMPT,
      input: buildJourneyStepPrompt(smokeInput),
      schemaName: "mcm_journey_step_smoke",
      schema: journeyStepJsonSchema,
    });

    let rawOutput: unknown;
    try {
      rawOutput = JSON.parse(response.outputText);
    } catch {
      throw new AiSmokeError("AI_JSON_INVALID");
    }
    const parsed = journeyStepAiOutputSchema.safeParse(rawOutput);
    if (!parsed.success) throw new AiSmokeError("AI_SCHEMA_INVALID");
    validateJourneyStepMeaning(smokeInput, parsed.data);

    return {
      model: response.modelName,
      success: true,
      latencyMs: Date.now() - startedAt,
      validated: true,
      recommendedProductCount: parsed.data.recommendedProductIds.length,
    };
  } catch (error) {
    throw new AiSmokeError(normalizeSmokeError(error));
  }
}
