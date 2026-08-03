import type { ApiSuccess, DemoUser } from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type {
  DemoLoginBody,
  DemoUsersQuery,
} from "../schemas/demo-schemas.js";
import { listDemoUsers, loginDemoUser } from "../services/demo-service.js";

export async function getDemoUsers(
  request: Request,
  response: Response<ApiSuccess<DemoUser[]>>,
) {
  const { role } = getValidatedInput<DemoUsersQuery>(request, "query");
  response.status(200).json({ data: await listDemoUsers(role) });
}

export async function postDemoLogin(
  request: Request,
  response: Response<ApiSuccess<DemoUser>>,
) {
  const { userId } = getValidatedInput<DemoLoginBody>(request, "body");
  response.status(200).json({ data: await loginDemoUser(userId) });
}
