import {
  DEMO_USER_HEADER_NAME,
  IDEMPOTENCY_KEY_HEADER_NAME,
  type ConsentResponse,
  type JourneyAggregate,
  type ReservationView,
} from "@mcm/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { CURRENT_CONSENT_VERSION } from "../constants/consent.js";
import { disconnectPrisma, prisma } from "../lib/prisma.js";

const STABLE_USER_ID = "10000000-0000-4000-8000-000000000001";
const BOLD_USER_ID = "10000000-0000-4000-8000-000000000002";
const STAFF_USER_ID = "10000000-0000-4000-8000-000000000003";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const CONSENT_USER_ID = "80000000-0000-4000-8000-000000000001";
const NO_CONSENT_USER_ID = "80000000-0000-4000-8000-000000000002";
const DENIED_USER_ID = "80000000-0000-4000-8000-000000000003";
const INACTIVE_STORE_ID = "80000000-0000-4000-8000-000000000004";
const DISABLED_STORE_ID = "80000000-0000-4000-8000-000000000005";
const MISSING_ID = "80000000-0000-4000-8000-000000000099";
const RESERVATION_PREFIX = "70000000-";

const app = createApp();
const api = request(app);

let reservationSequence = 1;

const reservationBody = {
  storeId: STORE_ID,
  reservedAt: "2026-08-10T10:00:00.000Z",
  startQuestionCode: "TODAY_INTENT",
  startAnswerCode: "EXPLORE_CLASSIC",
  startAnswerLabel: "Explore a timeless look",
};

function nextReservationId() {
  const suffix = String(reservationSequence).padStart(12, "0");
  reservationSequence += 1;
  return `70000000-0000-4000-8000-${suffix}`;
}

function errorCode(responseBody: unknown) {
  return (responseBody as { error: { code: string } }).error.code;
}

function dataAs<T>(responseBody: unknown) {
  return (responseBody as { data: T }).data;
}

async function deleteTestReservations() {
  await prisma.journey.deleteMany({
    where: { reservationId: { startsWith: RESERVATION_PREFIX } },
  });
  await prisma.reservation.deleteMany({
    where: { id: { startsWith: RESERVATION_PREFIX } },
  });
}

function createReservation(
  options: {
    userId?: string;
    idempotencyKey?: string;
    body?: Record<string, unknown>;
  } = {},
) {
  return api
    .post("/api/reservations")
    .set(DEMO_USER_HEADER_NAME, options.userId ?? STABLE_USER_ID)
    .set(IDEMPOTENCY_KEY_HEADER_NAME, options.idempotencyKey ?? nextReservationId())
    .send(options.body ?? reservationBody);
}

async function createReservationData() {
  const response = await createReservation();
  expect(response.status).toBe(201);
  return dataAs<ReservationView>(response.body);
}

beforeAll(async () => {
  await deleteTestReservations();
  await prisma.consent.deleteMany({
    where: { userId: { in: [CONSENT_USER_ID, NO_CONSENT_USER_ID, DENIED_USER_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [CONSENT_USER_ID, NO_CONSENT_USER_ID, DENIED_USER_ID] } },
  });
  await prisma.store.deleteMany({
    where: { id: { in: [INACTIVE_STORE_ID, DISABLED_STORE_ID] } },
  });

  await prisma.user.createMany({
    data: [
      {
        id: CONSENT_USER_ID,
        email: "consent.owner@example.demo",
        name: "Consent Owner",
        role: "CUSTOMER",
        isActive: true,
      },
      {
        id: NO_CONSENT_USER_ID,
        email: "no.consent@example.demo",
        name: "No Consent Customer",
        role: "CUSTOMER",
        isActive: true,
      },
      {
        id: DENIED_USER_ID,
        email: "denied.consent@example.demo",
        name: "Denied Consent Customer",
        role: "CUSTOMER",
        isActive: true,
      },
    ],
  });
  await prisma.consent.create({
    data: {
      userId: DENIED_USER_ID,
      consentVersion: CURRENT_CONSENT_VERSION,
      behaviorDataAllowed: true,
      journeyDataAllowed: false,
      marketingAllowed: false,
    },
  });
  await prisma.store.createMany({
    data: [
      {
        id: INACTIVE_STORE_ID,
        code: "STAGE4-INACTIVE",
        name: "Stage 4 Inactive Store",
        location: "Test",
        isJourneyEnabled: true,
        isActive: false,
      },
      {
        id: DISABLED_STORE_ID,
        code: "STAGE4-DISABLED",
        name: "Stage 4 Journey Disabled Store",
        location: "Test",
        isJourneyEnabled: false,
        isActive: true,
      },
    ],
  });
});

beforeEach(async () => {
  reservationSequence = 1;
  await deleteTestReservations();
  await prisma.consent.deleteMany({ where: { userId: CONSENT_USER_ID } });
});

afterAll(async () => {
  await deleteTestReservations();
  await prisma.consent.deleteMany({
    where: { userId: { in: [CONSENT_USER_ID, NO_CONSENT_USER_ID, DENIED_USER_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [CONSENT_USER_ID, NO_CONSENT_USER_ID, DENIED_USER_ID] } },
  });
  await prisma.store.deleteMany({
    where: { id: { in: [INACTIVE_STORE_ID, DISABLED_STORE_ID] } },
  });
  await disconnectPrisma();
});

describe("consent API", () => {
  it("returns null when the owner has no current consent", async () => {
    const response = await api
      .get(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .expect(200);

    expect(dataAs<ConsentResponse>(response.body).currentConsent).toBeNull();
  });

  it("returns the existing current consent", async () => {
    const response = await api
      .get(`/api/users/${STABLE_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);

    expect(dataAs<ConsentResponse>(response.body).currentConsent?.userId).toBe(
      STABLE_USER_ID,
    );
  });

  it("creates the first consent record", async () => {
    const response = await api
      .put(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .send({ behaviorDataAllowed: true, journeyDataAllowed: true })
      .expect(200);

    expect(dataAs<ConsentResponse>(response.body).currentConsent).toMatchObject({
      userId: CONSENT_USER_ID,
      consentVersion: CURRENT_CONSENT_VERSION,
      behaviorDataAllowed: true,
      journeyDataAllowed: true,
    });
  });

  it("does not add a row for an identical repeated PUT", async () => {
    const body = { behaviorDataAllowed: true, journeyDataAllowed: true };
    await api
      .put(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .send(body)
      .expect(200);
    await api
      .put(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .send(body)
      .expect(200);

    expect(await prisma.consent.count({ where: { userId: CONSENT_USER_ID } })).toBe(1);
  });

  it("appends consent history when values change", async () => {
    await api
      .put(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .send({ behaviorDataAllowed: false, journeyDataAllowed: true })
      .expect(200);
    const response = await api
      .put(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .send({ behaviorDataAllowed: true, journeyDataAllowed: true })
      .expect(200);

    expect(await prisma.consent.count({ where: { userId: CONSENT_USER_ID } })).toBe(2);
    expect(dataAs<ConsentResponse>(response.body).currentConsent?.behaviorDataAllowed).toBe(
      true,
    );
  });

  it("always fixes marketingAllowed to false", async () => {
    const response = await api
      .put(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, CONSENT_USER_ID)
      .send({ behaviorDataAllowed: true, journeyDataAllowed: true })
      .expect(200);

    expect(dataAs<ConsentResponse>(response.body).currentConsent?.marketingAllowed).toBe(
      false,
    );
  });

  it("requires the demo user header", async () => {
    const response = await api
      .get(`/api/users/${CONSENT_USER_ID}/consent`)
      .expect(401);
    expect(errorCode(response.body)).toBe("DEMO_USER_REQUIRED");
  });

  it("rejects another customer owner", async () => {
    const response = await api
      .get(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, BOLD_USER_ID)
      .expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("rejects STAFF from the OWNER consent endpoint", async () => {
    const response = await api
      .get(`/api/users/${CONSENT_USER_ID}/consent`)
      .set(DEMO_USER_HEADER_NAME, STAFF_USER_ID)
      .expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });
});

describe("reservation creation", () => {
  it("creates a reservation with status 201", async () => {
    const response = await createReservation();
    expect(response.status).toBe(201);
    expect(dataAs<ReservationView>(response.body).status).toBe("RESERVED");
  });

  it("creates an unguessable QR token", async () => {
    const reservation = dataAs<ReservationView>((await createReservation()).body);
    expect(reservation.qrToken.length).toBeGreaterThanOrEqual(32);
    expect(reservation.qrToken).not.toContain(reservation.userId);
  });

  it("creates an eight-character manual reservation code", async () => {
    const reservation = dataAs<ReservationView>((await createReservation()).body);
    expect(reservation.reservationCode).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("returns 200 for the same Idempotency-Key and body", async () => {
    const key = nextReservationId();
    await createReservation({ idempotencyKey: key }).expect(201);
    const repeated = await createReservation({ idempotencyKey: key }).expect(200);
    expect(dataAs<ReservationView>(repeated.body).id).toBe(key);
  });

  it("does not increase reservation count after an idempotent replay", async () => {
    const key = nextReservationId();
    await createReservation({ idempotencyKey: key }).expect(201);
    await createReservation({ idempotencyKey: key }).expect(200);
    expect(await prisma.reservation.count({ where: { id: key } })).toBe(1);
  });

  it("returns RESOURCE_CONFLICT when a key is reused with another body", async () => {
    const key = nextReservationId();
    await createReservation({ idempotencyKey: key }).expect(201);
    const response = await createReservation({
      idempotencyKey: key,
      body: { ...reservationBody, startAnswerCode: "DIFFERENT" },
    }).expect(409);
    expect(errorCode(response.body)).toBe("RESOURCE_CONFLICT");
  });

  it("rejects a missing Idempotency-Key", async () => {
    const response = await api
      .post("/api/reservations")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send(reservationBody)
      .expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-UUID Idempotency-Key", async () => {
    const response = await createReservation({ idempotencyKey: "not-a-uuid" }).expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("requires journeyDataAllowed consent", async () => {
    const response = await createReservation({ userId: DENIED_USER_ID }).expect(403);
    expect(errorCode(response.body)).toBe("CONSENT_REQUIRED");
  });

  it("rejects reservation creation without consent", async () => {
    const response = await createReservation({ userId: NO_CONSENT_USER_ID }).expect(403);
    expect(errorCode(response.body)).toBe("CONSENT_REQUIRED");
  });

  it("does not allow an inactive store", async () => {
    const response = await createReservation({
      body: { ...reservationBody, storeId: INACTIVE_STORE_ID },
    }).expect(404);
    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("does not allow a Journey-disabled store", async () => {
    const response = await createReservation({
      body: { ...reservationBody, storeId: DISABLED_STORE_ID },
    }).expect(404);
    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects an invalid reservedAt value", async () => {
    const response = await createReservation({
      body: { ...reservationBody, reservedAt: "tomorrow" },
    }).expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("rejects a missing required question value", async () => {
    const { startAnswerLabel: _omitted, ...body } = reservationBody;
    const response = await createReservation({ body }).expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });
});

describe("reservation lookup", () => {
  it("allows the owner to get a reservation by ID", async () => {
    const reservation = await createReservationData();
    const response = await api
      .get(`/api/reservations/${reservation.id}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    expect(dataAs<ReservationView>(response.body).id).toBe(reservation.id);
  });

  it("allows STAFF to get a reservation by ID", async () => {
    const reservation = await createReservationData();
    await api
      .get(`/api/reservations/${reservation.id}`)
      .set(DEMO_USER_HEADER_NAME, STAFF_USER_ID)
      .expect(200);
  });

  it("rejects another CUSTOMER", async () => {
    const reservation = await createReservationData();
    const response = await api
      .get(`/api/reservations/${reservation.id}`)
      .set(DEMO_USER_HEADER_NAME, BOLD_USER_ID)
      .expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("gets a reservation by manual code", async () => {
    const reservation = await createReservationData();
    const response = await api
      .get(`/api/reservations/code/${reservation.reservationCode}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    expect(dataAs<ReservationView>(response.body).id).toBe(reservation.id);
  });

  it("rejects an invalid reservation code format", async () => {
    const response = await api
      .get("/api/reservations/code/short")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for a missing reservation", async () => {
    const response = await api
      .get(`/api/reservations/${MISSING_ID}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(404);
    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("keeps the code route ahead of the dynamic ID route", async () => {
    const response = await api
      .get("/api/reservations/code/ABCDEFGH")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(404);
    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });
});

describe("reservation check-in", () => {
  it("checks in with a QR token", async () => {
    const reservation = await createReservationData();
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(200);
    expect(dataAs<JourneyAggregate>(response.body).journey.reservationId).toBe(
      reservation.id,
    );
  });

  it("checks in with a manual reservation code", async () => {
    const reservation = await createReservationData();
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ reservationCode: reservation.reservationCode })
      .expect(200);
    expect(dataAs<JourneyAggregate>(response.body).journey.reservationId).toBe(
      reservation.id,
    );
  });

  it("rejects both check-in identifiers", async () => {
    const reservation = await createReservationData();
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({
        qrToken: reservation.qrToken,
        reservationCode: reservation.reservationCode,
      })
      .expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("rejects a check-in without an identifier", async () => {
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({})
      .expect(400);
    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("updates the reservation to CHECKED_IN", async () => {
    const reservation = await createReservationData();
    await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(200);
    const stored = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    expect(stored.status).toBe("CHECKED_IN");
    expect(stored.checkedInAt).not.toBeNull();
  });

  it("creates one READY Journey", async () => {
    const reservation = await createReservationData();
    await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(200);
    const journey = await prisma.journey.findUniqueOrThrow({
      where: { reservationId: reservation.id },
    });
    expect(journey).toMatchObject({
      status: "READY",
      currentStage: "INTRO",
      currentStepNumber: 0,
      startedAt: null,
    });
  });

  it("returns every READY aggregate invariant", async () => {
    const reservation = await createReservationData();
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(200);
    const aggregate = dataAs<JourneyAggregate>(response.body);

    expect(aggregate.journey).toMatchObject({
      status: "READY",
      currentStage: "INTRO",
      currentStepNumber: 0,
      startedAt: null,
    });
    expect(aggregate.profileSnapshot).toBeNull();
    expect(aggregate.currentStep).toBeNull();
    expect(aggregate.completedSteps).toEqual([]);
    expect(aggregate.interactions).toEqual([]);
    expect(aggregate.canFinishJourney).toBe(false);
    expect(aggregate.result).toBeNull();
    expect(aggregate.reservation).not.toHaveProperty("qrToken");
    expect(aggregate.reservation).not.toHaveProperty("reservationCode");
  });

  it("does not create another Journey for a repeated check-in", async () => {
    const reservation = await createReservationData();
    const call = () =>
      api
        .post("/api/reservations/check-in")
        .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
        .send({ qrToken: reservation.qrToken });
    await call().expect(200);
    await call().expect(200);
    expect(await prisma.journey.count({ where: { reservationId: reservation.id } })).toBe(
      1,
    );
  });

  it("returns the same Journey through QR then manual code", async () => {
    const reservation = await createReservationData();
    const first = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(200);
    const second = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ reservationCode: reservation.reservationCode })
      .expect(200);
    expect(dataAs<JourneyAggregate>(second.body).journey.id).toBe(
      dataAs<JourneyAggregate>(first.body).journey.id,
    );
  });

  it("allows STAFF to check in a customer reservation", async () => {
    const reservation = await createReservationData();
    await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STAFF_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(200);
  });

  it("rejects another CUSTOMER check-in", async () => {
    const reservation = await createReservationData();
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, BOLD_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(403);
    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("rejects a CANCELLED reservation", async () => {
    const reservation = await createReservationData();
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ qrToken: reservation.qrToken })
      .expect(409);
    expect(errorCode(response.body)).toBe("INVALID_STATE");
  });

  it("rejects an EXPIRED reservation", async () => {
    const reservation = await createReservationData();
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "EXPIRED" },
    });
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .send({ reservationCode: reservation.reservationCode })
      .expect(409);
    expect(errorCode(response.body)).toBe("INVALID_STATE");
  });

  it("returns 404 for an unknown token or code", async () => {
    const response = await api
      .post("/api/reservations/check-in")
      .set(DEMO_USER_HEADER_NAME, STAFF_USER_ID)
      .send({ reservationCode: "ZZZZZZZZ" })
      .expect(404);
    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("keeps one Journey under concurrent duplicate requests", async () => {
    const reservation = await createReservationData();
    const calls = await Promise.all(
      [reservation.qrToken, reservation.qrToken].map((qrToken) =>
        api
          .post("/api/reservations/check-in")
          .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
          .send({ qrToken }),
      ),
    );

    expect(calls.map((response) => response.status)).toEqual([200, 200]);
    expect(
      new Set(
        calls.map(
          (response) => dataAs<JourneyAggregate>(response.body).journey.id,
        ),
      ).size,
    ).toBe(1);
    expect(await prisma.journey.count({ where: { reservationId: reservation.id } })).toBe(
      1,
    );
  });
});
