import type { Prisma } from "../../generated/prisma/client.js";
import type { AiExecutionData } from "./ai-types.js";

export function createAiExecutionInTransaction(
  transaction: Prisma.TransactionClient,
  input: {
    journeyId: string;
    journeyStepId: string | null;
    execution: AiExecutionData;
  },
) {
  return transaction.aIExecution.create({
    data: {
      journeyId: input.journeyId,
      journeyStepId: input.journeyStepId,
      purpose: input.execution.purpose,
      status: input.execution.status,
      promptVersion: input.execution.promptVersion,
      modelName: input.execution.modelName,
      requestJson: input.execution.requestSummaryJson,
      responseJson: input.execution.responseSummaryJson,
      validated: input.execution.validated,
      latencyMs: input.execution.latencyMs,
      errorMessage: input.execution.errorCode,
    },
    select: { id: true },
  });
}
