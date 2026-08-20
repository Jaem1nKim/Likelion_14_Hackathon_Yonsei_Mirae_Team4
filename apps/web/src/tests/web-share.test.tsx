import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFailure, sharedJourneyResult, success } from "./fixtures";
import { mockFetchQueue, renderApp } from "./test-utils";

describe("public shared Journey result", () => {
  beforeEach(() => localStorage.clear());

  it("loads without login", async () => {
    const fetchMock = mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    expect(await screen.findByRole("heading", { name: sharedJourneyResult.signatureName })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send the demo user header", async () => {
    const fetchMock = mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    await screen.findByRole("heading", { name: sharedJourneyResult.signatureName });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).has("X-Demo-User-Id")).toBe(false);
  });

  it("shows Signature, story and final look", async () => {
    mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    await screen.findByText(sharedJourneyResult.signatureStory);
    expect(screen.getByText(sharedJourneyResult.finalLookSummary)).toBeInTheDocument();
  });

  it("shows shared products and reasons", async () => {
    mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    for (const item of sharedJourneyResult.items) {
      expect(await screen.findByText(item.name)).toBeInTheDocument();
      expect(screen.getAllByText(item.recommendationReason).length).toBeGreaterThan(0);
    }
  });

  it("does not display customer or staff data", async () => {
    mockFetchQueue(success(sharedJourneyResult));
    const { container } = renderApp("/share/share-token-demo");
    await screen.findByText(sharedJourneyResult.signatureStory);
    expect(container.textContent).not.toMatch(/Stable Explorer|profileType|staffSummary|reservationCode/);
  });

  it("shows not found error for an invalid token", async () => {
    mockFetchQueue(apiFailure(404, "RESOURCE_NOT_FOUND", "공유된 Journey를 찾을 수 없습니다."));
    renderApp("/share/missing-token");
    expect(await screen.findByRole("alert")).toHaveTextContent("공유된 Journey를 찾을 수 없습니다.");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("restores the public page on a direct URL", async () => {
    const fetchMock = mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    await screen.findByText(sharedJourneyResult.signatureStory);
    expect(fetchMock.mock.calls[0]![0]).toContain("/share/share-token-demo");
  });

  it("copies the current public share URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    const input = await screen.findByLabelText("공유 링크");
    expect(input).toHaveValue(`${window.location.origin}/share/share-token-demo`);
    await userEvent.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/share-token-demo`);
    expect(await screen.findByRole("status")).toHaveTextContent("공유 링크를 복사했습니다.");
  });

  it("renders loading without requesting authentication", async () => {
    const fetchMock = mockFetchQueue(new Promise<Response>(() => undefined));
    renderApp("/share/share-token-demo");
    expect(await screen.findByText("공유된 Journey Signature를 불러오고 있습니다.")).toBeInTheDocument();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).has("X-Demo-User-Id")).toBe(false);
  });

  it("does not expose unsupported or technical result features", async () => {
    mockFetchQueue(success(sharedJourneyResult));
    renderApp("/share/share-token-demo");
    await screen.findByRole("heading", { name: sharedJourneyResult.signatureName });
    expect(screen.queryByText(/위시리스트|저장된 여정|팝업 일정|이미지로 저장|SNS 공유/)).not.toBeInTheDocument();
    expect(screen.queryByText(/usedFallback|fallback|AI 오류/i)).not.toBeInTheDocument();
  });
});
