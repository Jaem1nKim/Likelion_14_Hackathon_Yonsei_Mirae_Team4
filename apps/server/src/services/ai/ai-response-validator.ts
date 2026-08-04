import type { z } from "zod";

import { AiError, normalizeAiError } from "./ai-error.js";
import type {
  AiConfig,
  AiErrorCode,
  AiGenerationResult,
  AiPurpose,
  AiResponseClient,
  StructuredResponseRequest,
} from "./ai-types.js";

function validateOutput<T>(
  output: unknown,
  schema: z.ZodType<T>,
  semanticValidator: (value: T) => void,
): T {
  const parsed = schema.safeParse(output);
  if (!parsed.success) throw new AiError("AI_SCHEMA_INVALID");
  semanticValidator(parsed.data);
  return parsed.data;
}

function parseOutput<T>(
  outputText: string,
  schema: z.ZodType<T>,
  semanticValidator: (value: T) => void,
) {
  let value: unknown;
  try {
    value = JSON.parse(outputText);
  } catch {
    throw new AiError("AI_JSON_INVALID");
  }
  return validateOutput(value, schema, semanticValidator);
}

type GenerationInput<T> = {
  purpose: AiPurpose;
  promptVersion: string;
  config: AiConfig;
  client: AiResponseClient | null;
  request: Omit<StructuredResponseRequest, "model" | "reasoningEffort" | "timeoutMs">;
  requestSummaryJson: string;
  fallbackOutput: T;
  schema: z.ZodType<T>;
  semanticValidator: (value: T) => void;
  responseSummary: (value: T) => Record<string, unknown>;
};

function fallbackResult<T>(
  input: GenerationInput<T>,
  errorCode: AiErrorCode,
  latencyMs: number | null,
): AiGenerationResult<T> {
  let output: T;
  try {
    output = validateOutput(input.fallbackOutput, input.schema, input.semanticValidator);
  } catch {
    throw new AiError("FALLBACK_INPUT_INVALID");
  }
  return {
    output,
    usedFallback: true,
    execution: {
      purpose: input.purpose,
      status: "FALLBACK",
      validated: false,
      modelName: null,
      promptVersion: input.promptVersion,
      latencyMs,
      requestSummaryJson: input.requestSummaryJson,
      responseSummaryJson: null,
      errorCode,
    },
  };
}

export async function generateValidatedOutput<T>(
  input: GenerationInput<T>,
): Promise<AiGenerationResult<T>> {
  if (!input.config.enabled) return fallbackResult(input, "AI_DISABLED", null);
  if (!input.config.apiKey.trim()) {
    return fallbackResult(input, "AI_API_KEY_MISSING", null);
  }
  if (!input.client) return fallbackResult(input, "AI_PROVIDER_ERROR", null);

  let elapsedMs = 0;
  let lastError: AiErrorCode = "AI_PROVIDER_ERROR";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await input.client.generateStructured({
        ...input.request,
        model: input.config.model,
        reasoningEffort: input.config.reasoningEffort,
        timeoutMs: input.config.timeoutMs,
      });
      elapsedMs += Date.now() - startedAt;
      const output = parseOutput(response.outputText, input.schema, input.semanticValidator);
      return {
        output,
        usedFallback: false,
        execution: {
          purpose: input.purpose,
          status: "SUCCESS",
          validated: true,
          modelName: response.modelName,
          promptVersion: input.promptVersion,
          latencyMs: elapsedMs,
          requestSummaryJson: input.requestSummaryJson,
          responseSummaryJson: JSON.stringify(input.responseSummary(output)),
          errorCode: null,
        },
      };
    } catch (error) {
      elapsedMs += Date.now() - startedAt;
      lastError = normalizeAiError(error);
    }
  }
  return fallbackResult(input, lastError, elapsedMs);
}
