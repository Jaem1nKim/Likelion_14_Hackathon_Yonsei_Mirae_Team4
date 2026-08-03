import type { ConsentView } from "@mcm/shared";

import type { ConsentRecord } from "../repositories/consent-repository.js";

export function mapConsent(consent: ConsentRecord): ConsentView {
  return {
    id: consent.id,
    userId: consent.userId,
    consentVersion: consent.consentVersion,
    behaviorDataAllowed: consent.behaviorDataAllowed,
    journeyDataAllowed: consent.journeyDataAllowed,
    marketingAllowed: false,
    agreedAt: consent.agreedAt.toISOString(),
    withdrawnAt: null,
  };
}
