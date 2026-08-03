import type { CustomerJourneyResultView } from "@mcm/shared";

import type { JourneyAggregateRecord } from "../repositories/journey-repository.js";
import { mapJourneyProduct } from "./journey-step-mapper.js";

export function mapJourneyResult(
  result: NonNullable<JourneyAggregateRecord["result"]>,
): CustomerJourneyResultView {
  return {
    id: result.id,
    journeyId: result.journeyId,
    signatureName: result.signatureName,
    signatureStory: result.signatureStory,
    finalLookSummary: result.finalLookSummary,
    personaBaseKey: result.personaBaseKey,
    sceneKey: result.sceneKey,
    shareToken: result.shareToken,
    usedFallback: result.usedFallback,
    items: result.items.map((item) => ({
      id: item.id,
      product: mapJourneyProduct(item.product),
      category: item.category,
      selectionOrder: item.selectionOrder,
      recommendationReason: item.recommendationReason,
      personaLayerUrl: item.personaLayerUrl,
    })),
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}
