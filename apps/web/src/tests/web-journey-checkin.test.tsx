import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { DEMO_USER_STORAGE_KEY } from "../api/api-client";
import { apiFailure, customer, journeyAggregate, journeyResult, reservation, success } from "./fixtures";
import { authenticate, authenticatedResponses, mockFetchQueue, renderApp } from "./test-utils";

describe("store check-in", () => {
  beforeEach(authenticate);

  it("accepts an eight-character reservation code", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("READY"))));
    renderApp("/store/check-in");
    const input = await screen.findByLabelText("예약 코드를 입력해 주세요.");
    await userEvent.type(input, "abcd2345");
    expect(input).toHaveValue("ABCD2345");
  });

  it("rejects an invalid code format", async () => {
    mockFetchQueue(...authenticatedResponses());
    renderApp("/store/check-in");
    const input = await screen.findByLabelText("예약 코드를 입력해 주세요.");
    await userEvent.type(input, "ABC");
    expect(screen.getByRole("button", { name: "Journey 불러오기" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("8자리");
  });

  it("submits the manual code and opens intro", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("READY")), success(journeyAggregate("READY"))));
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    await userEvent.click(await screen.findByRole("button", { name: "Journey 불러오기" }));
    expect(await screen.findByRole("heading", { name: "MCM Journey" })).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ reservationCode: "ABCD2345" });
  });

  it("pre-fills the Passport code from route state", async () => {
    mockFetchQueue(...authenticatedResponses());
    renderApp("/store/check-in", { reservationCode: reservation.reservationCode });
    expect(await screen.findByLabelText("예약 코드를 입력해 주세요.")).toHaveValue("ABCD2345");
  });

  it("prevents a duplicate check-in click", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { resolveRequest = resolve; });
    const fetchMock = mockFetchQueue(success(customer), pending);
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    const button = await screen.findByRole("button", { name: "Journey 불러오기" });
    await userEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolveRequest?.(success(journeyAggregate("READY")));
  });

  it("restores an existing checked-in BAG Journey", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), success(journeyAggregate("BAG"))));
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    await userEvent.click(await screen.findByRole("button", { name: "Journey 불러오기" }));
    expect(await screen.findByText("BAG 시나리오")).toBeInTheDocument();
  });

  it("routes a finished Journey directly to its result", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("FINISHED")), success(journeyResult)));
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    await userEvent.click(await screen.findByRole("button", { name: "Journey 불러오기" }));
    expect(await screen.findByRole("heading", { name: journeyResult.signatureName })).toBeInTheDocument();
  });

  it("shows cancelled or expired state errors", async () => {
    mockFetchQueue(...authenticatedResponses(apiFailure(409, "INVALID_STATE", "예약을 사용할 수 없습니다.")));
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    await userEvent.click(await screen.findByRole("button", { name: "Journey 불러오기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("현재 Journey 상태");
  });

  it("shows a network error", async () => {
    mockFetchQueue(...authenticatedResponses(new TypeError("offline")));
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    await userEvent.click(await screen.findByRole("button", { name: "Journey 불러오기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("서버에 연결");
  });

  it("clears invalid authentication on forbidden", async () => {
    mockFetchQueue(...authenticatedResponses(apiFailure(403, "FORBIDDEN", "Forbidden")));
    renderApp("/store/check-in", { reservationCode: "ABCD2345" });
    await userEvent.click(await screen.findByRole("button", { name: "Journey 불러오기" }));
    await waitFor(() => expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull());
  });
});
