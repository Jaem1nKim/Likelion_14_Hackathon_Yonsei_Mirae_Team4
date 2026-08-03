import type { JourneyStepView, ProductView, StoreZoneView } from "@mcm/shared";

import type { JourneyAggregateRecord } from "../repositories/journey-repository.js";

type StepRecord = JourneyAggregateRecord["steps"][number];

function mapProduct(product: StepRecord["recommendations"][number]["product"]): ProductView {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    color: product.color,
    material: product.material,
    priceKrw: product.priceKrw,
    size: product.size,
    capacity: product.capacity,
    wearMethod: product.wearMethod,
    description: product.description,
    imageUrl: product.imageUrl,
    personaLayerUrl: product.personaLayerUrl,
    sceneBackgroundKey: product.sceneBackgroundKey,
    tags: product.tags.map((tag) => ({ ...tag })),
  };
}

function mapZone(zone: StepRecord["zone"]): StoreZoneView {
  return {
    id: zone.id,
    storeId: zone.storeId,
    code: zone.code,
    name: zone.name,
    category: zone.category,
    floor: zone.floor,
    directionText: zone.directionText,
    heritageTitle: zone.heritageTitle,
    heritageStory: zone.heritageStory,
    displayOrder: zone.displayOrder,
  };
}

export function mapJourneyStep(step: StepRecord): JourneyStepView {
  return {
    id: step.id,
    journeyId: step.journeyId,
    stepNumber: step.stepNumber,
    stage: step.stage,
    status: step.status,
    scenarioTitle: step.scenarioTitle,
    scenarioText: step.scenarioText,
    zone: mapZone(step.zone),
    heritageTitle: step.heritageTitle,
    heritageText: step.heritageText,
    selectedProduct: step.selectedProduct ? mapProduct(step.selectedProduct) : null,
    canFinishJourney: step.canFinishJourney,
    usedFallback: step.usedFallback,
    recommendations: step.recommendations.map((recommendation) => ({
      id: recommendation.id,
      type: recommendation.type,
      rank: recommendation.rank,
      ruleScore: recommendation.ruleScore,
      reason: recommendation.reason,
      isAiSelected: recommendation.isAiSelected,
      product: mapProduct(recommendation.product),
    })),
    createdAt: step.createdAt.toISOString(),
    completedAt: step.completedAt?.toISOString() ?? null,
  };
}

export { mapProduct as mapJourneyProduct };
