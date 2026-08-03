import {
  DEMO_USER_HEADER_NAME,
  IDEMPOTENCY_KEY_HEADER_NAME,
  resolveJourneyScreen,
  type JourneyAggregate,
  type ReservationView,
} from "@mcm/shared";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { createPrismaClient, disconnectPrisma, prisma } from "../lib/prisma.js";
import { mapJourneyAggregate } from "../mappers/journey-aggregate-mapper.js";
import {
  findJourneyAggregate,
  journeyAggregateSelect,
} from "../repositories/journey-repository.js";

const CUSTOMER_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_CUSTOMER_ID = "10000000-0000-4000-8000-000000000002";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const BAG_ZONE_ID = "30000000-0000-4000-8000-000000000001";
const TEST_STORE_ID = "61000000-0000-4000-8000-000000000099";
const RESERVATION_PREFIX = "61000000-";

const app = createApp();
const api = request(app);
let sequence = 1;

function nextUuid() {
  return `61000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
}

function dataAs<T>(body: unknown) {
  return (body as { data: T }).data;
}

function errorCode(body: unknown) {
  return (body as { error: { code: string } }).error.code;
}

async function cleanup() {
  await prisma.journey.deleteMany({
    where: { reservationId: { startsWith: RESERVATION_PREFIX } },
  });
  await prisma.reservation.deleteMany({
    where: { id: { startsWith: RESERVATION_PREFIX } },
  });
  await prisma.store.deleteMany({ where: { id: TEST_STORE_ID } });
}

async function createReadyJourney() {
  const reservationId = nextUuid();
  const reservationResponse = await api
    .post("/api/reservations")
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .set(IDEMPOTENCY_KEY_HEADER_NAME, reservationId)
    .send({
      storeId: STORE_ID,
      reservedAt: "2026-08-15T10:00:00.000Z",
      startQuestionCode: "TODAY_INTENT",
      startAnswerCode: "RECOVERY",
      startAnswerLabel: "새로고침 복구",
    })
    .expect(201);
  const reservation = dataAs<ReservationView>(reservationResponse.body);
  const checkInResponse = await api
    .post("/api/reservations/check-in")
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({ qrToken: reservation.qrToken })
    .expect(200);
  return dataAs<JourneyAggregate>(checkInResponse.body);
}

async function getJourney(journeyId: string) {
  const response = await api
    .get(`/api/journeys/${journeyId}`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function startJourney() {
  const ready = await createReadyJourney();
  const response = await api
    .post(`/api/journeys/${ready.journey.id}/start`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function selectCurrent(aggregate: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/interactions`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({
      interactionId: nextUuid(),
      journeyStepId: aggregate.currentStep!.id,
      productId: aggregate.currentStep!.recommendations[0]!.product.id,
      type: "SELECTED",
    })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function advance(aggregate: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/next`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({ expectedStepNumber: aggregate.journey.currentStepNumber })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function reachApparel(selected = false) {
  let aggregate = await advance(await selectCurrent(await startJourney()));
  if (selected) aggregate = await selectCurrent(aggregate);
  return aggregate;
}

async function reachAccessory(selected = false) {
  let aggregate = await advance(await reachApparel(true));
  if (selected) aggregate = await selectCurrent(aggregate);
  return aggregate;
}

async function finishAtApparel() {
  const aggregate = await reachApparel(true);
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/finish`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({ expectedStepNumber: 2 })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function expectCorruptGet(journeyId: string, userId = CUSTOMER_ID) {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const response = await api
    .get(`/api/journeys/${journeyId}`)
    .set(DEMO_USER_HEADER_NAME, userId)
    .expect(500);
  expect(errorCode(response.body)).toBe("INTERNAL_ERROR");
  expect(response.body).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: null,
    },
  });
  expect(log).toHaveBeenCalledWith(expect.stringMatching(/^\[server-error\] JOURNEY_/));
  log.mockRestore();
}

async function readAfterPrismaRestart(journeyId: string) {
  await disconnectPrisma();
  const fresh = createPrismaClient();
  try {
    const record = await fresh.journey.findUnique({
      where: { id: journeyId },
      select: journeyAggregateSelect,
    });
    if (!record) throw new Error("TEST_JOURNEY_NOT_FOUND");
    return mapJourneyAggregate(record);
  } finally {
    await fresh.$disconnect();
    await prisma.$connect();
  }
}

beforeEach(async () => {
  sequence = 1;
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await disconnectPrisma();
});

describe("READY and ACTIVE refresh recovery", () => {
  it("restores every READY invariant after check-in", async () => {
    const ready = await createReadyJourney();
    const restored = await getJourney(ready.journey.id);
    expect(restored.journey).toMatchObject({
      status: "READY",
      currentStage: "INTRO",
      currentStepNumber: 0,
      startedAt: null,
    });
    expect(restored).toMatchObject({
      profileSnapshot: null,
      currentStep: null,
      completedSteps: [],
      interactions: [],
      canFinishJourney: false,
      result: null,
    });
  });

  it("resolves READY to the INTRO screen key", async () => {
    expect(resolveJourneyScreen(await createReadyJourney())).toBe("INTRO");
  });

  it("does not mutate Journey data during repeated GET requests", async () => {
    const active = await selectCurrent(await startJourney());
    const before = await prisma.journey.findUniqueOrThrow({
      where: { id: active.journey.id },
      select: {
        updatedAt: true,
        _count: { select: { steps: true, interactions: true } },
      },
    });
    await getJourney(active.journey.id);
    await getJourney(active.journey.id);
    const after = await prisma.journey.findUniqueOrThrow({
      where: { id: active.journey.id },
      select: {
        updatedAt: true,
        _count: { select: { steps: true, interactions: true } },
      },
    });
    expect(after).toEqual(before);
  });

  it("omits email, raw behavior and AI internals from the aggregate", async () => {
    const serialized = JSON.stringify(await getJourney((await startJourney()).journey.id));
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("onlineBehaviors");
    expect(serialized).not.toContain("metadataJson");
    expect(serialized).not.toContain("AIExecution");
  });

  it("restores BAG recommendations before selection", async () => {
    const started = await startJourney();
    const restored = await getJourney(started.journey.id);
    expect(restored.currentStep?.stage).toBe("BAG");
    expect(restored.currentStep?.recommendations).toEqual(
      started.currentStep?.recommendations,
    );
    expect(resolveJourneyScreen(restored)).toBe("BAG_SELECTION");
  });

  it("restores BAG selection and interaction sequence", async () => {
    const selected = await selectCurrent(await startJourney());
    const restored = await getJourney(selected.journey.id);
    expect(restored.currentStep?.selectedProduct).toEqual(
      selected.currentStep?.selectedProduct,
    );
    expect(restored.interactions.map((item) => item.sequence)).toEqual([1]);
  });

  it("restores APPAREL with the completed BAG Step", async () => {
    const apparel = await reachApparel();
    const restored = await getJourney(apparel.journey.id);
    expect(restored.journey).toMatchObject({
      status: "ACTIVE",
      currentStage: "APPAREL",
      currentStepNumber: 2,
    });
    expect(restored.completedSteps.map((step) => step.stage)).toEqual(["BAG"]);
    expect(restored.currentStep?.recommendations).toEqual(
      apparel.currentStep?.recommendations,
    );
  });

  it("keeps APPAREL screen after selection enables finish", async () => {
    const apparel = await reachApparel(true);
    const restored = await getJourney(apparel.journey.id);
    expect(restored.canFinishJourney).toBe(true);
    expect(resolveJourneyScreen(restored)).toBe("APPAREL_SELECTION");
  });

  it("restores ACCESSORY and both completed prior Steps", async () => {
    const accessory = await reachAccessory();
    const restored = await getJourney(accessory.journey.id);
    expect(restored.journey.currentStage).toBe("ACCESSORY");
    expect(restored.completedSteps.map((step) => step.stage)).toEqual([
      "BAG",
      "APPAREL",
    ]);
    expect(resolveJourneyScreen(restored)).toBe("ACCESSORY_SELECTION");
  });

  it("restores the selected ACCESSORY and canFinishJourney", async () => {
    const accessory = await reachAccessory(true);
    const restored = await getJourney(accessory.journey.id);
    expect(restored.currentStep?.selectedProduct?.id).toBe(
      accessory.currentStep?.selectedProduct?.id,
    );
    expect(restored.canFinishJourney).toBe(true);
  });
});

describe("FINISHED refresh recovery", () => {
  it("restores Result and all completed Steps", async () => {
    const finished = await finishAtApparel();
    const restored = await getJourney(finished.journey.id);
    expect(restored.journey).toMatchObject({
      status: "FINISHED",
      currentStage: "RESULT",
    });
    expect(restored.currentStep).toBeNull();
    expect(restored.result).toEqual(finished.result);
    expect(restored.completedSteps.every((step) => step.status === "COMPLETED")).toBe(true);
  });

  it("restores ResultItem order and public result fields", async () => {
    const restored = await getJourney((await finishAtApparel()).journey.id);
    expect(restored.result?.items.map((item) => item.selectionOrder)).toEqual([1, 2]);
    expect(restored.result?.items.every((item) => item.recommendationReason.length > 0)).toBe(true);
    expect(restored.result?.shareToken.length).toBeGreaterThanOrEqual(32);
    expect(restored.result?.usedFallback).toBe(true);
  });

  it("restores the COMPLETED Reservation summary", async () => {
    const restored = await getJourney((await finishAtApparel()).journey.id);
    expect(restored.reservation.status).toBe("COMPLETED");
    expect(restored.reservation.completedAt).not.toBeNull();
    expect(restored.reservation).not.toHaveProperty("qrToken");
    expect(restored.reservation).not.toHaveProperty("reservationCode");
  });

  it("resolves a completed aggregate to RESULT", async () => {
    expect(resolveJourneyScreen(await finishAtApparel())).toBe("RESULT");
  });

  it("never returns a frontend URL from the aggregate", async () => {
    const serialized = JSON.stringify(await finishAtApparel());
    expect(serialized).not.toContain("/journey/");
    expect(serialized).not.toContain("qrToken");
    expect(serialized).not.toContain("reservationCode");
  });
});

describe("shared Journey screen contract", () => {
  it("throws for an unsupported READY aggregate", async () => {
    const ready = await createReadyJourney();
    const invalid = {
      ...ready,
      journey: { ...ready.journey, currentStepNumber: 1 },
    };
    expect(() => resolveJourneyScreen(invalid)).toThrow("INVALID_JOURNEY_AGGREGATE");
  });

  it("throws for a mismatched ACTIVE current Step", async () => {
    const active = await startJourney();
    const invalid = {
      ...active,
      currentStep: { ...active.currentStep!, stage: "APPAREL" as const },
    };
    expect(() => resolveJourneyScreen(invalid)).toThrow("INVALID_JOURNEY_AGGREGATE");
  });

  it("throws for FINISHED without a Result", async () => {
    const finished = await finishAtApparel();
    expect(() =>
      resolveJourneyScreen({ ...finished, result: null }),
    ).toThrow("INVALID_JOURNEY_AGGREGATE");
  });
});

describe("corrupted aggregate detection", () => {
  it("detects ACTIVE without its current Step", async () => {
    const active = await startJourney();
    await prisma.journeyStep.delete({ where: { id: active.currentStep!.id } });
    await expectCorruptGet(active.journey.id);
  });

  it("detects a current stage and Step stage mismatch", async () => {
    const active = await startJourney();
    await prisma.journeyStep.update({
      where: { id: active.currentStep!.id },
      data: { stage: "APPAREL" },
    });
    await expectCorruptGet(active.journey.id);
  });

  it("detects a currentStepNumber mismatch", async () => {
    const active = await startJourney();
    await prisma.journey.update({
      where: { id: active.journey.id },
      data: { currentStepNumber: 2 },
    });
    await expectCorruptGet(active.journey.id);
  });

  it("detects FINISHED without a Result", async () => {
    const finished = await finishAtApparel();
    await prisma.journeyResult.delete({ where: { journeyId: finished.journey.id } });
    await expectCorruptGet(finished.journey.id);
  });

  it("detects FINISHED with an incomplete Reservation", async () => {
    const finished = await finishAtApparel();
    await prisma.reservation.update({
      where: { id: finished.journey.reservationId },
      data: { status: "CHECKED_IN", completedAt: null },
    });
    await expectCorruptGet(finished.journey.id);
  });

  it("detects READY with a persisted Step", async () => {
    const ready = await createReadyJourney();
    await prisma.journeyStep.create({
      data: {
        journeyId: ready.journey.id,
        stepNumber: 1,
        stage: "BAG",
        status: "IN_PROGRESS",
        scenarioTitle: "Corrupt test",
        scenarioText: "Corrupt test",
        zoneId: BAG_ZONE_ID,
        canFinishJourney: false,
        usedFallback: true,
      },
    });
    await expectCorruptGet(ready.journey.id);
  });

  it("detects a Journey and Reservation user mismatch", async () => {
    const ready = await createReadyJourney();
    await prisma.journey.update({
      where: { id: ready.journey.id },
      data: { userId: OTHER_CUSTOMER_ID },
    });
    await expectCorruptGet(ready.journey.id, OTHER_CUSTOMER_ID);
  });

  it("detects a Journey and Reservation store mismatch", async () => {
    const ready = await createReadyJourney();
    await prisma.store.create({
      data: {
        id: TEST_STORE_ID,
        code: "STAGE6-CORRUPT",
        name: "Stage 6 Corrupt Store",
        location: "Test",
      },
    });
    await prisma.journey.update({
      where: { id: ready.journey.id },
      data: { storeId: TEST_STORE_ID },
    });
    await expectCorruptGet(ready.journey.id);
  });

  it("detects in-memory Step ordering corruption", async () => {
    const accessory = await reachAccessory();
    const record = await findJourneyAggregate(accessory.journey.id);
    record!.steps.reverse();
    expect(() => mapJourneyAggregate(record!)).toThrowError();
  });

  it("detects in-memory Recommendation ordering corruption", async () => {
    const active = await startJourney();
    const record = await findJourneyAggregate(active.journey.id);
    record!.steps[0]!.recommendations.reverse();
    expect(() => mapJourneyAggregate(record!)).toThrowError();
  });
});

describe("mutation replay and concurrency recovery", () => {
  it("returns one Step and Snapshot for repeated start", async () => {
    const active = await startJourney();
    await api
      .post(`/api/journeys/${active.journey.id}/start`)
      .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
      .expect(200);
    expect(await prisma.journeyStep.count({ where: { journeyId: active.journey.id } })).toBe(1);
    expect(await prisma.journeyProfileSnapshot.count({ where: { journeyId: active.journey.id } })).toBe(1);
  });

  it("keeps one interaction for a repeated identical interactionId", async () => {
    const active = await startJourney();
    const interactionId = nextUuid();
    const payload = {
      interactionId,
      journeyStepId: active.currentStep!.id,
      productId: active.currentStep!.recommendations[0]!.product.id,
      type: "VIEWED",
    };
    const call = () =>
      api
        .post(`/api/journeys/${active.journey.id}/interactions`)
        .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
        .send(payload);
    await call().expect(200);
    await call().expect(200);
    expect(await prisma.productInteraction.count({ where: { id: interactionId } })).toBe(1);
  });

  it("returns RESOURCE_CONFLICT for changed interaction payload", async () => {
    const active = await startJourney();
    const interactionId = nextUuid();
    const base = {
      interactionId,
      journeyStepId: active.currentStep!.id,
      productId: active.currentStep!.recommendations[0]!.product.id,
    };
    await api.post(`/api/journeys/${active.journey.id}/interactions`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).send({ ...base, type: "VIEWED" }).expect(200);
    const response = await api.post(`/api/journeys/${active.journey.id}/interactions`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).send({ ...base, type: "COMPARED" }).expect(409);
    expect(errorCode(response.body)).toBe("RESOURCE_CONFLICT");
  });

  it("returns the same APPAREL aggregate for repeated next", async () => {
    const apparel = await reachApparel();
    const response = await api
      .post(`/api/journeys/${apparel.journey.id}/next`)
      .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
      .send({ expectedStepNumber: 1 })
      .expect(200);
    expect(dataAs<JourneyAggregate>(response.body).journey.currentStage).toBe("APPAREL");
    expect(await prisma.journeyStep.count({ where: { journeyId: apparel.journey.id } })).toBe(2);
  });

  it("returns STALE_JOURNEY_STEP after two stages have advanced", async () => {
    const accessory = await reachAccessory();
    const response = await api
      .post(`/api/journeys/${accessory.journey.id}/next`)
      .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
      .send({ expectedStepNumber: 1 })
      .expect(409);
    expect(errorCode(response.body)).toBe("STALE_JOURNEY_STEP");
  });

  it("keeps one next Step under two fast next requests", async () => {
    const bag = await selectCurrent(await startJourney());
    const calls = await Promise.all(
      [1, 1].map((expectedStepNumber) =>
        api
          .post(`/api/journeys/${bag.journey.id}/next`)
          .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
          .send({ expectedStepNumber }),
      ),
    );
    expect(calls.map((response) => response.status)).toEqual([200, 200]);
    expect(await prisma.journeyStep.count({ where: { journeyId: bag.journey.id } })).toBe(2);
  });

  it("keeps one Result under two fast finish requests", async () => {
    const apparel = await reachApparel(true);
    const calls = await Promise.all(
      [2, 2].map((expectedStepNumber) =>
        api
          .post(`/api/journeys/${apparel.journey.id}/finish`)
          .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
          .send({ expectedStepNumber }),
      ),
    );
    expect(calls.map((response) => response.status)).toEqual([200, 200]);
    expect(await prisma.journeyResult.count({ where: { journeyId: apparel.journey.id } })).toBe(1);
    expect(await prisma.journeyResultItem.count({ where: { journeyResult: { journeyId: apparel.journey.id } } })).toBe(2);
  });

  it("returns the same Result for repeated finish", async () => {
    const finished = await finishAtApparel();
    const response = await api
      .post(`/api/journeys/${finished.journey.id}/finish`)
      .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
      .send({ expectedStepNumber: 2 })
      .expect(200);
    expect(dataAs<JourneyAggregate>(response.body).result?.id).toBe(finished.result?.id);
  });
});

describe("SQLite recovery with a new Prisma Client", () => {
  it("restores READY after disconnect and client recreation", async () => {
    const ready = await createReadyJourney();
    expect(await readAfterPrismaRestart(ready.journey.id)).toEqual(ready);
  });

  it("restores selected APPAREL after disconnect and client recreation", async () => {
    const apparel = await reachApparel(true);
    expect(await readAfterPrismaRestart(apparel.journey.id)).toEqual(apparel);
  });

  it("restores FINISHED Result after disconnect and client recreation", async () => {
    const finished = await finishAtApparel();
    expect(await readAfterPrismaRestart(finished.journey.id)).toEqual(finished);
  });
});
