import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_USER_STORAGE_KEY } from "../api/api-client";
import { customer, journeyResult, success } from "./fixtures";
import { authenticate, mockFetchQueue, renderApp } from "./test-utils";

describe("customer Journey result", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderResult() {
    authenticate();
    return mockFetchQueue(success(customer), success(journeyResult));
  }

  it("shows the Signature, story and final look", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    expect(await screen.findByRole("heading", { name: journeyResult.signatureName })).toBeInTheDocument();
    expect(screen.getByText(journeyResult.signatureStory)).toBeInTheDocument();
    expect(screen.getByText(journeyResult.finalLookSummary)).toBeInTheDocument();
  });

  it("shows the AI Signature marker for a stored AI Result", async () => {
    authenticate();
    mockFetchQueue(success(customer), success({ ...journeyResult, usedFallback: false }));
    renderApp("/journey/journey-1/result");
    expect(await screen.findByText("✦ AI가 완성한 Journey Signature")).toBeInTheDocument();
  });

  it("does not show an AI Signature marker for a fallback Result", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    await screen.findByRole("heading", { name: journeyResult.signatureName });
    expect(screen.queryByText("✦ AI가 완성한 Journey Signature")).not.toBeInTheDocument();
  });

  it("shows only stored items in selection order", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    await screen.findByText(journeyResult.items[0]!.product.name);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(journeyResult.items.map((item) => item.product.name));
  });

  it("shows every recommendation reason", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    await screen.findAllByText(journeyResult.items[0]!.recommendationReason);
    for (const item of journeyResult.items) expect(screen.getAllByText(item.recommendationReason).length).toBeGreaterThan(0);
  });

  it("provides an image fallback", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    const image = await screen.findByAltText(`${journeyResult.items[0]!.product.name} 제품`);
    fireEvent.error(image);
    expect(image).not.toBeInTheDocument();
    expect(screen.getAllByText("MCM").length).toBeGreaterThan(0);
  });

  it("recovers the result by URL after refresh", async () => {
    const fetchMock = renderResult();
    renderApp("/journey/journey-1/result");
    await screen.findByRole("heading", { name: journeyResult.signatureName });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/journeys/journey-1/result"), expect.anything());
    expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBe(customer.id);
  });

  it("builds a public URL from the current host", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    const input = await screen.findByLabelText("공유 링크");
    expect(input).toHaveValue(`${window.location.origin}/share/${journeyResult.shareToken}`);
  });

  it("copies the public URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderResult();
    renderApp("/journey/journey-1/result");
    await userEvent.click(await screen.findByRole("button", { name: "링크 복사" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/${journeyResult.shareToken}`);
    expect(await screen.findByText("공유 링크를 복사했습니다.")).toBeInTheDocument();
  });

  it("keeps a selectable URL when clipboard fails", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    renderResult();
    renderApp("/journey/journey-1/result");
    await userEvent.click(await screen.findByRole("button", { name: "링크 복사" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("직접 선택해 복사");
    expect((screen.getByLabelText("공유 링크") as HTMLInputElement).value).toContain("/share/");
  });

  it("renders a loading state", async () => {
    authenticate();
    mockFetchQueue(success(customer), new Promise<Response>(() => {}));
    renderApp("/journey/journey-1/result");
    expect(await screen.findByText("Journey Signature를 불러오고 있습니다.")).toBeInTheDocument();
  });

  it("renders an API error with retry", async () => {
    authenticate();
    mockFetchQueue(success(customer), new Error("network down"));
    renderApp("/journey/journey-1/result");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("does not display technical fallback state", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    await screen.findByRole("heading", { name: journeyResult.signatureName });
    expect(screen.queryByText(/usedFallback|Fallback|AI 생성/)).not.toBeInTheDocument();
  });

  it("links to the public page", async () => {
    renderResult();
    renderApp("/journey/journey-1/result");
    expect(await screen.findByRole("link", { name: "공유 페이지 보기" })).toHaveAttribute("href", `/share/${journeyResult.shareToken}`);
  });
});
