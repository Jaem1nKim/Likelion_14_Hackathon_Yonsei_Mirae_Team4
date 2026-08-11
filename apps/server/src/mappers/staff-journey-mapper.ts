import type { StaffJourneyView } from "@mcm/shared";

import type { StaffJourneyRecord } from "../repositories/staff-repository.js";
import { mapJourneyAggregate } from "./journey-aggregate-mapper.js";
import { mapJourneyStep } from "./journey-step-mapper.js";

export function mapStaffJourney(record: StaffJourneyRecord): StaffJourneyView {
  const aggregate = mapJourneyAggregate(record);

  return {
    journey: aggregate.journey,
    reservation: aggregate.reservation,
    customer: {
      id: record.user.id,
      name: record.user.name,
      profileType: record.user.profileType,
    },
    profileSnapshot: aggregate.profileSnapshot,
    steps: record.steps.map(mapJourneyStep),
    interactions: aggregate.interactions,
    result:
      aggregate.result && record.result
        ? {
            ...aggregate.result,
            staffSummary: record.result.staffSummary,
          }
        : null,
  };
}
