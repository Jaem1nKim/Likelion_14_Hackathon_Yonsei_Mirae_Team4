import { z } from "zod";

import { env } from "../../config/env.js";
import type { AiConfig } from "./ai-types.js";

const aiConfigSchema = z.strictObject({
  enabled: z.boolean(),
  apiKey: z.string().trim(),
  model: z.string().trim().min(1),
  reasoningEffort: z.enum(["none", "low", "medium", "high"]),
  timeoutMs: z.number().int().min(1_000).max(120_000),
});

export function parseAiConfig(value: unknown): AiConfig {
  return aiConfigSchema.parse(value);
}

export const aiConfig = parseAiConfig({
  enabled: env.OPENAI_ENABLED,
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_MODEL,
  reasoningEffort: env.OPENAI_REASONING_EFFORT,
  timeoutMs: env.OPENAI_TIMEOUT_MS,
});
