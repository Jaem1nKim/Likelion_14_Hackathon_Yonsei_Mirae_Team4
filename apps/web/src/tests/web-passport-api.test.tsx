import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEMO_USER_STORAGE_KEY } from "../api/api-client";
import {
  apiFailure,
  customer,
  reservation,
  success,
} from "./fixtures";
import {
  authenticate,
  authenticatedResponses,
  mockFetchQueue,
  renderApp,
} from "./test-utils";

describe("Journey Passport", () => {
  it("loads Reservation details from the URL id", async () => {
    authenticate();
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(reservation)));
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText(reservation.reservationCode)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(`/reservations/${reservation.id}`);
  });

  it("displays customer, store, visit, answer, code and qr token", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(reservation)));
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText(reservation.reservationCode)).toBeInTheDocument();
    expect(screen.getAllByText(customer.name)).toHaveLength(2);
    expect(screen.getByText(reservation.store.name)).toBeInTheDocument();
    expect(screen.getByText(reservation.startAnswerLabel)).toBeInTheDocument();
    expect(screen.getByText(reservation.qrToken)).toBeInTheDocument();
    expect(screen.getByText("QR 준비 완료")).toBeInTheDocument();
  });

  it("shows the RESERVED guidance", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(reservation)));
    renderApp(`/passport/${reservation.id}`);
    expect(
      await screen.findByText("매장 도착 후 이 Passport를 직원에게 보여주세요."),
    ).toBeInTheDocument();
  });

  it("shows the CHECKED_IN guidance", async () => {
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(success({ ...reservation, status: "CHECKED_IN" })),
    );
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText("체크인이 완료되었습니다.")).toBeInTheDocument();
  });

  it("shows the COMPLETED guidance", async () => {
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(success({ ...reservation, status: "COMPLETED" })),
    );
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText("Journey가 완료되었습니다.")).toBeInTheDocument();
  });

  it("shows unavailable guidance for cancelled reservations", async () => {
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(success({ ...reservation, status: "CANCELLED" })),
    );
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText("현재 사용할 수 없는 예약입니다.")).toBeInTheDocument();
  });

  it("restores a Passport after a fresh render", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(reservation)));
    const first = renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText("ABCD2345")).toBeInTheDocument();
    first.unmount();

    mockFetchQueue(...authenticatedResponses(success(reservation)));
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText("ABCD2345")).toBeInTheDocument();
  });

  it("clears login after a forbidden Passport response", async () => {
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(
        apiFailure(403, "FORBIDDEN", "다른 고객의 예약입니다."),
        success([customer]),
      ),
    );
    renderApp(`/passport/${reservation.id}`);
    await waitFor(() => expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull());
    expect(await screen.findByText("오늘의 프로필을 선택하세요")).toBeInTheDocument();
  });

  it("shows a network error without a blank screen", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(new Response("", { status: 200 })));
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(/서버 응답 형식/);
  });

  it("sends the demo user header but no OpenAI data", async () => {
    authenticate();
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(reservation)));
    renderApp(`/passport/${reservation.id}`);
    await screen.findByText("ABCD2345");
    const headers = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
    expect(headers.get("X-Demo-User-Id")).toBe(customer.id);
    expect(Array.from(headers.keys()).some((name) => name.toLowerCase().includes("openai"))).toBe(false);
  });

  it("offers profile, new reservation and logout commands", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(reservation), success([customer])));
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByRole("button", { name: "프로필로 돌아가기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 예약 만들기" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(await screen.findByText("오늘의 프로필을 선택하세요")).toBeInTheDocument();
  });

  it("renders the same semantic structure at a mobile viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(reservation)));
    renderApp(`/passport/${reservation.id}`);
    expect(await screen.findByText(reservation.reservationCode)).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("passport");
    expect(document.querySelector("output.reservation-code")).toHaveTextContent("ABCD2345");
  });
});
