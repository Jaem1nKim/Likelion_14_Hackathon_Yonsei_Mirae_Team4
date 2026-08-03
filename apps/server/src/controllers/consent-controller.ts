import type {
  ApiSuccess,
  ConsentResponse,
  PutConsentRequest,
} from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type { UserIdParams } from "../schemas/demo-schemas.js";
import {
  getCurrentConsent,
  putCurrentConsent,
} from "../services/consent-service.js";

export async function getConsent(
  request: Request,
  response: Response<ApiSuccess<ConsentResponse>>,
) {
  const { userId } = getValidatedInput<UserIdParams>(request, "params");
  response.status(200).json({ data: await getCurrentConsent(userId) });
}

export async function putConsent(
  request: Request,
  response: Response<ApiSuccess<ConsentResponse>>,
) {
  const { userId } = getValidatedInput<UserIdParams>(request, "params");
  const input = getValidatedInput<PutConsentRequest>(request, "body");
  response.status(200).json({ data: await putCurrentConsent(userId, input) });
}
