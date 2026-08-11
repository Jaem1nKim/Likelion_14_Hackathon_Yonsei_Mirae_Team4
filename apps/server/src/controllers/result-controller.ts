import type {
  ApiSuccess,
  CustomerJourneyResultView,
} from "@mcm/shared";
import type { Request, Response } from "express";

import { getDemoUser } from "../middleware/demo-user-middleware.js";
import { getValidatedInput } from "../middleware/validation-middleware.js";
import type { ResultJourneyParams } from "../schemas/result-schemas.js";
import { getCustomerJourneyResult } from "../services/journey-result-service.js";

export async function getJourneyResult(
  request: Request,
  response: Response<ApiSuccess<CustomerJourneyResultView>>,
) {
  const { journeyId } = getValidatedInput<ResultJourneyParams>(request, "params");
  response.status(200).json({
    data: await getCustomerJourneyResult(getDemoUser(request), journeyId),
  });
}
