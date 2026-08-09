import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  apiFailure,
  customer,
  reservation,
  store,
  success,
} from "./fixtures";
import {
  authenticate,
  authenticatedResponses,
  mockFetchQueue,
  renderApp,
} from "./test-utils";

async function completeReserveForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /MCM Journey Flagship Demo Store/ }),
  );
  await user.type(screen.getByLabelText("방문 날짜"), "2099-08-05");
  await user.type(screen.getByLabelText("방문 시간"), "14:00");
  await user.click(screen.getByRole("button", { name: "시작 질문으로 이동" }));
  await screen.findByText("오늘 매장에서 어떤 변화를 시도하고 싶나요?");
}

describe("reservation selection", () => {
  it("displays Journey-enabled stores", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/reserve");
    expect(await screen.findByText(store.name)).toBeInTheDocument();
    expect(screen.getByText(store.location)).toBeInTheDocument();
  });

  it("shows an empty state when no store is available", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([])));
    renderApp("/reserve");
    expect(await screen.findByText(/현재 예약 가능한 Journey 매장이 없습니다/)).toBeInTheDocument();
  });

  it("rejects a past visit time", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/reserve");
    await user.click(await screen.findByRole("button", { name: /MCM Journey Flagship/ }));
    await user.type(screen.getByLabelText("방문 날짜"), "2026-08-04");
    await user.type(screen.getByLabelText("방문 시간"), "00:01");
    await user.click(screen.getByRole("button", { name: "시작 질문으로 이동" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/현재보다 이후/);
  });

  it("stores the selected visit in memory and opens the question", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/reserve");
    await completeReserveForm(user);
    expect(screen.getByText(store.location)).toBeInTheDocument();
    expect(screen.getByText(/2099년/)).toBeInTheDocument();
  });

  it("does not create a Reservation on the reserve page", async () => {
    const user = userEvent.setup();
    authenticate();
    const fetchMock = mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/reserve");
    await completeReserveForm(user);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).endsWith("/reservations"))).toBe(true);
  });

  it("redirects a direct question visit back to reserve", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/question");
    expect(await screen.findByText(/예약 정보가 없어/)).toBeInTheDocument();
    expect(screen.getByText("매장 방문 예약")).toBeInTheDocument();
  });
});

describe("question and reservation creation", () => {
  it("keeps the create button disabled before an answer is selected", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/reserve");
    await completeReserveForm(user);
    expect(screen.getByRole("button", { name: "Journey Passport 만들기" })).toBeDisabled();
  });

  it("selects one of the fixed question answers", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/reserve");
    await completeReserveForm(user);
    const answer = screen.getByRole("button", { name: /새로운 스타일을 가볍게/ });
    await user.click(answer);
    expect(answer).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Journey Passport 만들기" })).toBeEnabled();
  });

  it("sends the selected store, time, and question answer", async () => {
    const user = userEvent.setup();
    authenticate();
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(success([store]), success(reservation, 201), success(reservation)),
    );
    renderApp("/reserve");
    await completeReserveForm(user);
    await user.click(screen.getByRole("button", { name: /새로운 스타일을 가볍게/ }));
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    expect(await screen.findByText("ABCD2345")).toBeInTheDocument();
    const request = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      storeId: store.id,
      startQuestionCode: "TODAY_INTENT",
      startAnswerCode: "LIGHT_EXPLORATION",
      startAnswerLabel: "새로운 스타일을 가볍게 시도하고 싶어요",
    });
  });

  it("passes a browser UUID as Idempotency-Key", async () => {
    const user = userEvent.setup();
    authenticate();
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(success([store]), success(reservation, 201), success(reservation)),
    );
    renderApp("/reserve");
    await completeReserveForm(user);
    await user.click(screen.getByRole("button", { name: /익숙한 취향을 더 완성/ }));
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    await screen.findByText("ABCD2345");
    const headers = fetchMock.mock.calls[2]?.[1]?.headers as Headers;
    expect(headers.get("Idempotency-Key")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("treats an idempotent 200 response as success", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(success([store]), success(reservation, 200), success(reservation)),
    );
    renderApp("/reserve");
    await completeReserveForm(user);
    await user.click(screen.getByRole("button", { name: /평소와 다른 인상/ }));
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    expect(await screen.findByText("ABCD2345")).toBeInTheDocument();
  });

  it("prevents a second click while Reservation creation is pending", async () => {
    const user = userEvent.setup();
    authenticate();
    let resolveCreate: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(success(customer))
      .mockResolvedValueOnce(success([store]))
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveCreate = resolve; }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/reserve");
    await completeReserveForm(user);
    await user.click(screen.getByRole("button", { name: /새로운 스타일을 가볍게/ }));
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    const pendingButton = screen.getByRole("button", { name: "처리 중..." });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    resolveCreate?.(success(reservation, 201));
  });

  it("reuses the same idempotency key after a failed submission", async () => {
    const user = userEvent.setup();
    authenticate();
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(
        success([store]),
        apiFailure(500, "INTERNAL_ERROR", "다시 시도해 주세요."),
        success(reservation, 200),
        success(reservation),
      ),
    );
    renderApp("/reserve");
    await completeReserveForm(user);
    await user.click(screen.getByRole("button", { name: /익숙한 취향을 더 완성/ }));
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도해 주세요.");
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    await screen.findByText("ABCD2345");
    const firstHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Headers;
    const secondHeaders = fetchMock.mock.calls[3]?.[1]?.headers as Headers;
    expect(firstHeaders.get("Idempotency-Key")).toBe(secondHeaders.get("Idempotency-Key"));
  });

  it("clears the reservation draft after successful creation", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(success([store]), success(reservation, 201), success(reservation)),
    );
    renderApp("/reserve");
    await completeReserveForm(user);
    await user.click(screen.getByRole("button", { name: /평소와 다른 인상/ }));
    await user.click(screen.getByRole("button", { name: "Journey Passport 만들기" }));
    await screen.findByText("ABCD2345");
    expect(localStorage.length).toBe(1);
  });
});
