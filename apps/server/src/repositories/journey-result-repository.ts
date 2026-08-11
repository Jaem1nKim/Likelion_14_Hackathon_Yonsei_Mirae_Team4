import { prisma } from "../lib/prisma.js";
import { journeyResultSelect } from "./journey-repository.js";

export function findJourneyResultForCustomer(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      status: true,
      result: { select: journeyResultSelect },
    },
  });
}

export function findSharedJourneyResult(shareToken: string) {
  return prisma.journeyResult.findFirst({
    where: {
      shareToken,
      journey: { status: "FINISHED" },
    },
    select: journeyResultSelect,
  });
}

export type CustomerResultRecord = NonNullable<
  Awaited<ReturnType<typeof findJourneyResultForCustomer>>
>;
export type SharedResultRecord = NonNullable<
  Awaited<ReturnType<typeof findSharedJourneyResult>>
>;
