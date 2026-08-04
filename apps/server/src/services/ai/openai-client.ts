import OpenAI from "openai";

import type {
  AiResponseClient,
  StructuredResponseRequest,
} from "./ai-types.js";

export const OPENAI_SDK_MAX_RETRIES = 0;

export class OpenAiResponsesClient implements AiResponseClient {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      maxRetries: OPENAI_SDK_MAX_RETRIES,
      logLevel: "off",
    });
  }

  async generateStructured(
    request: StructuredResponseRequest,
  ): Promise<{ outputText: string; modelName: string }> {
    const response = await this.client.responses.create(
      {
        background: false,
        model: request.model,
        instructions: request.instructions,
        input: request.input,
        max_output_tokens: request.maxOutputTokens,
        reasoning: { effort: request.reasoningEffort },
        store: false,
        stream: false,
        text: {
          format: {
            type: "json_schema",
            name: request.schemaName,
            schema: request.schema,
            strict: true,
          },
        },
      },
      { timeout: request.timeoutMs, maxRetries: OPENAI_SDK_MAX_RETRIES },
    );

    return { outputText: response.output_text, modelName: response.model };
  }
}
