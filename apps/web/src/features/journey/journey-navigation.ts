import { resolveJourneyScreen, type JourneyAggregate } from "@mcm/shared";

export type ActiveJourneyView = "select" | "route" | "progress" | "decision";

export function journeyPathForAggregate(
  aggregate: JourneyAggregate,
  activeView: ActiveJourneyView = "select",
) {
  const screen = resolveJourneyScreen(aggregate);
  const id = encodeURIComponent(aggregate.journey.id);

  if (screen === "INTRO") {
    return `/journey/${id}/intro`;
  }
  if (screen === "RESULT") {
    return `/journey/${id}/result`;
  }
  return `/journey/${id}/${activeView}`;
}
