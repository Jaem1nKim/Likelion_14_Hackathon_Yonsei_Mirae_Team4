import type { UserProfileResponse } from "@mcm/shared";

import { AppError } from "../errors/app-error.js";
import { mapUserProfile } from "../mappers/user-mapper.js";
import { findActiveCustomerProfileById } from "../repositories/user-repository.js";

export async function getUserProfile(
  userId: string,
): Promise<UserProfileResponse> {
  const user = await findActiveCustomerProfileById(userId);
  if (!user?.tasteProfile) {
    throw new AppError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested taste profile was not found.",
    );
  }

  return mapUserProfile({ ...user, tasteProfile: user.tasteProfile });
}
