import {
  DEMO_USER_HEADER_NAME,
  IDEMPOTENCY_KEY_HEADER_NAME,
  type CustomerJourneyResultView,
  type JourneyAggregate,
  type ReservationView,
  type SharedJourneyResultView,
  type StaffJourneyView,
  type StaffReservationListItem,
} from "@mcm/shared";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { disconnectPrisma, prisma } from "../lib/prisma.js";

const CUSTOMER_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_CUSTOMER_ID = "10000000-0000-4000-8000-000000000002";
const STAFF_ID = "10000000-0000-4000-8000-000000000003";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const TEMP_STORE_ID = "20000000-0000-4000-8000-000000000009";
const PREFIX = "90000000-";
const app = createApp();
const api = request(app);
let counter = 1;

function nextUuid() {
  return `90000000-0000-4000-8000-${String(counter++).padStart(12, "0")}`;
}

function dataAs<T>(body: unknown) {
  return (body as { data: T }).data;
}

function errorCode(body: unknown) {
  return (body as { error: { code: string } }).error.code;
}

async function cleanup() {
  await prisma.journey.deleteMany({ where: { reservationId: { startsWith: PREFIX } } });
  await prisma.reservation.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.store.deleteMany({ where: { id: TEMP_STORE_ID } });
}

async function createReservation(userId = CUSTOMER_ID, storeId = STORE_ID) {
  const id = nextUuid();
  const response = await api
    .post("/api/reservations")
    .set(DEMO_USER_HEADER_NAME, userId)
    .set(IDEMPOTENCY_KEY_HEADER_NAME, id)
    .send({
      storeId,
      reservedAt: "2026-08-15T03:00:00.000Z",
      startQuestionCode: "TODAY_INTENT",
      startAnswerCode: "LIGHT_EXPLORATION",
      startAnswerLabel: "새로운 스타일을 가볍게 시도하고 싶어요",
    })
    .expect(201);
  return dataAs<ReservationView>(response.body);
}

async function createReady() {
  const reservation = await createReservation();
  const response = await api
    .post("/api/reservations/check-in")
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({ reservationCode: reservation.reservationCode })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function start() {
  const ready = await createReady();
  const response = await api
    .post(`/api/journeys/${ready.journey.id}/start`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function selectFirst(aggregate: JourneyAggregate) {
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

async function next(aggregate: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/next`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({ expectedStepNumber: aggregate.journey.currentStepNumber })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function finish() {
  let aggregate = await selectFirst(await start());
  aggregate = await next(aggregate);
  aggregate = await selectFirst(aggregate);
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/finish`)
    .set(DEMO_USER_HEADER_NAME, CUSTOMER_ID)
    .send({ expectedStepNumber: 2 })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

beforeEach(async () => {
  counter = 1;
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await disconnectPrisma();
});

describe("stored customer Journey result", () => {
  it("returns a FINISHED result", async () => {
    const finished = await finish();
    const response = await api.get(`/api/journeys/${finished.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(200);
    expect(dataAs<CustomerJourneyResultView>(response.body).id).toBe(finished.result?.id);
  });
  it("returns RESULT_NOT_READY for ACTIVE", async () => {
    const active = await start();
    const response = await api.get(`/api/journeys/${active.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(409);
    expect(errorCode(response.body)).toBe("RESULT_NOT_READY");
  });
  it("returns RESULT_NOT_READY for READY", async () => {
    const ready = await createReady();
    const response = await api.get(`/api/journeys/${ready.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(409);
    expect(errorCode(response.body)).toBe("RESULT_NOT_READY");
  });
  it("rejects another customer", async () => {
    const finished = await finish();
    const response = await api.get(`/api/journeys/${finished.journey.id}/result`).set(DEMO_USER_HEADER_NAME, OTHER_CUSTOMER_ID).expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });
  it("returns not found for an unknown Journey", async () => {
    await api.get(`/api/journeys/${nextUuid()}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(404);
  });
  it("does not mutate the stored result on repeated GET", async () => {
    const finished = await finish();
    const before = await prisma.journeyResult.findUniqueOrThrow({ where: { journeyId: finished.journey.id } });
    await api.get(`/api/journeys/${finished.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(200);
    await api.get(`/api/journeys/${finished.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(200);
    const after = await prisma.journeyResult.findUniqueOrThrow({ where: { journeyId: finished.journey.id } });
    expect(after).toEqual(before);
  });
  it("does not create AIExecution on result GET", async () => {
    const finished = await finish();
    const before = await prisma.aIExecution.count({ where: { journeyId: finished.journey.id } });
    await api.get(`/api/journeys/${finished.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(200);
    expect(await prisma.aIExecution.count({ where: { journeyId: finished.journey.id } })).toBe(before);
  });
  it("does not expose staffSummary", async () => {
    const finished = await finish();
    const response = await api.get(`/api/journeys/${finished.journey.id}/result`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(200);
    expect(JSON.stringify(response.body)).not.toContain("staffSummary");
  });
});

describe("public shared Journey result", () => {
  it("returns a result by shareToken", async () => {
    const finished = await finish();
    const response = await api.get(`/api/share/${finished.result!.shareToken}`).expect(200);
    expect(dataAs<SharedJourneyResultView>(response.body).signatureName).toBe(finished.result?.signatureName);
  });
  it("returns not found for an invalid token", async () => {
    await api.get("/api/share/not-a-real-share-token").expect(404);
  });
  it("works without a demo user header", async () => {
    const finished = await finish();
    await api.get(`/api/share/${finished.result!.shareToken}`).expect(200);
  });
  it("keeps result item selection order", async () => {
    const finished = await finish();
    const response = await api.get(`/api/share/${finished.result!.shareToken}`).expect(200);
    expect(dataAs<SharedJourneyResultView>(response.body).items.map((item) => item.selectionOrder)).toEqual([1, 2]);
  });
  for (const field of ["userId", "email", "profileType", "staffSummary", "reservationCode", "qrToken", "behaviorSummary", "AIExecution", "requestJson", "responseJson"]) {
    it(`does not expose ${field}`, async () => {
      const finished = await finish();
      const response = await api.get(`/api/share/${finished.result!.shareToken}`).expect(200);
      expect(JSON.stringify(response.body)).not.toContain(field);
    });
  }
});

describe("staff reservations", () => {
  it("allows STAFF to list reservations", async () => {
    await createReservation();
    const response = await api.get("/api/staff/reservations").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffReservationListItem[]>(response.body).some((item) => item.reservationId.startsWith(PREFIX))).toBe(true);
  });
  it("rejects CUSTOMER access", async () => {
    await api.get("/api/staff/reservations").set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(403);
  });
  it("filters by store in the database query", async () => {
    await prisma.store.create({ data: { id: TEMP_STORE_ID, code: "TEMP-STAFF", name: "Temporary Staff Store", location: "Demo", isJourneyEnabled: true, isActive: true } });
    const reservation = await createReservation(CUSTOMER_ID, TEMP_STORE_ID);
    const response = await api.get(`/api/staff/reservations?storeId=${TEMP_STORE_ID}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffReservationListItem[]>(response.body).map((item) => item.reservationId)).toContain(reservation.id);
    expect(dataAs<StaffReservationListItem[]>(response.body).every((item) => item.store.id === TEMP_STORE_ID)).toBe(true);
  });
  it("returns not found for an unknown store filter", async () => {
    await api.get(`/api/staff/reservations?storeId=${nextUuid()}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(404);
  });
  it("filters by Reservation status", async () => {
    const reservation = await createReservation();
    await prisma.reservation.update({ where: { id: reservation.id }, data: { status: "EXPIRED" } });
    const response = await api.get("/api/staff/reservations?status=EXPIRED").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffReservationListItem[]>(response.body).some((item) => item.reservationId === reservation.id)).toBe(true);
  });
  it("filters by UTC calendar date", async () => {
    const reservation = await createReservation();
    const response = await api.get("/api/staff/reservations?date=2026-08-15").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffReservationListItem[]>(response.body).some((item) => item.reservationId === reservation.id)).toBe(true);
  });
  it("rejects an invalid date", async () => {
    await api.get("/api/staff/reservations?date=2026-02-31").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(400);
  });
  it("sorts reservations by reservedAt ascending", async () => {
    const first = await createReservation();
    const second = await createReservation();
    await prisma.reservation.update({ where: { id: first.id }, data: { reservedAt: new Date("2026-08-16T03:00:00.000Z") } });
    const response = await api.get("/api/staff/reservations").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    const ids = dataAs<StaffReservationListItem[]>(response.body).filter((item) => item.reservationId.startsWith(PREFIX)).map((item) => item.reservationId);
    expect(ids).toEqual([second.id, first.id]);
  });
  it("returns null Journey before check-in", async () => {
    const reservation = await createReservation();
    const response = await api.get("/api/staff/reservations").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffReservationListItem[]>(response.body).find((item) => item.reservationId === reservation.id)?.journey).toBeNull();
  });
  it("returns Journey progress after check-in", async () => {
    const ready = await createReady();
    const response = await api.get("/api/staff/reservations").set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffReservationListItem[]>(response.body).find((item) => item.reservationId === ready.reservation.id)?.journey?.status).toBe("READY");
  });
});

describe("staff Journey detail", () => {
  it("returns READY", async () => {
    const ready = await createReady();
    const response = await api.get(`/api/staff/journeys/${ready.journey.id}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffJourneyView>(response.body).journey.status).toBe("READY");
  });
  it("returns ACTIVE steps and snapshot", async () => {
    const active = await start();
    const response = await api.get(`/api/staff/journeys/${active.journey.id}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    const body = dataAs<StaffJourneyView>(response.body);
    expect(body.steps).toHaveLength(1);
    expect(body.profileSnapshot).not.toBeNull();
  });
  it("returns CANCELLED", async () => {
    const ready = await createReady();
    const cancelledAt = new Date("2026-08-11T00:00:00.000Z");
    await prisma.journey.update({
      where: { id: ready.journey.id },
      data: { status: "CANCELLED", cancelledAt },
    });
    await prisma.reservation.update({
      where: { id: ready.reservation.id },
      data: { status: "CANCELLED", cancelledAt },
    });

    const response = await api
      .get(`/api/staff/journeys/${ready.journey.id}`)
      .set(DEMO_USER_HEADER_NAME, STAFF_ID)
      .expect(200);
    expect(dataAs<StaffJourneyView>(response.body).journey.status).toBe("CANCELLED");
  });
  it("returns FINISHED staffSummary", async () => {
    const finished = await finish();
    const response = await api.get(`/api/staff/journeys/${finished.journey.id}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(dataAs<StaffJourneyView>(response.body).result?.staffSummary.length).toBeGreaterThan(0);
  });
  it("rejects CUSTOMER detail access", async () => {
    const ready = await createReady();
    await api.get(`/api/staff/journeys/${ready.journey.id}`).set(DEMO_USER_HEADER_NAME, CUSTOMER_ID).expect(403);
  });
  it("returns not found for an unknown Journey", async () => {
    await api.get(`/api/staff/journeys/${nextUuid()}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(404);
  });
  it("does not expose email or raw behavior", async () => {
    const finished = await finish();
    const response = await api.get(`/api/staff/journeys/${finished.journey.id}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    const json = JSON.stringify(response.body);
    for (const field of ["email", "behaviorSummaryJson", "onlineBehaviors", "qrToken", "requestJson", "responseJson"]) expect(json).not.toContain(field);
  });
  it("does not create AIExecution on staff GET", async () => {
    const finished = await finish();
    const before = await prisma.aIExecution.count({ where: { journeyId: finished.journey.id } });
    await api.get(`/api/staff/journeys/${finished.journey.id}`).set(DEMO_USER_HEADER_NAME, STAFF_ID).expect(200);
    expect(await prisma.aIExecution.count({ where: { journeyId: finished.journey.id } })).toBe(before);
  });
});
