import { apiRequest } from "./api-client";
import { parseUserProfile } from "./parsers";

export function getUserProfile(userId: string, signal?: AbortSignal) {
  return apiRequest(
    `/users/${encodeURIComponent(userId)}/profile`,
    parseUserProfile,
    { signal },
  );
}
