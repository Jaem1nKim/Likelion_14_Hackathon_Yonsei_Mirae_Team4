import { describe, expect, it } from "vitest";

import {
  AiSmokeError,
  runJourneyStepAiSmoke,
} from "../services/ai/ai-smoke-service.js";
import type {
  AiConfig,
  AiResponseClient,
  StructuredResponseRequest,
} from "../services/ai/ai-types.js";
import {
  journeyStepAiOutputSchema,
  journeyStepJsonSchema,
} from "../services/ai/journey-step-schema.js";

const config: AiConfig = {
  enabled: true,
  apiKey: "smoke-test-key-not-real",
  model: "mock-model",
  reasoningEffort: "low",
  timeoutMs: 10_000,
};

class SmokeFakeClient implements AiResponseClient {
  readonly requests: StructuredResponseRequest[] = [];

  async generateStructured(request: StructuredResponseRequest) {
    this.requests.push(request);
    const input = JSON.parse(request.input) as {
      candidateProducts: Array<{ productId: string; recommendationType: string }>;
      allowedZones: Array<{ zoneId: string }>;
      serverCanFinishJourney: boolean;
    };
    const ids = input.candidateProducts.map((item) => item.productId);
    const challenge = input.candidateProducts.find(
      (item) => item.recommendationType === "CHALLENGE",
    );
    return {
      modelName: "mock-model",
      outputText: JSON.stringify({
        scenarioTitle: "데모 추천",
        scenarioText: "세 가지 데모 후보를 비교해보세요.",
        nextZoneId: input.allowedZones[0]!.zoneId,
        recommendedProductIds: ids,
        challengeProductId: challenge?.productId ?? null,
        recommendationReasons: ids.map((productId) => ({
          productId,
          reason: `${productId}의 데모 추천 이유입니다.`,
        })),
        canFinishJourney: input.serverCanFinishJourney,
      }),
    };
  }
}

describe("explicit AI smoke", () => {
  it.each([
    ["disabled", { ...config, enabled: false }, "AI_DISABLED"],
    ["missing key", { ...config, apiKey: "" }, "AI_API_KEY_MISSING"],
  ] as const)("does not call the provider when %s", async (_name, current, code) => {
    const client = new SmokeFakeClient();
    await expect(runJourneyStepAiSmoke(current, client)).rejects.toEqual(
      expect.objectContaining<Partial<AiSmokeError>>({ code }),
    );
    expect(client.requests).toHaveLength(0);
  });

  it("makes exactly one structured request and validates it", async () => {
    const client = new SmokeFakeClient();
    const result = await runJourneyStepAiSmoke(config, client);
    expect(client.requests).toHaveLength(1);
    expect(client.requests[0]).toMatchObject({
      model: config.model,
      schemaName: "mcm_journey_step_smoke",
      maxOutputTokens: 900,
    });
    expect(result).toMatchObject({
      success: true,
      validated: true,
      recommendedProductCount: 3,
    });
  });

  it("keeps duplicate rejection in Zod without an unsupported provider keyword", () => {
    const productIdsSchema = (
      (journeyStepJsonSchema.properties as Record<string, unknown>)
        .recommendedProductIds as Record<string, unknown>
    );
    expect(productIdsSchema).not.toHaveProperty("uniqueItems");
    expect(
      journeyStepAiOutputSchema.safeParse({
        scenarioTitle: "Demo recommendation",
        scenarioText: "Compare the available products.",
        nextZoneId: "smoke-bag-zone",
        recommendedProductIds: ["smoke-bag-1", "smoke-bag-1"],
        challengeProductId: null,
        recommendationReasons: [
          { productId: "smoke-bag-1", reason: "Demo reason one." },
          { productId: "smoke-bag-1", reason: "Demo reason two." },
        ],
        canFinishJourney: false,
      }).success,
    ).toBe(false);
  });
});
