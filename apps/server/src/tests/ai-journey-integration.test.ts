import {
  DEMO_USER_HEADER_NAME,
  IDEMPOTENCY_KEY_HEADER_NAME,
  type JourneyAggregate,
  type ReservationView,
} from "@mcm/shared";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { disconnectPrisma, prisma } from "../lib/prisma.js";
import { setAiRuntimeForTests } from "../services/ai/ai-runtime.js";
import type {
  AiConfig,
  AiResponseClient,
  StructuredResponseRequest,
} from "../services/ai/ai-types.js";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const PREFIX = "71000000-";
const config: AiConfig = {
  enabled: true,
  apiKey: "integration-test-key-not-real",
  model: "gpt-5.6-terra",
  reasoningEffort: "medium",
  timeoutMs: 10_000,
};

type ProviderMode = "success" | "fail" | "step-only" | "result-only";

class JourneyFakeClient implements AiResponseClient {
  readonly requests: StructuredResponseRequest[] = [];
  onRequest: ((request: StructuredResponseRequest) => Promise<void>) | null = null;

  constructor(private readonly mode: ProviderMode) {}

  async generateStructured(requestData: StructuredResponseRequest) {
    this.requests.push(requestData);
    if (this.onRequest) await this.onRequest(requestData);
    const isStep = requestData.schemaName === "mcm_journey_step";
    const shouldFail =
      this.mode === "fail" ||
      (this.mode === "step-only" && !isStep) ||
      (this.mode === "result-only" && isStep);
    if (shouldFail) throw new Error("FAKE_PROVIDER_FAILURE");

    const input = JSON.parse(requestData.input) as Record<string, unknown>;
    if (isStep) {
      const candidates = input.candidateProducts as Array<{
        productId: string;
        recommendationType: string;
      }>;
      const zones = input.allowedZones as Array<{ zoneId: string }>;
      const ids = candidates.slice(0, Math.min(3, candidates.length)).map((item) => item.productId);
      const challenge = candidates.find(
        (item) => ids.includes(item.productId) && item.recommendationType === "CHALLENGE",
      );
      return {
        modelName: "mock-step-model",
        outputText: JSON.stringify({
          scenarioTitle: "AI가 구성한 매장 Journey",
          scenarioText: "허용된 제품을 직접 비교해 오늘의 스타일 흐름을 이어가세요.",
          nextZoneId: zones[0]!.zoneId,
          recommendedProductIds: ids,
          challengeProductId: challenge?.productId ?? null,
          recommendationReasons: ids.map((productId) => ({
            productId,
            reason: `${productId}는 현재 선택과 연결되는 허용 후보입니다.`,
          })),
          canFinishJourney: input.serverCanFinishJourney,
        }),
      };
    }

    const products = input.finalSelectedProducts as Array<{
      productId: string;
      name: string;
    }>;
    const scenes = input.allowedSceneKeys as string[];
    return {
      modelName: "mock-result-model",
      outputText: JSON.stringify({
        signatureName: "MCM Connected Journey",
        signatureStory: "최종 선택이 기존 취향과 새로운 시도를 자연스럽게 연결했습니다.",
        finalLookSummary: "선택한 제품을 순서대로 연결한 MCM 룩입니다.",
        productReasons: products.map((product) => ({
          productId: product.productId,
          reason: `${product.name}은 전체 스타일 흐름을 이어줍니다.`,
        })),
        staffSummary: `최종 선택 제품은 ${products.map((item) => item.name).join(", ")}입니다.`,
        sceneKey: scenes[0] ?? null,
      }),
    };
  }
}

const app = createApp();
const api = request(app);
let sequence = 1;

function uuid() {
  return `71000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
}

function dataAs<T>(body: unknown) {
  return (body as { data: T }).data;
}

async function cleanup() {
  await prisma.journey.deleteMany({ where: { reservationId: { startsWith: PREFIX } } });
  await prisma.reservation.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.inventory.updateMany({ where: { storeId: STORE_ID }, data: { quantity: 5, isDisplayAvailable: true } });
}

async function createJourney() {
  const reservationId = uuid();
  const response = await api
    .post("/api/reservations")
    .set(DEMO_USER_HEADER_NAME, USER_ID)
    .set(IDEMPOTENCY_KEY_HEADER_NAME, reservationId)
    .send({
      storeId: STORE_ID,
      reservedAt: "2026-08-15T10:00:00.000Z",
      startQuestionCode: "TODAY_INTENT",
      startAnswerCode: "SIGNATURE",
      startAnswerLabel: "나만의 시그니처 찾기",
    })
    .expect(201);
  const reservation = dataAs<ReservationView>(response.body);
  const checkIn = await api
    .post("/api/reservations/check-in")
    .set(DEMO_USER_HEADER_NAME, USER_ID)
    .send({ qrToken: reservation.qrToken })
    .expect(200);
  return dataAs<JourneyAggregate>(checkIn.body);
}

async function start(ready: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${ready.journey.id}/start`)
    .set(DEMO_USER_HEADER_NAME, USER_ID)
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function selectFirst(aggregate: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/interactions`)
    .set(DEMO_USER_HEADER_NAME, USER_ID)
    .send({
      interactionId: uuid(),
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
    .set(DEMO_USER_HEADER_NAME, USER_ID)
    .send({ expectedStepNumber: aggregate.journey.currentStepNumber })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function finish(aggregate: JourneyAggregate) {
  const response = await api
    .post(`/api/journeys/${aggregate.journey.id}/finish`)
    .set(DEMO_USER_HEADER_NAME, USER_ID)
    .send({ expectedStepNumber: aggregate.journey.currentStepNumber })
    .expect(200);
  return dataAs<JourneyAggregate>(response.body);
}

async function completeJourney() {
  let aggregate = await start(await createJourney());
  aggregate = await next(await selectFirst(aggregate));
  aggregate = await next(await selectFirst(aggregate));
  aggregate = await selectFirst(aggregate);
  return finish(aggregate);
}

beforeEach(async () => {
  sequence = 1;
  await cleanup();
});

afterEach(() => setAiRuntimeForTests(null));

afterAll(async () => {
  await cleanup();
  await disconnectPrisma();
});

describe("AI-enabled Journey integration", () => {
  it("completes BAG through RESULT with validated AI outputs", async () => {
    const client = new JourneyFakeClient("success");
    setAiRuntimeForTests({ config, client });
    const finished = await completeJourney();
    expect(finished.journey.status).toBe("FINISHED");
    expect(finished.completedSteps.every((step) => !step.usedFallback)).toBe(true);
    expect(finished.completedSteps.flatMap((step) => step.recommendations).every((item) => item.isAiSelected)).toBe(true);
    expect(finished.result?.usedFallback).toBe(false);
    expect(client.requests).toHaveLength(4);
    const executions = await prisma.aIExecution.findMany({ where: { journeyId: finished.journey.id } });
    expect(executions).toHaveLength(4);
    expect(executions.every((item) => item.status === "SUCCESS" && item.validated)).toBe(true);
    expect(executions.filter((item) => item.purpose === "JOURNEY_RESULT")[0]?.journeyStepId).toBeNull();
  });

  it("finishes the same flow when every provider attempt fails", async () => {
    const client = new JourneyFakeClient("fail");
    setAiRuntimeForTests({ config, client });
    const finished = await completeJourney();
    expect(finished.completedSteps.every((step) => step.usedFallback)).toBe(true);
    expect(finished.result?.usedFallback).toBe(true);
    expect(client.requests).toHaveLength(8);
    const executions = await prisma.aIExecution.findMany({ where: { journeyId: finished.journey.id } });
    expect(executions.every((item) => item.status === "FALLBACK")).toBe(true);
  });

  it("completes the full Journey without a provider call when AI is disabled", async () => {
    const client = new JourneyFakeClient("success");
    setAiRuntimeForTests({ config: { ...config, enabled: false }, client });
    const finished = await completeJourney();
    expect(finished.journey.status).toBe("FINISHED");
    expect(finished.completedSteps.every((step) => step.usedFallback)).toBe(true);
    expect(finished.result?.usedFallback).toBe(true);
    expect(client.requests).toHaveLength(0);
    const executions = await prisma.aIExecution.findMany({ where: { journeyId: finished.journey.id } });
    expect(executions).toHaveLength(4);
    expect(executions.every((item) => item.errorMessage === "AI_DISABLED")).toBe(true);
  });

  it.each([
    ["step-only" as const, false, true],
    ["result-only" as const, true, false],
  ])("supports mixed %s AI and fallback results", async (mode, stepFallback, resultFallback) => {
    const client = new JourneyFakeClient(mode);
    setAiRuntimeForTests({ config, client });
    const finished = await completeJourney();
    expect(finished.completedSteps.every((step) => step.usedFallback === stepFallback)).toBe(true);
    expect(finished.result?.usedFallback).toBe(resultFallback);
  });

  it("does not call AI again when a stored Journey is recovered with GET", async () => {
    const client = new JourneyFakeClient("success");
    setAiRuntimeForTests({ config, client });
    const finished = await completeJourney();
    const before = client.requests.length;
    const response = await api
      .get(`/api/journeys/${finished.journey.id}`)
      .set(DEMO_USER_HEADER_NAME, USER_ID)
      .expect(200);
    expect(dataAs<JourneyAggregate>(response.body).result?.signatureName).toBe("MCM Connected Journey");
    expect(client.requests).toHaveLength(before);
  });

  it("revalidates state after AI and saves neither Step nor AIExecution when stale", async () => {
    const ready = await createJourney();
    const client = new JourneyFakeClient("success");
    client.onRequest = async (requestData) => {
      if (requestData.schemaName === "mcm_journey_step") {
        await prisma.journey.update({ where: { id: ready.journey.id }, data: { status: "CANCELLED" } });
      }
    };
    setAiRuntimeForTests({ config, client });
    await api
      .post(`/api/journeys/${ready.journey.id}/start`)
      .set(DEMO_USER_HEADER_NAME, USER_ID)
      .expect(409);
    expect(await prisma.journeyStep.count({ where: { journeyId: ready.journey.id } })).toBe(0);
    expect(await prisma.aIExecution.count({ where: { journeyId: ready.journey.id } })).toBe(0);
  });

  it("rolls back Result AIExecution when final persistence cannot complete", async () => {
    const client = new JourneyFakeClient("success");
    setAiRuntimeForTests({ config, client });
    let aggregate = await start(await createJourney());
    aggregate = await next(await selectFirst(aggregate));
    aggregate = await selectFirst(aggregate);
    const selectedId = aggregate.currentStep!.selectedProduct!.id;
    client.onRequest = async (requestData) => {
      if (requestData.schemaName === "mcm_journey_result") {
        await prisma.inventory.update({
          where: { storeId_productId: { storeId: STORE_ID, productId: selectedId } },
          data: { quantity: 0 },
        });
      }
    };
    await api
      .post(`/api/journeys/${aggregate.journey.id}/finish`)
      .set(DEMO_USER_HEADER_NAME, USER_ID)
      .send({ expectedStepNumber: 2 })
      .expect(409);
    expect(await prisma.aIExecution.count({ where: { journeyId: aggregate.journey.id, purpose: "JOURNEY_RESULT" } })).toBe(0);
    expect(await prisma.journeyResult.count({ where: { journeyId: aggregate.journey.id } })).toBe(0);
  });

  it("stores no prompts, stories, staff text, email or provider payload", async () => {
    const client = new JourneyFakeClient("success");
    setAiRuntimeForTests({ config, client });
    const finished = await completeJourney();
    const executions = await prisma.aIExecution.findMany({ where: { journeyId: finished.journey.id } });
    const serialized = JSON.stringify(executions);
    expect(serialized).not.toContain("stable.explorer@example.demo");
    expect(serialized).not.toContain("Stable Explorer");
    expect(serialized).not.toContain("AI가 구성한 매장 Journey");
    expect(serialized).not.toContain("MCM Connected Journey");
    expect(serialized).not.toContain("FAKE_PROVIDER_FAILURE");
  });
});
