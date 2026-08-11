import type { ApiSuccess, SharedJourneyResultView } from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type { ShareTokenParams } from "../schemas/result-schemas.js";
import { getSharedJourneyResult } from "../services/journey-result-service.js";

export async function getSharedResult(
  request: Request,
  response: Response<ApiSuccess<SharedJourneyResultView>>,
) {
  const { shareToken } = getValidatedInput<ShareTokenParams>(request, "params");
  response.status(200).json({
    data: await getSharedJourneyResult(shareToken),
  });
}
