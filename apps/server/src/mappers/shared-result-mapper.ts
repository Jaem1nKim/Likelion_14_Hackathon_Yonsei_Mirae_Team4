import type { SharedJourneyResultView } from "@mcm/shared";

import type { SharedResultRecord } from "../repositories/journey-result-repository.js";

export function mapSharedJourneyResult(
  result: SharedResultRecord,
): SharedJourneyResultView {
  return {
    signatureName: result.signatureName,
    signatureStory: result.signatureStory,
    finalLookSummary: result.finalLookSummary,
    sceneKey: result.sceneKey,
    items: result.items.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      category: item.category,
      color: item.product.color,
      imageUrl: item.product.imageUrl,
      recommendationReason: item.recommendationReason,
      personaLayerUrl: item.personaLayerUrl,
      selectionOrder: item.selectionOrder,
    })),
    createdAt: result.createdAt.toISOString(),
  };
}
