import type { DemoUser, UserRole } from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { mapDemoUser } from "../mappers/user-mapper.js";
import {
  findActiveDemoUserById,
  findActiveUsers,
} from "../repositories/user-repository.js";

export async function listDemoUsers(role?: UserRole): Promise<DemoUser[]> {
  const users = await findActiveUsers(role);
  return users.map(mapDemoUser);
}

export async function loginDemoUser(userId: string): Promise<DemoUser> {
  const user = await findActiveDemoUserById(userId);
  if (!user) {
    throw new AppError(
      401,
      "DEMO_USER_NOT_FOUND",
      "The demo user does not exist or is inactive.",
    );
  }

  return mapDemoUser(user);
}
