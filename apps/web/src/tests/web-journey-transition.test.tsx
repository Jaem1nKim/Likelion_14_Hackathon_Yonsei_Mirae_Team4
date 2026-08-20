import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { apiFailure, journeyAggregate, journeyResult, success } from "./fixtures";
import { authenticate, authenticatedResponses, mockFetchQueue, renderApp } from "./test-utils";

describe("Journey transitions and recovery", () => {
  beforeEach(authenticate);

  it("disables next before a BAG selection", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByRole("button", { name: "다음 Journey" })).toBeDisabled();
  });

  it("moves BAG to APPAREL", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), success(journeyAggregate("APPAREL"))));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "다음 Journey" }));
    expect(await screen.findByText("APPAREL 시나리오")).toBeInTheDocument();
  });

  it("moves APPAREL to ACCESSORY", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("APPAREL", true)), success(journeyAggregate("ACCESSORY"))));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "다음 Journey" }));
    expect(await screen.findByText("ACCESSORY 시나리오")).toBeInTheDocument();
  });

  it("passes expectedStepNumber to next", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), success(journeyAggregate("APPAREL"))));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "다음 Journey" }));
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({ expectedStepNumber: 1 });
  });

  it("prevents duplicate next clicks", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), new Promise<Response>(() => undefined)));
    renderApp("/journey/journey-1/select");
    const button = await screen.findByRole("button", { name: "다음 Journey" });
    await userEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText("지금까지의 선택을 반영해 다음 스타일을 찾고 있어요.")).toBeInTheDocument();
  });

  it("recovers once after a stale next response", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), apiFailure(409, "STALE_JOURNEY_STEP", "stale"), success(journeyAggregate("APPAREL"))));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "다음 Journey" }));
    expect(await screen.findByText("APPAREL 시나리오")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("disables finish when the aggregate says false", async () => {
    const aggregate = journeyAggregate("ACCESSORY");
    aggregate.canFinishJourney = false;
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByRole("button", { name: "Journey 완성하기" })).toBeDisabled();
  });

  it("enables finish only from server canFinishJourney", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("ACCESSORY", true))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByRole("button", { name: "Journey 완성하기" })).toBeEnabled();
  });

  it("passes expectedStepNumber to finish and opens the result directly", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("ACCESSORY", true)), success(journeyAggregate("FINISHED")), success(journeyResult)));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Journey 완성하기" }));
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({ expectedStepNumber: 3 });
    expect(await screen.findByRole("heading", { name: journeyResult.signatureName })).toBeInTheDocument();
  });

  it("prevents duplicate finish clicks", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("ACCESSORY", true)), new Promise<Response>(() => undefined)));
    renderApp("/journey/journey-1/select");
    const button = await screen.findByRole("button", { name: "Journey 완성하기" });
    await userEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText("선택의 흐름을 분석해 Journey Signature를 완성하고 있어요.")).toBeInTheDocument();
  });

  it("shows the FINISHED completion state", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("FINISHED"))));
    renderApp("/journey/journey-1/decision");
    expect(await screen.findByText("Journey가 완성되었습니다.")).toBeInTheDocument();
  });

  it("recovers after MINIMUM_SELECTION_REQUIRED", async () => {
    const initial = journeyAggregate("ACCESSORY", true);
    const latest = journeyAggregate("ACCESSORY");
    latest.canFinishJourney = false;
    mockFetchQueue(...authenticatedResponses(success(initial), apiFailure(409, "MINIMUM_SELECTION_REQUIRED", "minimum"), success(latest)));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Journey 완성하기" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Journey 완성하기" })).toBeDisabled());
  });

  it("recovers a completed stale finish directly into the result", async () => {
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(
        success(journeyAggregate("ACCESSORY", true)),
        apiFailure(409, "STALE_JOURNEY_STEP", "stale"),
        success(journeyAggregate("FINISHED")),
        success(journeyResult),
      ),
    );
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Journey 완성하기" }));
    expect(await screen.findByRole("heading", { name: journeyResult.signatureName })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("restores BAG directly from GET Journey", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("선택됨")).toBeInTheDocument();
  });

  it("restores APPAREL and its completed BAG step", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("APPAREL"))));
    renderApp("/journey/journey-1/progress");
    expect(await screen.findByText("Demo Visetos Carry Bag")).toBeInTheDocument();
    expect(screen.getByText("선택 진행 중")).toBeInTheDocument();
  });

  it("restores ACCESSORY and both completed steps", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("ACCESSORY"))));
    renderApp("/journey/journey-1/progress");
    expect(await screen.findByText("Demo Visetos Carry Bag")).toBeInTheDocument();
    expect(screen.getByText("Monogram Backpack Vest")).toBeInTheDocument();
  });

  it("uses registered product WebPs for completed and current progress cards", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("ACCESSORY", true))));
    renderApp("/journey/journey-1/progress");

    const expectedImages = [
      ["Demo Visetos Carry Bag", "/assets/ar/bag/demo-urban-carry-backpack.webp"],
      ["Monogram Backpack Vest", "/assets/ar/apparel/demo-monogram-backpack-vest.webp"],
      ["Adjustable M-Art Reversible Belt 1.5” in Lauretos Grey", "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp"],
    ] as const;

    for (const [name, source] of expectedImages) {
      expect(await screen.findByAltText(name)).toHaveAttribute("src", source);
    }
  });

  it("keeps FINISHED users out of selection", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("FINISHED")), success(journeyResult)));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByRole("heading", { name: journeyResult.signatureName })).toBeInTheDocument();
    expect(screen.queryByText("오늘의 추천")).not.toBeInTheDocument();
  });

  it("renders route and progress deep links from the same aggregate", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/route");
    expect(await screen.findByRole("heading", { name: "BAG ZONE" })).toBeInTheDocument();
    expect(screen.getByText("BAG 전시 구역으로 이동해 주세요.")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "현재 Journey 보기" });
    expect(within(navigation).getByRole("button", { name: /구역 안내/ })).toHaveAttribute("aria-current", "page");
    expect(within(navigation).getAllByRole("button")).toHaveLength(3);
    expect(within(navigation).queryByRole("button", { name: /완성하기/ })).not.toBeInTheDocument();
  });
});
