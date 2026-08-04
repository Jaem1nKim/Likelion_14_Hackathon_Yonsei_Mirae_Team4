import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export const journeyProductSelect = {
  id: true,
  sku: true,
  name: true,
  category: true,
  color: true,
  material: true,
  priceKrw: true,
  size: true,
  capacity: true,
  wearMethod: true,
  description: true,
  imageUrl: true,
  personaLayerUrl: true,
  sceneBackgroundKey: true,
  tags: {
    select: { type: true, name: true, score: true, verified: true },
    orderBy: [{ type: "asc" }, { score: "desc" }, { name: "asc" }],
  },
} satisfies Prisma.ProductSelect;

export const journeyZoneSelect = {
  id: true,
  storeId: true,
  code: true,
  name: true,
  category: true,
  floor: true,
  directionText: true,
  heritageTitle: true,
  heritageStory: true,
  displayOrder: true,
} satisfies Prisma.StoreZoneSelect;

const reservationViewSelectForJourney = {
  id: true,
  userId: true,
  reservedAt: true,
  startQuestionCode: true,
  startAnswerCode: true,
  startAnswerLabel: true,
  status: true,
  checkedInAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  store: {
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      description: true,
      imageUrl: true,
      isJourneyEnabled: true,
    },
  },
} satisfies Prisma.ReservationSelect;

export const journeyAggregateSelect = {
  id: true,
  userId: true,
  reservationId: true,
  storeId: true,
  status: true,
  currentStage: true,
  currentStepNumber: true,
  startedAt: true,
  finishedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  reservation: { select: reservationViewSelectForJourney },
  profileSnapshot: {
    select: {
      longTermTasteSummary: true,
      todayIntentSummary: true,
      practicalityScore: true,
      expressionScore: true,
      noveltyScore: true,
      preferencesJson: true,
    },
  },
  steps: {
    orderBy: [{ stepNumber: "asc" }],
    select: {
      id: true,
      journeyId: true,
      stepNumber: true,
      stage: true,
      status: true,
      scenarioTitle: true,
      scenarioText: true,
      heritageTitle: true,
      heritageText: true,
      canFinishJourney: true,
      usedFallback: true,
      createdAt: true,
      completedAt: true,
      zone: { select: journeyZoneSelect },
      selectedProduct: { select: journeyProductSelect },
      recommendations: {
        orderBy: [{ rank: "asc" }],
        select: {
          id: true,
          type: true,
          rank: true,
          ruleScore: true,
          reason: true,
          isAiSelected: true,
          product: { select: journeyProductSelect },
        },
      },
    },
  },
  interactions: {
    orderBy: [{ sequence: "asc" }],
    select: {
      id: true,
      journeyStepId: true,
      productId: true,
      type: true,
      sequence: true,
      createdAt: true,
    },
  },
  result: {
    select: {
      id: true,
      journeyId: true,
      signatureName: true,
      signatureStory: true,
      finalLookSummary: true,
      personaBaseKey: true,
      sceneKey: true,
      shareToken: true,
      usedFallback: true,
      createdAt: true,
      updatedAt: true,
      items: {
        orderBy: [{ selectionOrder: "asc" }],
        select: {
          id: true,
          category: true,
          selectionOrder: true,
          recommendationReason: true,
          personaLayerUrl: true,
          product: { select: journeyProductSelect },
        },
      },
    },
  },
} satisfies Prisma.JourneySelect;

export function findJourneyByReservationInTransaction(
  transaction: Prisma.TransactionClient,
  reservationId: string,
) {
  return transaction.journey.findUnique({
    where: { reservationId },
    select: { id: true, status: true },
  });
}

export function createReadyJourneyInTransaction(
  transaction: Prisma.TransactionClient,
  data: { userId: string; reservationId: string; storeId: string },
) {
  return transaction.journey.create({
    data: {
      ...data,
      status: "READY",
      currentStage: "INTRO",
      currentStepNumber: 0,
      startedAt: null,
    },
    select: { id: true, status: true },
  });
}

export function findJourneyAggregate(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: journeyAggregateSelect,
  });
}

export function findJourneyStartPlan(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      storeId: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
      profileSnapshot: {
        select: {
          longTermTasteSummary: true,
          todayIntentSummary: true,
          practicalityScore: true,
          expressionScore: true,
          noveltyScore: true,
          preferencesJson: true,
          behaviorSummaryJson: true,
        },
      },
      reservation: {
        select: {
          startQuestionCode: true,
          startAnswerCode: true,
          startAnswerLabel: true,
        },
      },
      store: { select: { isActive: true, isJourneyEnabled: true } },
      user: {
        select: {
          isActive: true,
          tasteProfile: {
            select: {
              summary: true,
              practicalityScore: true,
              expressionScore: true,
              noveltyScore: true,
              preferences: {
                orderBy: [{ type: "asc" }, { score: "desc" }, { value: "asc" }],
                select: { type: true, value: true, score: true },
              },
            },
          },
          consents: {
            where: { withdrawnAt: null },
            orderBy: [{ agreedAt: "desc" }, { id: "desc" }],
            take: 1,
            select: { behaviorDataAllowed: true, journeyDataAllowed: true },
          },
          onlineBehaviors: {
            orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
            select: { eventType: true, productId: true, selectedColor: true },
          },
        },
      },
    },
  });
}

export function findJourneyTransitionPlan(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      storeId: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
      reservation: { select: { startAnswerLabel: true } },
      profileSnapshot: {
        select: {
          longTermTasteSummary: true,
          todayIntentSummary: true,
          practicalityScore: true,
          expressionScore: true,
          noveltyScore: true,
          preferencesJson: true,
          behaviorSummaryJson: true,
        },
      },
      steps: {
        orderBy: [{ stepNumber: "asc" }],
        select: {
          id: true,
          stepNumber: true,
          stage: true,
          status: true,
          zoneId: true,
          selectedProductId: true,
          selectedProduct: { select: journeyProductSelect },
        },
      },
      interactions: {
        where: { type: "REJECTED" },
        orderBy: [{ sequence: "asc" }],
        select: {
          productId: true,
          product: { select: { name: true } },
          journeyStep: { select: { stage: true } },
        },
      },
      result: { select: { id: true } },
    },
  });
}

export function findJourneyResultPlan(journeyId: string) {
  return prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      storeId: true,
      reservationId: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
      reservation: {
        select: {
          startQuestionCode: true,
          startAnswerCode: true,
          startAnswerLabel: true,
        },
      },
      profileSnapshot: {
        select: {
          longTermTasteSummary: true,
          todayIntentSummary: true,
          practicalityScore: true,
          expressionScore: true,
          noveltyScore: true,
          preferencesJson: true,
          behaviorSummaryJson: true,
        },
      },
      steps: {
        orderBy: [{ stepNumber: "asc" }],
        select: {
          id: true,
          stepNumber: true,
          stage: true,
          status: true,
          zoneId: true,
          selectedProductId: true,
          selectedProduct: { select: journeyProductSelect },
        },
      },
      interactions: {
        where: { type: { in: ["SELECTED", "REJECTED", "DESELECTED"] } },
        orderBy: [{ sequence: "asc" }],
        select: {
          sequence: true,
          productId: true,
          type: true,
          journeyStep: { select: { stepNumber: true, stage: true } },
        },
      },
      result: { select: { id: true } },
    },
  });
}

export function findJourneyForInteractionInTransaction(
  transaction: Prisma.TransactionClient,
  journeyId: string,
) {
  return transaction.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      storeId: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
      interactions: {
        orderBy: [{ sequence: "desc" }],
        take: 1,
        select: { sequence: true },
      },
      steps: {
        where: { status: "IN_PROGRESS" },
        take: 1,
        select: {
          id: true,
          stepNumber: true,
          stage: true,
          status: true,
          zoneId: true,
          selectedProductId: true,
        },
      },
    },
  });
}

export function findInteractionByIdInTransaction(
  transaction: Prisma.TransactionClient,
  interactionId: string,
) {
  return transaction.productInteraction.findUnique({
    where: { id: interactionId },
    select: {
      id: true,
      journeyId: true,
      journeyStepId: true,
      productId: true,
      type: true,
    },
  });
}

export function findInteractionById(interactionId: string) {
  return prisma.productInteraction.findUnique({
    where: { id: interactionId },
    select: {
      id: true,
      journeyId: true,
      journeyStepId: true,
      productId: true,
      type: true,
    },
  });
}

export function findJourneyMutationStateInTransaction(
  transaction: Prisma.TransactionClient,
  journeyId: string,
) {
  return transaction.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      userId: true,
      reservationId: true,
      storeId: true,
      status: true,
      currentStage: true,
      currentStepNumber: true,
      result: { select: { id: true } },
      steps: {
        orderBy: [{ stepNumber: "asc" }],
        select: {
          id: true,
          stepNumber: true,
          stage: true,
          status: true,
          zoneId: true,
          selectedProductId: true,
        },
      },
    },
  });
}

export function upsertSnapshotInTransaction(
  transaction: Prisma.TransactionClient,
  journeyId: string,
  data: {
    longTermTasteSummary: string;
    todayIntentSummary: string;
    practicalityScore: number;
    expressionScore: number;
    noveltyScore: number;
    preferencesJson: string;
    behaviorSummaryJson: string | null;
  },
) {
  return transaction.journeyProfileSnapshot.upsert({
    where: { journeyId },
    create: { journeyId, ...data },
    update: {},
    select: { id: true },
  });
}

export function createFallbackStepInTransaction(
  transaction: Prisma.TransactionClient,
  journeyId: string,
  data: {
    stage: "BAG" | "APPAREL" | "ACCESSORY";
    stepNumber: number;
    zoneId: string;
    scenarioTitle: string;
    scenarioText: string;
    heritageTitle: string | null;
    heritageText: string | null;
    canFinishJourney: boolean;
    usedFallback: boolean;
    isAiSelected: boolean;
    recommendations: Array<{
      productId: string;
      type: "MATCH" | "COMPARE" | "CHALLENGE";
      rank: number;
      ruleScore: number;
      reason: string;
    }>;
  },
) {
  return transaction.journeyStep.create({
    data: {
      journeyId,
      stepNumber: data.stepNumber,
      stage: data.stage,
      status: "IN_PROGRESS",
      scenarioTitle: data.scenarioTitle,
      scenarioText: data.scenarioText,
      zoneId: data.zoneId,
      heritageTitle: data.heritageTitle,
      heritageText: data.heritageText,
      canFinishJourney: data.canFinishJourney,
      usedFallback: data.usedFallback,
      recommendations: {
        create: data.recommendations.map((recommendation) => ({
          ...recommendation,
          isAiSelected: data.isAiSelected,
        })),
      },
    },
    select: { id: true },
  });
}

export function activateJourneyInTransaction(
  transaction: Prisma.TransactionClient,
  journeyId: string,
  startedAt: Date,
) {
  return transaction.journey.update({
    where: { id: journeyId },
    data: {
      status: "ACTIVE",
      currentStage: "BAG",
      currentStepNumber: 1,
      startedAt,
    },
    select: { id: true },
  });
}

export function completeStepInTransaction(
  transaction: Prisma.TransactionClient,
  stepId: string,
  completedAt: Date,
) {
  return transaction.journeyStep.update({
    where: { id: stepId },
    data: { status: "COMPLETED", completedAt },
    select: { id: true },
  });
}

export function advanceJourneyInTransaction(
  transaction: Prisma.TransactionClient,
  journeyId: string,
  stage: "APPAREL" | "ACCESSORY",
  stepNumber: number,
) {
  return transaction.journey.update({
    where: { id: journeyId },
    data: { currentStage: stage, currentStepNumber: stepNumber },
    select: { id: true },
  });
}

export function createInteractionInTransaction(
  transaction: Prisma.TransactionClient,
  data: {
    id?: string;
    journeyId: string;
    journeyStepId: string;
    productId: string;
    type: "VIEWED" | "COMPARED" | "SELECTED" | "REJECTED" | "DESELECTED";
    sequence: number;
  },
) {
  return transaction.productInteraction.create({ data, select: { id: true } });
}

export function updateStepSelectionInTransaction(
  transaction: Prisma.TransactionClient,
  stepId: string,
  selectedProductId: string | null,
) {
  return transaction.journeyStep.update({
    where: { id: stepId },
    data: { selectedProductId },
    select: { id: true },
  });
}

export function createJourneyResultInTransaction(
  transaction: Prisma.TransactionClient,
  data: {
    journeyId: string;
    signatureName: string;
    signatureStory: string;
    finalLookSummary: string;
    staffSummary: string;
    personaBaseKey: string | null;
    sceneKey: string | null;
    shareToken: string;
    usedFallback: boolean;
    items: Array<{
      productId: string;
      category: "BAG" | "APPAREL" | "SHOES" | "ACCESSORY";
      selectionOrder: number;
      recommendationReason: string;
      personaLayerUrl: string | null;
    }>;
  },
) {
  return transaction.journeyResult.create({
    data: {
      journeyId: data.journeyId,
      signatureName: data.signatureName,
      signatureStory: data.signatureStory,
      finalLookSummary: data.finalLookSummary,
      staffSummary: data.staffSummary,
      personaBaseKey: data.personaBaseKey,
      sceneKey: data.sceneKey,
      shareToken: data.shareToken,
      usedFallback: data.usedFallback,
      items: { create: data.items },
    },
    select: { id: true },
  });
}

export function finishJourneyInTransaction(
  transaction: Prisma.TransactionClient,
  input: {
    journeyId: string;
    reservationId: string;
    currentStepId: string;
    finishedAt: Date;
  },
) {
  return Promise.all([
    transaction.journeyStep.update({
      where: { id: input.currentStepId },
      data: { status: "COMPLETED", completedAt: input.finishedAt },
    }),
    transaction.journey.update({
      where: { id: input.journeyId },
      data: {
        status: "FINISHED",
        currentStage: "RESULT",
        finishedAt: input.finishedAt,
      },
    }),
    transaction.reservation.update({
      where: { id: input.reservationId },
      data: { status: "COMPLETED", completedAt: input.finishedAt },
    }),
  ]);
}

export type JourneyAggregateRecord = NonNullable<
  Awaited<ReturnType<typeof findJourneyAggregate>>
>;
export type JourneyProductRecord = Prisma.ProductGetPayload<{
  select: typeof journeyProductSelect;
}>;
export type JourneyStartPlan = NonNullable<
  Awaited<ReturnType<typeof findJourneyStartPlan>>
>;
export type JourneyTransitionPlan = NonNullable<
  Awaited<ReturnType<typeof findJourneyTransitionPlan>>
>;
export type JourneyResultPlan = NonNullable<
  Awaited<ReturnType<typeof findJourneyResultPlan>>
>;
