import { aiConfig } from "./ai-config.js";
import { OpenAiResponsesClient } from "./openai-client.js";
import type { AiConfig, AiResponseClient } from "./ai-types.js";

export type AiRuntime = { config: AiConfig; client: AiResponseClient | null };

let testOverride: AiRuntime | null = null;
let defaultClient: AiResponseClient | null = null;

export function getAiRuntime(): AiRuntime {
  if (testOverride) return testOverride;
  if (aiConfig.enabled && aiConfig.apiKey && !defaultClient) {
    defaultClient = new OpenAiResponsesClient(aiConfig.apiKey);
  }
  return { config: aiConfig, client: defaultClient };
}

export function setAiRuntimeForTests(runtime: AiRuntime | null) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("AI_RUNTIME_OVERRIDE_NOT_ALLOWED");
  }
  testOverride = runtime;
}
