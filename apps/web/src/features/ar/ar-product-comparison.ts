import type {
  CustomerJourneyResultView,
  JourneyAggregate,
  ProductView,
} from "@mcm/shared";

export const AR_COMPARISON_CATEGORIES = ["BAG", "APPAREL", "ACCESSORY"] as const;

export type ArComparisonCategory = typeof AR_COMPARISON_CATEGORIES[number];

export type ArComparisonOption = {
  product: ProductView;
  rank: number;
  isAiPick: boolean;
};

export type ArComparisonOptions = Record<ArComparisonCategory, ArComparisonOption[]>;
export type ArPreviewSelection = Record<ArComparisonCategory, string | null>;

function originalProduct(
  result: CustomerJourneyResultView,
  category: ArComparisonCategory,
) {
  return result.items
    .slice()
    .sort((left, right) => left.selectionOrder - right.selectionOrder)
    .find((item) => item.category === category)?.product ?? null;
}

export function createOriginalArSelection(
  result: CustomerJourneyResultView,
): ArPreviewSelection {
  return {
    BAG: originalProduct(result, "BAG")?.id ?? null,
    APPAREL: originalProduct(result, "APPAREL")?.id ?? null,
    ACCESSORY: originalProduct(result, "ACCESSORY")?.id ?? null,
  };
}

export function buildArComparisonOptions(
  aggregate: JourneyAggregate,
  result: CustomerJourneyResultView,
): ArComparisonOptions {
  return Object.fromEntries(AR_COMPARISON_CATEGORIES.map((category) => {
    const step = aggregate.completedSteps.find((candidate) => candidate.stage === category);
    const original = originalProduct(result, category);
    const rankedProducts = (step?.recommendations ?? [])
      .slice()
      .sort((left, right) => left.rank - right.rank)
      .map((recommendation) => ({
        product: recommendation.product,
        rank: recommendation.rank,
      }));

    const unique = new Map<string, { product: ProductView; rank: number }>();
    if (original) unique.set(original.id, { product: original, rank: 0 });
    for (const candidate of rankedProducts) {
      if (!unique.has(candidate.product.id)) unique.set(candidate.product.id, candidate);
    }

    const options = [...unique.values()]
      .slice(0, 3)
      .map((candidate) => ({
        ...candidate,
        isAiPick: candidate.product.id === original?.id && step?.usedFallback === false,
      }));

    return [category, options];
  })) as ArComparisonOptions;
}

export function resolveArPreviewProduct(
  options: ArComparisonOptions,
  selection: ArPreviewSelection,
  category: ArComparisonCategory,
) {
  return options[category].find((option) => option.product.id === selection[category])?.product
    ?? options[category][0]?.product
    ?? null;
}

export function isOriginalArSelection(
  current: ArPreviewSelection,
  original: ArPreviewSelection,
) {
  return AR_COMPARISON_CATEGORIES.every((category) => current[category] === original[category]);
}
