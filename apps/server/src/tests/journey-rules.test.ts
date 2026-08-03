import { describe, expect, it } from "vitest";

import type { CandidateProduct, TasteScoreInput } from "../types/journey.js";
import { scoreJourneyCandidates } from "../services/journey/candidate-engine.js";
import { generateFallbackStep } from "../services/journey/fallback-step-generator.js";

const taste: TasteScoreInput = {
  practicalityScore: 80,
  expressionScore: 90,
  noveltyScore: 85,
  preferences: [
    { type: "CATEGORY", value: "BAG", score: 95 },
    { type: "COLOR", value: "BLACK", score: 90 },
    { type: "STYLE", value: "CLASSIC", score: 90 },
    { type: "FUNCTION", value: "STORAGE", score: 80 },
  ],
};

function candidate(
  id: string,
  sku: string,
  color: string,
  style: string,
  zoneId = "zone-a",
): CandidateProduct {
  return {
    id,
    sku,
    name: `Demo ${sku}`,
    category: "BAG",
    color,
    material: "Coated Canvas",
    zoneId,
    zoneCode: "BAG",
    zoneName: "Bag Zone",
    zoneFloor: "1F",
    directionText: "Front",
    heritageTitle: "Heritage",
    heritageStory: "Stored heritage story",
    zoneDisplayOrder: 1,
    tags: [
      { type: "STYLE", name: style, score: 90, verified: true },
      { type: "FUNCTION", name: "STORAGE", score: 90, verified: true },
    ],
  };
}

const candidates = [
  candidate("p1", "SKU-001", "BLACK", "CLASSIC"),
  candidate("p2", "SKU-002", "RED", "BOLD"),
  candidate("p3", "SKU-003", "BROWN", "URBAN"),
];

describe("candidate engine", () => {
  it("reproduces scores and ordering for identical input", () => {
    expect(scoreJourneyCandidates(candidates, taste)).toEqual(
      scoreJourneyCandidates(candidates, taste),
    );
  });

  it("keeps every ruleScore in the 0..100 range", () => {
    for (const item of scoreJourneyCandidates(candidates, taste)) {
      expect(item.ruleScore).toBeGreaterThanOrEqual(0);
      expect(item.ruleScore).toBeLessThanOrEqual(100);
    }
  });

  it("marks the strongest taste match as MATCH", () => {
    const result = scoreJourneyCandidates(candidates, taste);
    expect(result[0]).toMatchObject({ id: "p1", type: "MATCH" });
  });

  it("uses one deterministic CHALLENGE for expressive taste", () => {
    const result = scoreJourneyCandidates(candidates, taste);
    expect(result.filter((item) => item.type === "CHALLENGE")).toHaveLength(1);
  });

  it("does not force a CHALLENGE for conservative taste", () => {
    const result = scoreJourneyCandidates(candidates, {
      ...taste,
      expressionScore: 20,
      noveltyScore: 20,
    });
    expect(result.some((item) => item.type === "CHALLENGE")).toBe(false);
  });

  it("normalizes case and separators before matching", () => {
    const normalizedTaste = {
      ...taste,
      preferences: [{ type: "COLOR" as const, value: " black ", score: 100 }],
    };
    expect(scoreJourneyCandidates(candidates, normalizedTaste)[0]?.id).toBe("p1");
  });
});

describe("fallback step generator", () => {
  it("selects at most three products without duplication", () => {
    const step = generateFallbackStep({
      stage: "BAG",
      stepNumber: 1,
      candidates: scoreJourneyCandidates(candidates, taste),
    });
    expect(step.recommendations).toHaveLength(3);
    expect(new Set(step.recommendations.map((item) => item.productId)).size).toBe(3);
  });

  it("keeps only candidates in the highest-ranked candidate zone", () => {
    const mixed = [...candidates, candidate("p4", "SKU-004", "BLACK", "CLASSIC", "zone-b")];
    const step = generateFallbackStep({
      stage: "BAG",
      stepNumber: 1,
      candidates: scoreJourneyCandidates(mixed, taste),
    });
    expect(step.recommendations.every((item) => item.productId !== "p4")).toBe(true);
  });

  it("uses the exact deterministic BAG copy and stored heritage", () => {
    const step = generateFallbackStep({
      stage: "BAG",
      stepNumber: 1,
      candidates: scoreJourneyCandidates(candidates, taste),
    });
    expect(step.scenarioTitle).toBe("여정의 중심을 선택해보세요");
    expect(step.scenarioText).toBe("오늘의 방향과 취향에 맞는 MCM 가방을 직접 비교해보세요.");
    expect(step.heritageText).toBe("Stored heritage story");
  });

  it("throws NO_ELIGIBLE_CANDIDATES for an empty candidate list", () => {
    expect(() =>
      generateFallbackStep({ stage: "BAG", stepNumber: 1, candidates: [] }),
    ).toThrowError(/No eligible products/);
  });
});
