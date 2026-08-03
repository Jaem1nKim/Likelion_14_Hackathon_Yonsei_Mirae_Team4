import { AppError } from "../errors/app-error.js";
import type { JourneyAggregateRecord } from "../repositories/journey-repository.js";

const STAGE_SEQUENCE = ["BAG", "APPAREL", "ACCESSORY"] as const;

function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred.",
      null,
      `JOURNEY_INVARIANT_${code}`,
    );
  }
}

function isStrictlyAscending<T>(
  items: T[],
  value: (item: T) => number,
) {
  return items.every(
    (item, index) => index === 0 || value(items[index - 1]!) < value(item),
  );
}

function validateCommon(record: JourneyAggregateRecord) {
  invariant(record.reservation.id === record.reservationId, "RESERVATION_ID");
  invariant(record.reservation.userId === record.userId, "USER_RELATION");
  invariant(record.reservation.store.id === record.storeId, "STORE_RELATION");
  invariant(
    isStrictlyAscending(record.steps, (step) => step.stepNumber),
    "STEP_ORDER",
  );
  invariant(
    isStrictlyAscending(record.interactions, (item) => item.sequence),
    "INTERACTION_ORDER",
  );
  invariant(
    record.interactions.every((item, index) => item.sequence === index + 1),
    "INTERACTION_SEQUENCE",
  );

  const stepIds = new Set(record.steps.map((step) => step.id));
  for (const step of record.steps) {
    invariant(step.journeyId === record.id, "STEP_JOURNEY");
    invariant(step.zone.storeId === record.storeId, "STEP_ZONE_STORE");
    invariant(step.zone.category === step.stage, "STEP_ZONE_CATEGORY");
    invariant(step.recommendations.length > 0, "RECOMMENDATIONS_EMPTY");
    invariant(
      isStrictlyAscending(step.recommendations, (item) => item.rank),
      "RECOMMENDATION_ORDER",
    );
    invariant(
      step.recommendations.every((item, index) => item.rank === index + 1),
      "RECOMMENDATION_RANK",
    );
    invariant(
      step.recommendations.every(
        (item) => item.product.category === step.stage,
      ),
      "RECOMMENDATION_CATEGORY",
    );
    invariant(
      step.selectedProduct === null ||
        step.selectedProduct.category === step.stage,
      "SELECTED_PRODUCT_CATEGORY",
    );
  }
  invariant(
    record.interactions.every((item) => stepIds.has(item.journeyStepId)),
    "INTERACTION_STEP",
  );

  if (record.result) {
    invariant(record.result.journeyId === record.id, "RESULT_JOURNEY");
    invariant(
      record.result.items.every(
        (item, index) => item.selectionOrder === index + 1,
      ),
      "RESULT_ITEM_ORDER",
    );
    invariant(
      record.result.items.every(
        (item) => item.category === item.product.category,
      ),
      "RESULT_ITEM_CATEGORY",
    );
  }
}

function validateReady(record: JourneyAggregateRecord) {
  invariant(record.currentStage === "INTRO", "READY_STAGE");
  invariant(record.currentStepNumber === 0, "READY_STEP_NUMBER");
  invariant(record.startedAt === null, "READY_STARTED_AT");
  invariant(record.finishedAt === null, "READY_FINISHED_AT");
  invariant(record.profileSnapshot === null, "READY_SNAPSHOT");
  invariant(record.steps.length === 0, "READY_STEPS");
  invariant(record.interactions.length === 0, "READY_INTERACTIONS");
  invariant(record.result === null, "READY_RESULT");
  invariant(record.reservation.status === "CHECKED_IN", "READY_RESERVATION");
}

function validateActive(record: JourneyAggregateRecord) {
  const expectedStage = STAGE_SEQUENCE[record.currentStepNumber - 1];
  invariant(expectedStage !== undefined, "ACTIVE_STEP_NUMBER");
  invariant(record.currentStage === expectedStage, "ACTIVE_STAGE");
  invariant(record.startedAt !== null, "ACTIVE_STARTED_AT");
  invariant(record.finishedAt === null, "ACTIVE_FINISHED_AT");
  invariant(record.profileSnapshot !== null, "ACTIVE_SNAPSHOT");
  invariant(record.result === null, "ACTIVE_RESULT");
  invariant(record.reservation.status === "CHECKED_IN", "ACTIVE_RESERVATION");
  invariant(
    record.steps.length === record.currentStepNumber,
    "ACTIVE_STEP_COUNT",
  );

  for (let index = 0; index < record.steps.length; index += 1) {
    const step = record.steps[index]!;
    invariant(step.stepNumber === index + 1, "ACTIVE_STEP_SEQUENCE");
    invariant(step.stage === STAGE_SEQUENCE[index], "ACTIVE_STEP_STAGE");
    if (index === record.steps.length - 1) {
      invariant(step.status === "IN_PROGRESS", "ACTIVE_CURRENT_STATUS");
      invariant(step.completedAt === null, "ACTIVE_CURRENT_COMPLETED_AT");
    } else {
      invariant(step.status === "COMPLETED", "ACTIVE_PREVIOUS_STATUS");
      invariant(step.completedAt !== null, "ACTIVE_PREVIOUS_COMPLETED_AT");
      invariant(step.selectedProduct !== null, "ACTIVE_PREVIOUS_SELECTION");
    }
  }
  invariant(
    record.steps.filter((step) => step.status === "IN_PROGRESS").length === 1,
    "ACTIVE_CURRENT_COUNT",
  );
}

function validateFinished(record: JourneyAggregateRecord) {
  invariant(record.currentStage === "RESULT", "FINISHED_STAGE");
  invariant(record.currentStepNumber === record.steps.length, "FINISHED_POINTER");
  invariant(record.steps.length === 2 || record.steps.length === 3, "FINISHED_STEP_COUNT");
  invariant(record.profileSnapshot !== null, "FINISHED_SNAPSHOT");
  invariant(record.startedAt !== null, "FINISHED_STARTED_AT");
  invariant(record.finishedAt !== null, "FINISHED_FINISHED_AT");
  invariant(record.result !== null, "FINISHED_RESULT");
  invariant(record.reservation.status === "COMPLETED", "FINISHED_RESERVATION");
  invariant(record.reservation.completedAt !== null, "FINISHED_RESERVATION_AT");

  for (let index = 0; index < record.steps.length; index += 1) {
    const step = record.steps[index]!;
    invariant(step.stepNumber === index + 1, "FINISHED_STEP_SEQUENCE");
    invariant(step.stage === STAGE_SEQUENCE[index], "FINISHED_STEP_STAGE");
    invariant(step.status === "COMPLETED", "FINISHED_STEP_STATUS");
    invariant(step.completedAt !== null, "FINISHED_STEP_COMPLETED_AT");
    invariant(step.selectedProduct !== null, "FINISHED_STEP_SELECTION");
  }
  invariant(
    record.result!.items.length === record.steps.length,
    "FINISHED_RESULT_ITEM_COUNT",
  );
  invariant(
    record.result!.items.every(
      (item, index) => item.product.id === record.steps[index]!.selectedProduct!.id,
    ),
    "FINISHED_RESULT_SELECTION",
  );
}

function validateCancelled(record: JourneyAggregateRecord) {
  invariant(record.cancelledAt !== null, "CANCELLED_AT");
  invariant(record.result === null, "CANCELLED_RESULT");
  invariant(
    record.steps.every(
      (step) => step.status === "COMPLETED" || step.status === "SKIPPED",
    ),
    "CANCELLED_STEP_STATUS",
  );
}

export function validateJourneyAggregateRecord(
  record: JourneyAggregateRecord,
) {
  validateCommon(record);

  if (record.status === "READY") validateReady(record);
  else if (record.status === "ACTIVE") validateActive(record);
  else if (record.status === "FINISHED") validateFinished(record);
  else validateCancelled(record);
}
