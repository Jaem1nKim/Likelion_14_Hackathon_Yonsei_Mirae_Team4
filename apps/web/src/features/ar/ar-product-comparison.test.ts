import { describe, expect, it } from "vitest";

import { journeyAggregate, journeyResult } from "../../tests/fixtures";
import {
  buildArComparisonOptions,
  createOriginalArSelection,
  isOriginalArSelection,
  resolveArPreviewProduct,
} from "./ar-product-comparison";

describe("AR product comparison", () => {
  it("uses the stored step recommendations in rank order and limits each category to three", () => {
    const aggregate = journeyAggregate("FINISHED");
    const options = buildArComparisonOptions(aggregate, journeyResult);

    expect(options.BAG).toHaveLength(3);
    expect(options.APPAREL).toHaveLength(3);
    expect(options.ACCESSORY).toHaveLength(3);
    expect(options.BAG.map((option) => option.product.sku)).toEqual([
      "DEMO-BAG-001",
      "DEMO-BAG-002",
      "DEMO-BAG-003",
    ]);
  });

  it("marks the stored final product as AI Pick only for an AI-generated step", () => {
    const aggregate = journeyAggregate("FINISHED");
    aggregate.completedSteps = aggregate.completedSteps.map((step) => ({
      ...step,
      usedFallback: step.stage === "BAG" ? false : step.usedFallback,
    }));

    const options = buildArComparisonOptions(aggregate, journeyResult);

    expect(options.BAG.find((option) => option.product.id === journeyResult.items[0]?.product.id))
      .toMatchObject({ isAiPick: true });
    expect(options.APPAREL.some((option) => option.isAiPick)).toBe(false);
  });

  it("resolves temporary previews without mutating the stored original selection", () => {
    const aggregate = journeyAggregate("FINISHED");
    const options = buildArComparisonOptions(aggregate, journeyResult);
    const original = createOriginalArSelection(journeyResult);
    const preview = { ...original, BAG: options.BAG[1]!.product.id };

    expect(resolveArPreviewProduct(options, preview, "BAG")?.id).toBe(options.BAG[1]!.product.id);
    expect(original.BAG).toBe(journeyResult.items[0]!.product.id);
    expect(isOriginalArSelection(preview, original)).toBe(false);
    expect(isOriginalArSelection(original, original)).toBe(true);
  });
});
