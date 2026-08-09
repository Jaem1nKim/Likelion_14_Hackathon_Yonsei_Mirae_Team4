import type { PutConsentRequest } from "@mcm/shared";

import { apiRequest } from "./api-client";
import { parseConsentResponse } from "./parsers";

export function getUserConsent(userId: string, signal?: AbortSignal) {
  return apiRequest(
    `/users/${encodeURIComponent(userId)}/consent`,
    parseConsentResponse,
    { signal },
  );
}

export function putUserConsent(userId: string, body: PutConsentRequest) {
  return apiRequest(
    `/users/${encodeURIComponent(userId)}/consent`,
    parseConsentResponse,
    { method: "PUT", body },
  );
}
