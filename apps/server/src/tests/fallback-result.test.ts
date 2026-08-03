import { describe, expect, it } from "vitest";

import type { JourneyProductRecord } from "../repositories/journey-repository.js";
import { generateFallbackResult } from "../services/journey/fallback-result-generator.js";

function product(
  id: string,
  category: JourneyProductRecord["category"],
  name: string,
  color: string,
  tags: JourneyProductRecord["tags"],
  sceneBackgroundKey: string | null = null,
) {
  return {
    id,
    sku: `SKU-${id}`,
    name,
    category,
    color,
    material: null,
    priceKrw: 100000,
    size: null,
    capacity: null,
    wearMethod: null,
    description: "Demo",
    imageUrl: "/demo.png",
    personaLayerUrl: null,
    sceneBackgroundKey,
    tags,
  } satisfies JourneyProductRecord;
}

const styleTag = (name: string, score: number, verified = true) => ({
  type: "STYLE" as const,
  name,
  score,
  verified,
});

function generate(products: Array<JourneyProductRecord & { stepNumber: number; zoneId: string }>) {
  return generateFallbackResult({
    startAnswerLabel: "새로운 균형",
    products,
    decisionCounts: { selected: 3, rejected: 2, deselected: 1 },
  });
}

describe("fallback result generator", () => {
  it("sums verified STYLE tag scores to choose the dominant descriptor", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Black", [styleTag("URBAN", 50)]), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Black", [styleTag("URBAN", 50), styleTag("BOLD", 90)]), stepNumber: 2, zoneId: "z2" },
    ]);
    expect(result.signatureName).toBe("MCM URBAN Journey");
  });

  it("breaks equal dominant tag totals by tag name", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Black", [styleTag("URBAN", 90), styleTag("BOLD", 90)]), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Red", []), stepNumber: 2, zoneId: "z2" },
    ]);
    expect(result.signatureName).toBe("MCM BOLD Journey");
  });

  it("ignores unverified tags for the dominant descriptor", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Brown", [styleTag("BOLD", 100, false)]), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Black", []), stepNumber: 2, zoneId: "z2" },
    ]);
    expect(result.signatureName).toBe("MCM Brown Journey");
  });

  it("uses category and color when a product has no verified tag", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Brown", []), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Red", []), stepNumber: 2, zoneId: "z2" },
    ]);
    expect(result.items[1]?.recommendationReason).toContain("Red과 APPAREL");
  });

  it("takes sceneKey from the last selected product that has one", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Black", [], "bag-scene"), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Black", [], "apparel-scene"), stepNumber: 2, zoneId: "z2" },
      { ...product("3", "ACCESSORY", "Belt", "Black", []), stepNumber: 3, zoneId: "z3" },
    ]);
    expect(result.sceneKey).toBe("apparel-scene");
  });

  it("returns null sceneKey when all products omit it", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Black", []), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Black", []), stepNumber: 2, zoneId: "z2" },
    ]);
    expect(result.sceneKey).toBeNull();
  });

  it("orders result items by step number", () => {
    const result = generate([
      { ...product("2", "APPAREL", "Coat", "Black", []), stepNumber: 2, zoneId: "z2" },
      { ...product("1", "BAG", "Bag", "Black", []), stepNumber: 1, zoneId: "z1" },
    ]);
    expect(result.items.map((item) => item.productId)).toEqual(["1", "2"]);
    expect(result.items.map((item) => item.selectionOrder)).toEqual([1, 2]);
  });

  it("summarizes only decision counts and selected names for staff", () => {
    const result = generate([
      { ...product("1", "BAG", "Bag", "Black", []), stepNumber: 1, zoneId: "z1" },
      { ...product("2", "APPAREL", "Coat", "Black", []), stepNumber: 2, zoneId: "z2" },
    ]);
    expect(result.staffSummary).toContain("선택을 3회");
    expect(result.staffSummary).toContain("2개 제품을 제외");
    expect(result.staffSummary).toContain("1회 선택을 변경");
  });
});
