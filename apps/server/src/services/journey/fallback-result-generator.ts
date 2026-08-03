import type { JourneyProductRecord } from "../../repositories/journey-repository.js";

type SelectedProduct = JourneyProductRecord & {
  stepNumber: number;
  zoneId: string;
};

export type FallbackResultData = {
  signatureName: string;
  signatureStory: string;
  finalLookSummary: string;
  staffSummary: string;
  sceneKey: string | null;
  items: Array<{
    productId: string;
    category: JourneyProductRecord["category"];
    selectionOrder: number;
    recommendationReason: string;
    personaLayerUrl: string | null;
  }>;
};

function verifiedTags(product: JourneyProductRecord) {
  return product.tags.filter((tag) => tag.verified);
}

function dominantDescriptor(products: SelectedProduct[]) {
  const totals = new Map<string, number>();
  for (const product of products) {
    for (const tag of verifiedTags(product)) {
      if (tag.type === "STYLE" || tag.type === "MOOD") {
        totals.set(tag.name, (totals.get(tag.name) ?? 0) + tag.score);
      }
    }
  }
  const dominant = [...totals.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"),
  )[0]?.[0];
  return dominant ?? products.find((product) => product.category === "BAG")?.color ?? "Signature";
}

function productReason(product: JourneyProductRecord) {
  const bestTag = verifiedTags(product).sort(
    (left, right) => right.score - left.score || left.name.localeCompare(right.name, "en"),
  )[0];
  const descriptor = bestTag?.name ?? product.category;
  return `${product.name}은(는) ${product.color}과 ${descriptor} 특성으로 전체 선택을 연결합니다.`;
}

export function generateFallbackResult(input: {
  startAnswerLabel: string;
  products: SelectedProduct[];
  decisionCounts: { selected: number; rejected: number; deselected: number };
}): FallbackResultData {
  const products = [...input.products].sort((left, right) => left.stepNumber - right.stepNumber);
  const names = products.map((product) => product.name);
  const bag = products.find((product) => product.category === "BAG");
  if (!bag) throw new Error("BAG_SELECTION_MISSING");
  const additionalNames = products.filter((product) => product.id !== bag.id).map((product) => product.name);
  const descriptor = dominantDescriptor(products);
  const sceneKey = [...products]
    .reverse()
    .find((product) => product.sceneBackgroundKey !== null)?.sceneBackgroundKey ?? null;

  return {
    signatureName: `MCM ${descriptor} Journey`,
    signatureStory:
      `"${input.startAnswerLabel}"에서 시작한 여정은 ${names.join(", ")}의 선택으로 이어졌습니다.\n` +
      "각 선택이 고객의 기존 취향과 새로운 시도를 연결해 하나의 스타일 흐름을 완성했습니다.",
    finalLookSummary: `${bag.name}을 중심으로 ${additionalNames.join(", ")}을 연결한 MCM 룩입니다.`,
    staffSummary:
      `오늘의 방향은 "${input.startAnswerLabel}"입니다. 최종 선택 제품은 ${names.join(", ")}입니다.\n` +
      `고객은 선택을 ${input.decisionCounts.selected}회 확정했고 ${input.decisionCounts.rejected}개 제품을 제외했으며 ${input.decisionCounts.deselected}회 선택을 변경했습니다.`,
    sceneKey,
    items: products.map((product, index) => ({
      productId: product.id,
      category: product.category,
      selectionOrder: index + 1,
      recommendationReason: productReason(product),
      personaLayerUrl: product.personaLayerUrl,
    })),
  };
}
