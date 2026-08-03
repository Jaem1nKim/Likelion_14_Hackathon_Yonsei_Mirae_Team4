import type { JourneyAggregate } from "./journey-types.js";

export type JourneyScreen =
  | "INTRO"
  | "BAG_SELECTION"
  | "APPAREL_SELECTION"
  | "ACCESSORY_SELECTION"
  | "RESULT";

function invalidAggregate(): never {
  throw new Error("INVALID_JOURNEY_AGGREGATE");
}

export function resolveJourneyScreen(
  aggregate: JourneyAggregate,
): JourneyScreen {
  const { journey, currentStep, result } = aggregate;

  if (
    journey.status === "READY" &&
    journey.currentStage === "INTRO" &&
    journey.currentStepNumber === 0 &&
    currentStep === null &&
    result === null
  ) {
    return "INTRO";
  }

  if (journey.status === "ACTIVE" && currentStep && result === null) {
    if (
      currentStep.stepNumber !== journey.currentStepNumber ||
      currentStep.stage !== journey.currentStage ||
      currentStep.status !== "IN_PROGRESS"
    ) {
      invalidAggregate();
    }

    if (journey.currentStage === "BAG") return "BAG_SELECTION";
    if (journey.currentStage === "APPAREL") return "APPAREL_SELECTION";
    if (journey.currentStage === "ACCESSORY") {
      return "ACCESSORY_SELECTION";
    }
  }

  if (
    journey.status === "FINISHED" &&
    journey.currentStage === "RESULT" &&
    currentStep === null &&
    result !== null
  ) {
    return "RESULT";
  }

  return invalidAggregate();
}
