import type { FallbackStepData, ScoredCandidate } from "../../types/journey.js";
import { AiError } from "./ai-error.js";
import { getAiRuntime } from "./ai-runtime.js";
import type {
  AiGenerationResult,
  JourneyStepAiInput,
  JourneyStepAiOutput,
} from "./ai-types.js";
import { generateValidatedOutput } from "./ai-response-validator.js";
import {
  buildJourneyStepPrompt,
  JOURNEY_STEP_SYSTEM_PROMPT,
} from "./journey-step-prompt.js";
import {
  journeyStepAiOutputSchema,
  journeyStepJsonSchema,
} from "./journey-step-schema.js";

export const JOURNEY_STEP_MAX_OUTPUT_TOKENS = 900;

export function fallbackStepToAiOutput(step: FallbackStepData): JourneyStepAiOutput {
  const challenge = step.recommendations.find((item) => item.type === "CHALLENGE");
  return {
    scenarioTitle: step.scenarioTitle,
    scenarioText: step.scenarioText,
    nextZoneId: step.zoneId,
    recommendedProductIds: step.recommendations.map((item) => item.productId),
    challengeProductId: challenge?.productId ?? null,
    recommendationReasons: step.recommendations.map((item) => ({
      productId: item.productId,
      reason: item.reason,
    })),
    canFinishJourney: step.canFinishJourney,
  };
}

export function validateJourneyStepMeaning(
  input: JourneyStepAiInput,
  output: JourneyStepAiOutput,
) {
  const zones = new Set(input.allowedZones.map((zone) => zone.zoneId));
  if (!zones.has(output.nextZoneId)) throw new AiError("AI_ZONE_OUT_OF_SCOPE");

  const candidates = new Map(input.candidateProducts.map((item) => [item.productId, item]));
  const expectedCount = Math.min(3, input.candidateProducts.length);
  if (
    output.recommendedProductIds.length !== expectedCount ||
    new Set(output.recommendedProductIds).size !== output.recommendedProductIds.length
  ) {
    throw new AiError("AI_SCHEMA_INVALID");
  }
  for (const productId of output.recommendedProductIds) {
    const candidate = candidates.get(productId);
    if (!candidate) throw new AiError("AI_PRODUCT_OUT_OF_SCOPE");
    if (candidate.zoneId !== output.nextZoneId) throw new AiError("AI_ZONE_OUT_OF_SCOPE");
  }

  const reasonIds = output.recommendationReasons.map((item) => item.productId);
  if (
    reasonIds.length !== output.recommendedProductIds.length ||
    new Set(reasonIds).size !== reasonIds.length ||
    reasonIds.some((id) => !output.recommendedProductIds.includes(id)) ||
    output.recommendedProductIds.some((id) => !reasonIds.includes(id))
  ) {
    throw new AiError("AI_REASON_PRODUCT_MISMATCH");
  }
  if (output.challengeProductId !== null) {
    const challenge = candidates.get(output.challengeProductId);
    if (!output.recommendedProductIds.includes(output.challengeProductId) || !challenge) {
      throw new AiError("AI_PRODUCT_OUT_OF_SCOPE");
    }
    if (challenge.recommendationType !== "CHALLENGE") {
      throw new AiError("AI_PRODUCT_OUT_OF_SCOPE");
    }
  }
  if (output.canFinishJourney !== input.serverCanFinishJourney) {
    throw new AiError("AI_SCHEMA_INVALID");
  }
}

export async function generateJourneyStepWithAi(
  input: JourneyStepAiInput,
  fallbackOutput: JourneyStepAiOutput,
): Promise<AiGenerationResult<JourneyStepAiOutput>> {
  const runtime = getAiRuntime();
  return generateValidatedOutput({
    purpose: "JOURNEY_STEP",
    promptVersion: input.promptVersion,
    config: runtime.config,
    client: runtime.client,
    request: {
      instructions: JOURNEY_STEP_SYSTEM_PROMPT,
      input: buildJourneyStepPrompt(input),
      maxOutputTokens: JOURNEY_STEP_MAX_OUTPUT_TOKENS,
      schemaName: "mcm_journey_step",
      schema: journeyStepJsonSchema,
    },
    requestSummaryJson: JSON.stringify({
      stage: input.currentStage,
      candidateCount: input.candidateProducts.length,
      selectedCount: input.previousSelectedProducts.length,
      rejectedCount: input.previousRejectedProducts.length,
    }),
    fallbackOutput,
    schema: journeyStepAiOutputSchema,
    semanticValidator: (output) => validateJourneyStepMeaning(input, output),
    responseSummary: (output) => ({
      nextZoneId: output.nextZoneId,
      recommendedProductIds: output.recommendedProductIds,
      reasonCount: output.recommendationReasons.length,
    }),
  });
}

export function mapStepGenerationToPersistence(input: {
  stage: FallbackStepData["stage"];
  stepNumber: number;
  candidates: ScoredCandidate[];
  generation: AiGenerationResult<JourneyStepAiOutput>;
}) {
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const zoneCandidate = input.candidates.find(
    (candidate) => candidate.zoneId === input.generation.output.nextZoneId,
  );
  if (!zoneCandidate) throw new AiError("FALLBACK_INPUT_INVALID");
  const reasonById = new Map(
    input.generation.output.recommendationReasons.map((item) => [item.productId, item.reason]),
  );
  const recommendations = input.generation.output.recommendedProductIds.map(
    (productId, index) => {
      const candidate = candidateById.get(productId);
      const reason = reasonById.get(productId);
      if (!candidate || !reason) throw new AiError("FALLBACK_INPUT_INVALID");
      return {
        productId,
        type: candidate.type,
        rank: index + 1,
        ruleScore: candidate.ruleScore,
        reason,
      };
    },
  );
  return {
    stage: input.stage,
    stepNumber: input.stepNumber,
    zoneId: input.generation.output.nextZoneId,
    scenarioTitle: input.generation.output.scenarioTitle,
    scenarioText: input.generation.output.scenarioText,
    heritageTitle: zoneCandidate.heritageTitle,
    heritageText: zoneCandidate.heritageStory,
    canFinishJourney: input.generation.output.canFinishJourney,
    recommendations,
    usedFallback: input.generation.usedFallback,
    isAiSelected: !input.generation.usedFallback,
  };
}
