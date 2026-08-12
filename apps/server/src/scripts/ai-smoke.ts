import { aiConfig } from "../services/ai/ai-config.js";
import {
  AiSmokeError,
  runJourneyStepAiSmoke,
} from "../services/ai/ai-smoke-service.js";

async function main() {
  try {
    const result = await runJourneyStepAiSmoke(aiConfig);
    console.log(JSON.stringify(result));
  } catch (error) {
    const code = error instanceof AiSmokeError ? error.code : "AI_PROVIDER_ERROR";
    console.error(JSON.stringify({ success: false, error: code }));
    process.exitCode = 1;
  }
}

void main();
