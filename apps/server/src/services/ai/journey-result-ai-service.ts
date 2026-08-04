import type { FallbackResultData } from "../journey/fallback-result-generator.js";
import { AiError } from "./ai-error.js";
import { getAiRuntime } from "./ai-runtime.js";
import type {
  AiGenerationResult,
  JourneyResultAiInput,
  JourneyResultAiOutput,
} from "./ai-types.js";
import { generateValidatedOutput } from "./ai-response-validator.js";
import {
  buildJourneyResultPrompt,
  JOURNEY_RESULT_SYSTEM_PROMPT,
} from "./journey-result-prompt.js";
import {
  journeyResultAiOutputSchema,
  journeyResultJsonSchema,
} from "./journey-result-schema.js";

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const forbiddenStaffTerms = /metadataJson|qrToken|reservationCode|practicalityScore|expressionScore|noveltyScore/i;

export const JOURNEY_RESULT_MAX_OUTPUT_TOKENS = 1_300;

export function fallbackResultToAiOutput(
  result: FallbackResultData,
): JourneyResultAiOutput {
  return {
    signatureName: result.signatureName,
    signatureStory: result.signatureStory,
    finalLookSummary: result.finalLookSummary,
    productReasons: result.items.map((item) => ({
      productId: item.productId,
      reason: item.recommendationReason,
    })),
    staffSummary: result.staffSummary,
    sceneKey: result.sceneKey,
  };
}

export function validateJourneyResultMeaning(
  input: JourneyResultAiInput,
  output: JourneyResultAiOutput,
) {
  const expectedIds = input.finalSelectedProducts.map((item) => item.productId);
  const actualIds = output.productReasons.map((item) => item.productId);
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new AiError("AI_REASON_PRODUCT_MISMATCH");
  }
  if (output.sceneKey !== null && !input.allowedSceneKeys.includes(output.sceneKey)) {
    throw new AiError("AI_SCENE_OUT_OF_SCOPE");
  }
  if (emailPattern.test(output.staffSummary) || forbiddenStaffTerms.test(output.staffSummary)) {
    throw new AiError("AI_SCHEMA_INVALID");
  }
}

export async function generateJourneyResultWithAi(
  input: JourneyResultAiInput,
  fallbackOutput: JourneyResultAiOutput,
): Promise<AiGenerationResult<JourneyResultAiOutput>> {
  const runtime = getAiRuntime();
  return generateValidatedOutput({
    purpose: "JOURNEY_RESULT",
    promptVersion: input.promptVersion,
    config: runtime.config,
    client: runtime.client,
    request: {
      instructions: JOURNEY_RESULT_SYSTEM_PROMPT,
      input: buildJourneyResultPrompt(input),
      maxOutputTokens: JOURNEY_RESULT_MAX_OUTPUT_TOKENS,
      schemaName: "mcm_journey_result",
      schema: journeyResultJsonSchema,
    },
    requestSummaryJson: JSON.stringify({
      selectedProductCount: input.finalSelectedProducts.length,
      decisionEventCount: input.decisionHistory.length,
      allowedSceneKeyCount: input.allowedSceneKeys.length,
    }),
    fallbackOutput,
    schema: journeyResultAiOutputSchema,
    semanticValidator: (output) => validateJourneyResultMeaning(input, output),
    responseSummary: (output) => ({
      productReasonCount: output.productReasons.length,
      sceneKeyPresent: output.sceneKey !== null,
    }),
  });
}

export function mapResultGenerationToPersistence(input: {
  fallback: FallbackResultData;
  generation: AiGenerationResult<JourneyResultAiOutput>;
}) {
  const reasonById = new Map(
    input.generation.output.productReasons.map((item) => [item.productId, item.reason]),
  );
  return {
    signatureName: input.generation.output.signatureName,
    signatureStory: input.generation.output.signatureStory,
    finalLookSummary: input.generation.output.finalLookSummary,
    staffSummary: input.generation.output.staffSummary,
    sceneKey: input.generation.output.sceneKey,
    usedFallback: input.generation.usedFallback,
    items: input.fallback.items.map((item) => {
      const recommendationReason = reasonById.get(item.productId);
      if (!recommendationReason) throw new AiError("FALLBACK_INPUT_INVALID");
      return { ...item, recommendationReason };
    }),
  };
}
