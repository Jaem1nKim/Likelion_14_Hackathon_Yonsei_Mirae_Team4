import {
  APIConnectionTimeoutError,
  APIError,
  RateLimitError,
} from "openai";

import type { AiErrorCode } from "./ai-types.js";

export class AiError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(code);
    this.name = "AiError";
  }
}

export function normalizeAiError(error: unknown): AiErrorCode {
  if (error instanceof AiError) return error.code;
  if (error instanceof APIConnectionTimeoutError) return "AI_TIMEOUT";
  if (error instanceof RateLimitError) return "AI_RATE_LIMITED";
  if (error instanceof APIError) return "AI_PROVIDER_ERROR";
  return "AI_PROVIDER_ERROR";
}
