import type { ApiSuccess, UserProfileResponse } from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type { UserIdParams } from "../schemas/demo-schemas.js";
import { getUserProfile } from "../services/user-service.js";

export async function getProfile(
  request: Request,
  response: Response<ApiSuccess<UserProfileResponse>>,
) {
  const { userId } = getValidatedInput<UserIdParams>(request, "params");
  response.status(200).json({ data: await getUserProfile(userId) });
}
