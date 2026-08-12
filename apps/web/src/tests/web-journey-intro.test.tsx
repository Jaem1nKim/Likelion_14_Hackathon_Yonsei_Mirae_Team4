import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { customer, journeyAggregate, success } from "./fixtures";
import { authenticate, authenticatedResponses, mockFetchQueue, renderApp } from "./test-utils";

describe("Journey intro and start", () => {
  beforeEach(authenticate);

  it("renders the READY aggregate", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("READY"))));
    renderApp("/journey/journey-1/intro");
    expect(await screen.findByRole("heading", { name: "MCM Journey" })).toBeInTheDocument();
  });

  it("shows the reservation answer", async () => {
    const aggregate = journeyAggregate("READY");
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/intro");
    expect(await screen.findByText(aggregate.reservation.startAnswerLabel)).toBeInTheDocument();
  });

  it("posts start without a request body", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("READY")), success(journeyAggregate("BAG")), success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/intro");
    await userEvent.click(await screen.findByRole("button", { name: "Journey 시작하기" }));
    await screen.findByText("BAG 시나리오");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBeUndefined();
  });

  it("moves to BAG after start", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("READY")), success(journeyAggregate("BAG")), success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/intro");
    await userEvent.click(await screen.findByRole("button", { name: "Journey 시작하기" }));
    expect(await screen.findByText("BAG 시나리오")).toBeInTheDocument();
  });

  it("prevents duplicate start clicks", async () => {
    let resolveStart: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { resolveStart = resolve; });
    const fetchMock = mockFetchQueue(success(customer), success(journeyAggregate("READY")), pending);
    renderApp("/journey/journey-1/intro");
    const button = await screen.findByRole("button", { name: "Journey 시작하기" });
    await userEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    resolveStart?.(success(journeyAggregate("BAG")));
  });

  it("shows the slow start loading message", async () => {
    mockFetchQueue(success(customer), success(journeyAggregate("READY")), new Promise<Response>(() => undefined));
    renderApp("/journey/journey-1/intro");
    await userEvent.click(await screen.findByRole("button", { name: "Journey 시작하기" }));
    expect(screen.getByText("취향을 분석해 첫 Journey를 구성하고 있어요.")).toBeInTheDocument();
  });

  it("redirects an already active Journey to selection", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/intro");
    expect(await screen.findByText("BAG 시나리오")).toBeInTheDocument();
  });

  it("offers retry after a GET failure", async () => {
    mockFetchQueue(success(customer), new TypeError("offline"), success(journeyAggregate("READY")));
    renderApp("/journey/journey-1/intro");
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "MCM Journey" })).toBeInTheDocument());
  });
});
