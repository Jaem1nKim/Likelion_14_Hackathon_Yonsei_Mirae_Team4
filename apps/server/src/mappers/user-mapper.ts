import type { DemoUser, UserProfileResponse } from "@mcm/shared";

import type {
  DemoUserRecord,
  UserProfileRecord,
} from "../repositories/user-repository.js";

export function mapDemoUser(user: NonNullable<DemoUserRecord>): DemoUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profileType: user.profileType,
    avatarUrl: user.avatarUrl,
  };
}

export function mapUserProfile(
  user: UserProfileRecord & { tasteProfile: NonNullable<UserProfileRecord["tasteProfile"]> },
): UserProfileResponse {
  const profile = user.tasteProfile;

  return {
    user: mapDemoUser(user),
    tasteProfile: {
      id: profile.id,
      userId: profile.userId,
      summary: profile.summary,
      practicalityScore: profile.practicalityScore,
      expressionScore: profile.expressionScore,
      noveltyScore: profile.noveltyScore,
      confidenceScore: profile.confidenceScore,
      calculatedAt: profile.calculatedAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      preferences: profile.preferences.map((preference) => ({
        type: preference.type,
        value: preference.value,
        score: preference.score,
        source: preference.source,
      })),
    },
  };
}
