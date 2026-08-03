import { JOURNEY_STEP_COPY } from "../../constants/journey.js";
import { AppError } from "../../errors/app-error.js";
import type { FallbackStepData, ScoredCandidate } from "../../types/journey.js";

export function generateFallbackStep(input: {
  stage: FallbackStepData["stage"];
  stepNumber: number;
  candidates: ScoredCandidate[];
}): FallbackStepData {
  const best = input.candidates[0];
  if (!best) {
    throw new AppError(
      409,
      "NO_ELIGIBLE_CANDIDATES",
      "No eligible products are available for the next Journey step.",
    );
  }

  const recommendations = input.candidates
    .filter((candidate) => candidate.zoneId === best.zoneId)
    .slice(0, 3)
    .map((candidate, index) => ({
      productId: candidate.id,
      type: candidate.type,
      rank: index + 1,
      ruleScore: candidate.ruleScore,
      reason: candidate.reason,
    }));
  const copy = JOURNEY_STEP_COPY[input.stage];

  return {
    stage: input.stage,
    stepNumber: input.stepNumber,
    zoneId: best.zoneId,
    scenarioTitle: copy.scenarioTitle,
    scenarioText: copy.scenarioText,
    heritageTitle: best.heritageTitle,
    heritageText: best.heritageStory,
    canFinishJourney: copy.canFinishJourney,
    recommendations,
  };
}
