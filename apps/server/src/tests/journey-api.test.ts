import {
  DEMO_USER_HEADER_NAME,
  IDEMPOTENCY_KEY_HEADER_NAME,
  type JourneyAggregate,
  type ReservationView,
} from "@mcm/shared";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { disconnectPrisma, prisma } from "../lib/prisma.js";

const STABLE_USER_ID = "10000000-0000-4000-8000-000000000001";
const BOLD_USER_ID = "10000000-0000-4000-8000-000000000002";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const BAG_ZONE_ID = "30000000-0000-4000-8000-000000000001";
const APPAREL_ZONE_ID = "30000000-0000-4000-8000-000000000002";
const ACCESSORY_ZONE_ID = "30000000-0000-4000-8000-000000000004";
const SHOES_PRODUCT_ID = "40000000-0000-4000-8000-000000000099";
const RESERVATION_PREFIX = "60000000-";

const app = createApp();
const api = request(app);
let sequence = 1;

function nextUuid() {
  const suffix = String(sequence++).padStart(12, "0");
  return `60000000-0000-4000-8000-${suffix}`;
}

function dataAs<T>(body: unknown) {
  return (body as { data: T }).data;
}

function errorCode(body: unknown) {
  return (body as { error: { code: string } }).error.code;
}

async function cleanup() {
  await prisma.journey.deleteMany({ where: { reservationId: { startsWith: RESERVATION_PREFIX } } });
  await prisma.reservation.deleteMany({ where: { id: { startsWith: RESERVATION_PREFIX } } });
  await prisma.inventory.updateMany({
    where: { storeId: STORE_ID },
    data: { quantity: 5, isDisplayAvailable: true },
  });
  await prisma.product.updateMany({ data: { isActive: true } });
  await prisma.storeZone.updateMany({ where: { storeId: STORE_ID }, data: { isActive: true } });
}

async function createReadyJourney(userId = STABLE_USER_ID) {
  const reservationId = nextUuid();
  const reservationResponse = await api
    .post("/api/reservations")
    .set(DEMO_USER_HEADER_NAME, userId)
    .set(IDEMPOTENCY_KEY_HEADER_NAME, reservationId)
    .send({
      storeId: STORE_ID,
      reservedAt: "2026-08-12T10:00:00.000Z",
      startQuestionCode: "TODAY_INTENT",
      startAnswerCode: "SIGNATURE",
      startAnswerLabel: "나만의 시그니처 찾기",
    })
    .expect(201);
  const reservation = dataAs<ReservationView>(reservationResponse.body);
  const checkIn = await api
    .post("/api/reservations/check-in")
    .set(DEMO_USER_HEADER_NAME, userId)
    .send({ qrToken: reservation.qrToken })
    .expect(200);
  return dataAs<JourneyAggregate>(checkIn.body);
}

async function start(userId = STABLE_USER_ID) {
  const ready = await createReadyJourney(userId);
  const response = await api
    .post(`/api/journeys/${ready.journey.id}/start`)
    .set(DEMO_USER_HEADER_NAME, userId)
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

function interact(
  aggregate: JourneyAggregate,
  type: "VIEWED" | "COMPARED" | "SELECTED" | "REJECTED" | "DESELECTED",
  productId = aggregate.currentStep!.recommendations[0]!.product.id,
  interactionId = nextUuid(),
) {
  return api
    .post(`/api/journeys/${aggregate.journey.id}/interactions`)
    .set(DEMO_USER_HEADER_NAME, aggregate.journey.userId)
    .send({
      interactionId,
      journeyStepId: aggregate.currentStep!.id,
      productId,
      type,
    });
}

async function selectFirst(aggregate: JourneyAggregate) {
  const response = await interact(aggregate, "SELECTED").expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function next(aggregate: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/next`)
    .set(DEMO_USER_HEADER_NAME, aggregate.journey.userId)
    .send({ expectedStepNumber: aggregate.journey.currentStepNumber })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function reachApparel() {
  return next(await selectFirst(await start()));
}

async function reachAccessory() {
  return next(await selectFirst(await reachApparel()));
}

beforeEach(async () => {
  sequence = 1;
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await disconnectPrisma();
});

describe("Journey start and snapshot", () => {
  it("starts READY as ACTIVE BAG step 1", async () => {
    const aggregate = await start();
    expect(aggregate.journey).toMatchObject({ status: "ACTIVE", currentStage: "BAG", currentStepNumber: 1 });
    expect(aggregate.currentStep).toMatchObject({ stage: "BAG", status: "IN_PROGRESS", stepNumber: 1 });
  });

  it("creates the deterministic BAG scenario and three recommendations", async () => {
    const aggregate = await start();
    expect(aggregate.currentStep?.scenarioTitle).toBe("여정의 중심을 선택해보세요");
    expect(aggregate.currentStep?.recommendations).toHaveLength(3);
  });

  it("stores a profile snapshot with stable ordered preferences", async () => {
    const aggregate = await start();
    expect(aggregate.profileSnapshot?.todayIntentSummary).toBe("오늘의 Journey 방향: 나만의 시그니처 찾기");
    expect(aggregate.profileSnapshot?.preferences.length).toBeGreaterThan(0);
    expect(await prisma.journeyProfileSnapshot.count({ where: { journeyId: aggregate.journey.id } })).toBe(1);
  });

  it("stores only summarized behavior when consent allows behavior data", async () => {
    const aggregate = await start(STABLE_USER_ID);
    const stored = await prisma.journeyProfileSnapshot.findUniqueOrThrow({ where: { journeyId: aggregate.journey.id } });
    const summary = JSON.parse(stored.behaviorSummaryJson!);
    expect(Object.keys(summary).sort()).toEqual(["cartProductIds", "repeatedViewProductIds", "selectedColors", "wishlistProductIds"]);
    expect(stored.behaviorSummaryJson).not.toContain("durationSeconds");
    expect(stored.behaviorSummaryJson).not.toContain("metadataJson");
  });

  it("stores null behavior summary when consent disallows behavior data", async () => {
    const aggregate = await start(BOLD_USER_ID);
    const stored = await prisma.journeyProfileSnapshot.findUniqueOrThrow({ where: { journeyId: aggregate.journey.id } });
    expect(stored.behaviorSummaryJson).toBeNull();
  });

  it("marks every fallback recommendation as non-AI", async () => {
    const aggregate = await start();
    expect(aggregate.currentStep?.usedFallback).toBe(true);
    expect(aggregate.currentStep?.recommendations.every((item) => !item.isAiSelected)).toBe(true);
  });

  it("keeps recommendation ranks and scores stable", async () => {
    const first = await start();
    const scores = first.currentStep!.recommendations.map((item) => item.ruleScore);
    expect(scores).toEqual([...scores].sort((left, right) => right - left));
    expect(first.currentStep!.recommendations.map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it("replays start without duplicate snapshot, step or recommendations", async () => {
    const aggregate = await start();
    const repeated = await api.post(`/api/journeys/${aggregate.journey.id}/start`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(200);
    expect(dataAs<JourneyAggregate>(repeated.body).journey.id).toBe(aggregate.journey.id);
    expect(await prisma.journeyStep.count({ where: { journeyId: aggregate.journey.id } })).toBe(1);
    expect(await prisma.stepRecommendation.count({ where: { journeyStep: { journeyId: aggregate.journey.id } } })).toBe(3);
  });

  it("rejects another owner", async () => {
    const ready = await createReadyJourney();
    const response = await api.post(`/api/journeys/${ready.journey.id}/start`).set(DEMO_USER_HEADER_NAME, BOLD_USER_ID).expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("leaves READY unchanged when BAG has no candidates", async () => {
    const ready = await createReadyJourney();
    await prisma.inventory.updateMany({ where: { storeId: STORE_ID, zoneId: BAG_ZONE_ID }, data: { quantity: 0 } });
    const response = await api.post(`/api/journeys/${ready.journey.id}/start`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(409);
    expect(errorCode(response.body)).toBe("NO_ELIGIBLE_CANDIDATES");
    const stored = await prisma.journey.findUniqueOrThrow({ where: { id: ready.journey.id } });
    expect(stored).toMatchObject({ status: "READY", currentStage: "INTRO", currentStepNumber: 0 });
  });
});

describe("Journey interactions", () => {
  it("stores VIEWED and COMPARED without selecting", async () => {
    let aggregate = await start();
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "VIEWED").expect(200)).body);
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "COMPARED").expect(200)).body);
    expect(aggregate.interactions.map((item) => item.type)).toEqual(["VIEWED", "COMPARED"]);
    expect(aggregate.currentStep?.selectedProduct).toBeNull();
  });

  it("stores SELECTED and updates selectedProduct", async () => {
    const aggregate = await selectFirst(await start());
    expect(aggregate.currentStep?.selectedProduct?.id).toBe(aggregate.interactions[0]?.productId);
  });

  it("inserts DESELECTED before a changed SELECTED", async () => {
    let aggregate = await selectFirst(await start());
    const replacement = aggregate.currentStep!.recommendations[1]!.product.id;
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "SELECTED", replacement).expect(200)).body);
    expect(aggregate.interactions.map((item) => item.type)).toEqual(["SELECTED", "DESELECTED", "SELECTED"]);
    expect(aggregate.currentStep?.selectedProduct?.id).toBe(replacement);
  });

  it("clears the selection with DESELECTED", async () => {
    let aggregate = await selectFirst(await start());
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "DESELECTED", aggregate.currentStep!.selectedProduct!.id).expect(200)).body);
    expect(aggregate.currentStep?.selectedProduct).toBeNull();
  });

  it("stores REJECTED and refuses to reject the selected product", async () => {
    let aggregate = await start();
    const rejected = aggregate.currentStep!.recommendations[1]!.product.id;
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "REJECTED", rejected).expect(200)).body);
    expect(aggregate.interactions[0]?.type).toBe("REJECTED");
    aggregate = await selectFirst(aggregate);
    const response = await interact(aggregate, "REJECTED", aggregate.currentStep!.selectedProduct!.id).expect(409);
    expect(errorCode(response.body)).toBe("INVALID_STATE");
  });

  it("rejects another step id and a wrong-category product", async () => {
    const aggregate = await start();
    const wrongStep = await api.post(`/api/journeys/${aggregate.journey.id}/interactions`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ interactionId: nextUuid(), journeyStepId: nextUuid(), productId: aggregate.currentStep!.recommendations[0]!.product.id, type: "VIEWED" }).expect(409);
    expect(errorCode(wrongStep.body)).toBe("INVALID_STATE");
    const wrongCategory = await interact(aggregate, "VIEWED", SHOES_PRODUCT_ID).expect(409);
    expect(errorCode(wrongCategory.body)).toBe("PRODUCT_NOT_ELIGIBLE");
  });

  it("rejects a zero-stock product", async () => {
    const aggregate = await start();
    const productId = aggregate.currentStep!.recommendations[0]!.product.id;
    await prisma.inventory.update({ where: { storeId_productId: { storeId: STORE_ID, productId } }, data: { quantity: 0 } });
    const response = await interact(aggregate, "VIEWED", productId).expect(409);
    expect(errorCode(response.body)).toBe("PRODUCT_NOT_ELIGIBLE");
  });

  it("replays the same interaction id and rejects a conflicting payload", async () => {
    const aggregate = await start();
    const interactionId = nextUuid();
    const first = await interact(aggregate, "VIEWED", undefined, interactionId).expect(200);
    await interact(aggregate, "VIEWED", undefined, interactionId).expect(200);
    expect(await prisma.productInteraction.count({ where: { id: interactionId } })).toBe(1);
    const conflictAggregate = dataAs<JourneyAggregate>(first.body);
    const response = await interact(conflictAggregate, "COMPARED", undefined, interactionId).expect(409);
    expect(errorCode(response.body)).toBe("RESOURCE_CONFLICT");
  });

  it("rechecks OWNER access for an idempotent interaction replay", async () => {
    const aggregate = await start();
    const interactionId = nextUuid();
    await interact(aggregate, "VIEWED", undefined, interactionId).expect(200);
    const response = await api
      .post(`/api/journeys/${aggregate.journey.id}/interactions`)
      .set(DEMO_USER_HEADER_NAME, BOLD_USER_ID)
      .send({
        interactionId,
        journeyStepId: aggregate.currentStep!.id,
        productId: aggregate.currentStep!.recommendations[0]!.product.id,
        type: "VIEWED",
      })
      .expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("assigns monotonically increasing Journey-wide sequences", async () => {
    let aggregate = await start();
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "VIEWED").expect(200)).body);
    aggregate = dataAs<JourneyAggregate>((await interact(aggregate, "COMPARED").expect(200)).body);
    aggregate = await selectFirst(aggregate);
    expect(aggregate.interactions.map((item) => item.sequence)).toEqual([1, 2, 3]);
  });
});

describe("Journey next transitions", () => {
  it("moves BAG to APPAREL and completes BAG", async () => {
    const aggregate = await reachApparel();
    expect(aggregate.journey).toMatchObject({ currentStage: "APPAREL", currentStepNumber: 2 });
    expect(aggregate.completedSteps.map((step) => step.stage)).toEqual(["BAG"]);
    expect(aggregate.currentStep).toMatchObject({ stage: "APPAREL", status: "IN_PROGRESS", usedFallback: true });
  });

  it("moves APPAREL to ACCESSORY", async () => {
    const aggregate = await reachAccessory();
    expect(aggregate.journey).toMatchObject({ currentStage: "ACCESSORY", currentStepNumber: 3 });
    expect(aggregate.completedSteps.map((step) => step.stage)).toEqual(["BAG", "APPAREL"]);
  });

  it("rejects next without a selection", async () => {
    const aggregate = await start();
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/next`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 1 }).expect(409);
    expect(errorCode(response.body)).toBe("INVALID_STATE");
  });

  it("rejects a stale expectedStepNumber", async () => {
    const aggregate = await reachApparel();
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/next`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 3 }).expect(409);
    expect(errorCode(response.body)).toBe("STALE_JOURNEY_STEP");
  });

  it("replays exactly one completed transition", async () => {
    const aggregate = await reachApparel();
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/next`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 1 }).expect(200);
    expect(dataAs<JourneyAggregate>(response.body).journey.currentStepNumber).toBe(2);
    expect(await prisma.journeyStep.count({ where: { journeyId: aggregate.journey.id } })).toBe(2);
  });

  it("rejects ACCESSORY next", async () => {
    const aggregate = await selectFirst(await reachAccessory());
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/next`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 3 }).expect(409);
    expect(errorCode(response.body)).toBe("INVALID_STATE");
  });

  it("does not complete BAG when APPAREL has no candidates", async () => {
    const selected = await selectFirst(await start());
    await prisma.inventory.updateMany({ where: { storeId: STORE_ID, zoneId: APPAREL_ZONE_ID }, data: { quantity: 0 } });
    const response = await api.post(`/api/journeys/${selected.journey.id}/next`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 1 }).expect(409);
    expect(errorCode(response.body)).toBe("NO_ELIGIBLE_CANDIDATES");
    const stored = await prisma.journey.findUniqueOrThrow({ where: { id: selected.journey.id } });
    expect(stored).toMatchObject({ currentStage: "BAG", currentStepNumber: 1 });
  });
});

describe("Journey finish and aggregate", () => {
  it("keeps canFinish false for BAG only and rejects finish", async () => {
    const aggregate = await selectFirst(await start());
    expect(aggregate.canFinishJourney).toBe(false);
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 1 }).expect(409);
    expect(errorCode(response.body)).toBe("MINIMUM_SELECTION_REQUIRED");
  });

  it("finishes with BAG and APPAREL selections", async () => {
    const aggregate = await selectFirst(await reachApparel());
    expect(aggregate.canFinishJourney).toBe(true);
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200);
    const finished = dataAs<JourneyAggregate>(response.body);
    expect(finished.journey).toMatchObject({ status: "FINISHED", currentStage: "RESULT" });
    expect(finished.currentStep).toBeNull();
    expect(finished.result?.items).toHaveLength(2);
  });

  it("finishes with all three fixed stages in selection order", async () => {
    const aggregate = await selectFirst(await reachAccessory());
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 3 }).expect(200);
    const finished = dataAs<JourneyAggregate>(response.body);
    expect(finished.result?.items.map((item) => item.category)).toEqual(["BAG", "APPAREL", "ACCESSORY"]);
    expect(finished.result?.items.map((item) => item.selectionOrder)).toEqual([1, 2, 3]);
    expect(finished.completedSteps.map((step) => step.stage)).toEqual(["BAG", "APPAREL", "ACCESSORY"]);
  });

  it("stores fallback result, unique share token and product reasons", async () => {
    const aggregate = await selectFirst(await reachApparel());
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200);
    const result = dataAs<JourneyAggregate>(response.body).result!;
    expect(result.usedFallback).toBe(true);
    expect(result.shareToken.length).toBeGreaterThanOrEqual(32);
    expect(result.items.every((item) => item.recommendationReason.length > 0)).toBe(true);
    expect(result.signatureName).toMatch(/^MCM .+ Journey$/);
  });

  it("completes the Reservation in the same finish flow", async () => {
    const aggregate = await selectFirst(await reachApparel());
    await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200);
    const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: aggregate.journey.reservationId } });
    expect(reservation.status).toBe("COMPLETED");
    expect(reservation.completedAt).not.toBeNull();
  });

  it("does not put personal data or internal scores in staffSummary", async () => {
    const aggregate = await selectFirst(await reachApparel());
    await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200);
    const stored = await prisma.journeyResult.findUniqueOrThrow({ where: { journeyId: aggregate.journey.id } });
    expect(stored.staffSummary).not.toContain("stable.explorer@example.demo");
    expect(stored.staffSummary).not.toContain("Stable Explorer");
    expect(stored.staffSummary).not.toContain("practicalityScore");
  });

  it("replays finish without another Result", async () => {
    const aggregate = await selectFirst(await reachApparel());
    const call = () => api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 });
    const first = await call().expect(200);
    const second = await call().expect(200);
    expect(dataAs<JourneyAggregate>(second.body).result?.id).toBe(dataAs<JourneyAggregate>(first.body).result?.id);
    expect(await prisma.journeyResult.count({ where: { journeyId: aggregate.journey.id } })).toBe(1);
  });

  it("returns complete READY, ACTIVE and FINISHED aggregates from GET", async () => {
    const ready = await createReadyJourney();
    const readyGet = await api.get(`/api/journeys/${ready.journey.id}`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(200);
    expect(dataAs<JourneyAggregate>(readyGet.body).currentStep).toBeNull();
    let active = dataAs<JourneyAggregate>((await api.post(`/api/journeys/${ready.journey.id}/start`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(200)).body);
    expect(active.currentStep?.stage).toBe("BAG");
    active = await selectFirst(active);
    active = await next(active);
    active = await selectFirst(active);
    await api.post(`/api/journeys/${active.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200);
    const finishedGet = await api.get(`/api/journeys/${active.journey.id}`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(200);
    const finished = dataAs<JourneyAggregate>(finishedGet.body);
    expect(finished.currentStep).toBeNull();
    expect(finished.result).not.toBeNull();
    expect(finished.interactions.map((item) => item.sequence)).toEqual([1, 2]);
  });

  it("stores redacted fallback AIExecution rows with the generated step and result", async () => {
    const before = await prisma.aIExecution.count();
    const aggregate = await selectFirst(await reachApparel());
    await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200);
    const executions = await prisma.aIExecution.findMany({
      where: { journeyId: aggregate.journey.id },
      orderBy: { createdAt: "asc" },
    });
    expect(await prisma.aIExecution.count()).toBe(before + 3);
    expect(executions.map((item) => item.status)).toEqual(["FALLBACK", "FALLBACK", "FALLBACK"]);
    expect(executions.every((item) => item.validated === false)).toBe(true);
    expect(executions.every((item) => item.errorMessage === "AI_DISABLED")).toBe(true);
    expect(executions.map((item) => JSON.parse(item.requestJson))).toEqual([
      { stage: "BAG", candidateCount: 3, selectedCount: 0, rejectedCount: 0 },
      { stage: "APPAREL", candidateCount: 3, selectedCount: 1, rejectedCount: 0 },
      { selectedProductCount: 2, decisionEventCount: 2, allowedSceneKeyCount: 1 },
    ]);
  });
});

describe("Journey eligibility and transaction boundaries", () => {
  it("excludes a zero-stock BAG from generated recommendations", async () => {
    const inventory = await prisma.inventory.findFirstOrThrow({ where: { storeId: STORE_ID, zoneId: BAG_ZONE_ID } });
    await prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: 0 } });
    const aggregate = await start();
    expect(aggregate.currentStep?.recommendations).toHaveLength(2);
    expect(aggregate.currentStep?.recommendations.some((item) => item.product.id === inventory.productId)).toBe(false);
  });

  it("excludes a display-disabled BAG from generated recommendations", async () => {
    const inventory = await prisma.inventory.findFirstOrThrow({ where: { storeId: STORE_ID, zoneId: BAG_ZONE_ID } });
    await prisma.inventory.update({ where: { id: inventory.id }, data: { isDisplayAvailable: false } });
    const aggregate = await start();
    expect(aggregate.currentStep?.recommendations.some((item) => item.product.id === inventory.productId)).toBe(false);
  });

  it("excludes an inactive product from generated recommendations", async () => {
    const inventory = await prisma.inventory.findFirstOrThrow({ where: { storeId: STORE_ID, zoneId: BAG_ZONE_ID } });
    await prisma.product.update({ where: { id: inventory.productId }, data: { isActive: false } });
    const aggregate = await start();
    expect(aggregate.currentStep?.recommendations.some((item) => item.product.id === inventory.productId)).toBe(false);
  });

  it("does not start when the target zone is inactive", async () => {
    const ready = await createReadyJourney();
    await prisma.storeZone.update({ where: { id: BAG_ZONE_ID }, data: { isActive: false } });
    const response = await api.post(`/api/journeys/${ready.journey.id}/start`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(409);
    expect(errorCode(response.body)).toBe("NO_ELIGIBLE_CANDIDATES");
  });

  it("rejects interaction after display availability changes", async () => {
    const aggregate = await start();
    const productId = aggregate.currentStep!.recommendations[0]!.product.id;
    await prisma.inventory.update({ where: { storeId_productId: { storeId: STORE_ID, productId } }, data: { isDisplayAvailable: false } });
    const response = await interact(aggregate, "VIEWED", productId).expect(409);
    expect(errorCode(response.body)).toBe("PRODUCT_NOT_ELIGIBLE");
  });

  it("keeps concurrent interaction sequences unique", async () => {
    const aggregate = await start();
    const calls = await Promise.all([
      interact(aggregate, "VIEWED", undefined, nextUuid()),
      interact(aggregate, "COMPARED", undefined, nextUuid()),
    ]);
    expect(calls.map((call) => call.status)).toEqual([200, 200]);
    const interactions = await prisma.productInteraction.findMany({ where: { journeyId: aggregate.journey.id }, orderBy: { sequence: "asc" } });
    expect(interactions.map((item) => item.sequence)).toEqual([1, 2]);
  });

  it("returns STALE_JOURNEY_STEP for an incorrect finish expectation", async () => {
    const aggregate = await selectFirst(await reachApparel());
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 3 }).expect(409);
    expect(errorCode(response.body)).toBe("STALE_JOURNEY_STEP");
  });

  it("rolls back finish when a selected product becomes ineligible", async () => {
    const aggregate = await selectFirst(await reachApparel());
    const selectedId = aggregate.currentStep!.selectedProduct!.id;
    await prisma.inventory.update({ where: { storeId_productId: { storeId: STORE_ID, productId: selectedId } }, data: { quantity: 0 } });
    const response = await api.post(`/api/journeys/${aggregate.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(409);
    expect(errorCode(response.body)).toBe("PRODUCT_NOT_ELIGIBLE");
    expect(await prisma.journeyResult.count({ where: { journeyId: aggregate.journey.id } })).toBe(0);
    expect((await prisma.journey.findUniqueOrThrow({ where: { id: aggregate.journey.id } })).status).toBe("ACTIVE");
  });

  it("creates different share tokens for separate Results", async () => {
    const first = await selectFirst(await reachApparel());
    const firstFinished = dataAs<JourneyAggregate>((await api.post(`/api/journeys/${first.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200)).body);
    const second = await selectFirst(await reachApparel());
    const secondFinished = dataAs<JourneyAggregate>((await api.post(`/api/journeys/${second.journey.id}/finish`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).send({ expectedStepNumber: 2 }).expect(200)).body);
    expect(firstFinished.result?.shareToken).not.toBe(secondFinished.result?.shareToken);
  });

  it("keeps current Step selected product and completed Step ordering in GET", async () => {
    const apparel = await selectFirst(await reachApparel());
    const response = await api.get(`/api/journeys/${apparel.journey.id}`).set(DEMO_USER_HEADER_NAME, STABLE_USER_ID).expect(200);
    const aggregate = dataAs<JourneyAggregate>(response.body);
    expect(aggregate.currentStep?.selectedProduct?.id).toBe(apparel.currentStep?.selectedProduct?.id);
    expect(aggregate.completedSteps.map((step) => step.stepNumber)).toEqual([1]);
  });
});
