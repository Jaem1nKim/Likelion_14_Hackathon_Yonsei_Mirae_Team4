import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFailure, journeyAggregate, success } from "./fixtures";
import { authenticate, authenticatedResponses, mockFetchQueue, renderApp } from "./test-utils";

describe("Journey product selection", () => {
  beforeEach(authenticate);

  it("shows three server recommendations", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findAllByRole("article")).toHaveLength(3);
  });

  it("shows every server recommendation reason", async () => {
    const aggregate = journeyAggregate("BAG");
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/select");
    for (const item of aggregate.currentStep!.recommendations) {
      expect(await screen.findByText(item.reason)).toBeInTheDocument();
    }
  });

  it("shows AI personalization and AI reason labels only for a stored AI Step", async () => {
    const aggregate = journeyAggregate("BAG");
    aggregate.currentStep!.usedFallback = false;
    for (const recommendation of aggregate.currentStep!.recommendations) {
      recommendation.isAiSelected = true;
    }
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("✦ AI 맞춤 추천")).toBeInTheDocument();
    expect(screen.getAllByText("AI 추천 이유")).toHaveLength(3);
  });

  it("does not claim AI personalization for a fallback Step", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    await screen.findByText("BAG 시나리오");
    expect(screen.queryByText("✦ AI 맞춤 추천")).not.toBeInTheDocument();
    expect(screen.queryByText("AI 추천 이유")).not.toBeInTheDocument();
    expect(screen.getAllByText("추천 이유")).toHaveLength(3);
  });

  it("restores the AI personalization marker from the aggregate after refresh", async () => {
    const aggregate = journeyAggregate("APPAREL");
    aggregate.currentStep!.usedFallback = false;
    aggregate.currentStep!.recommendations.forEach((item) => {
      item.isAiSelected = true;
    });
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("✦ AI 맞춤 추천")).toBeInTheDocument();
    expect(screen.getByText(/방금 선택한 가방과 취향/)).toBeInTheDocument();
  });

  it("uses customer-friendly recommendation labels", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("추천")).toBeInTheDocument();
    expect(screen.getByText("비교")).toBeInTheDocument();
    expect(screen.getByText("새로운 시도")).toBeInTheDocument();
  });

  it("provides image alt text and a local fallback", async () => {
    const aggregate = journeyAggregate("BAG");
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/select");
    const image = await screen.findByAltText("Demo Visetos Carry Bag");
    expect(image).toHaveAttribute("src", "/assets/ar/bag/demo-urban-carry-backpack.webp");
    expect(document.querySelector(".product-media .image-fallback")).toBeNull();
    fireEvent.error(image);
    await waitFor(() => {
      expect(screen.getByAltText("Demo Visetos Carry Bag")).toHaveAttribute(
        "src",
        "/images/product-bag-1.jpg",
      );
    });
    fireEvent.error(screen.getByAltText("Demo Visetos Carry Bag"));
    expect(screen.getByRole("img", { name: "Demo Visetos Carry Bag 이미지 준비 중" })).toBeInTheDocument();
  });

  it.each([
    ["BAG", "/assets/demo/products/demo-bag-001.png", "/assets/ar/bag/demo-urban-carry-backpack.webp"],
    ["APPAREL", "/assets/demo/products/demo-app-001.png", "/assets/ar/apparel/demo-monogram-backpack-vest.webp"],
    ["ACCESSORY", "/assets/demo/products/demo-acc-001.png", "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp"],
  ] as const)("uses an existing registered asset for %s without requesting the missing seed PNG", async (
    stage,
    missingSeedImage,
    expectedAsset,
  ) => {
    const aggregate = journeyAggregate(stage);
    const product = aggregate.currentStep!.recommendations[0]!.product;
    product.imageUrl = missingSeedImage;
    mockFetchQueue(...authenticatedResponses(success(aggregate)));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByAltText(product.name)).toHaveAttribute("src", expectedAsset);
    expect(screen.queryByRole("img", { name: `${product.name} 이미지 준비 중` })).not.toBeInTheDocument();
  });

  it("shows category, color, material and size", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findAllByText(/BAG · BLACK · Demo leather · M/)).not.toHaveLength(0);
  });

  it("sends SELECTED with a generated interaction UUID", async () => {
    const selected = journeyAggregate("BAG", true);
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), success(selected)));
    vi.spyOn(crypto, "randomUUID").mockReturnValue("123e4567-e89b-42d3-a456-426614174000");
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Demo Visetos Carry Bag 선택" }));
    const body = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(body).toMatchObject({ interactionId: "123e4567-e89b-42d3-a456-426614174000", type: "SELECTED", journeyStepId: "step-1", productId: "product-bag-1" });
  });

  it("uses the secure UUID fallback when randomUUID is unavailable", async () => {
    const selected = journeyAggregate("BAG", true);
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(success(journeyAggregate("BAG")), success(selected)),
    );
    vi.stubGlobal("crypto", {
      getRandomValues: (target: Uint8Array) => {
        target.fill(0xab);
        return target;
      },
    });

    try {
      renderApp("/journey/journey-1/select");
      await userEvent.click(
        await screen.findByRole("button", { name: "Demo Visetos Carry Bag 선택" }),
      );
      const body = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
      expect(body.interactionId).toBe("abababab-abab-4bab-abab-abababababab");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("marks selection only after the server aggregate succeeds", async () => {
    let resolveInteraction: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { resolveInteraction = resolve; });
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), pending));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Demo Visetos Carry Bag 선택" }));
    expect(screen.queryByText("선택됨")).not.toBeInTheDocument();
    resolveInteraction?.(success(journeyAggregate("BAG", true)));
    expect(await screen.findByText("선택됨")).toBeInTheDocument();
  });

  it("shows selected state from a restored aggregate", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("선택됨")).toBeInTheDocument();
  });

  it("changes selection by sending only the new SELECTED event", async () => {
    const initial = journeyAggregate("BAG", true);
    const changed = journeyAggregate("BAG", true);
    changed.currentStep!.selectedProduct = changed.currentStep!.recommendations[1]!.product;
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(initial), success(changed)));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Demo Structured Tote 선택" }));
    const body = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(body.type).toBe("SELECTED");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await screen.findByRole("button", { name: "Demo Structured Tote 선택" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sends DESELECTED from the explicit cancel button", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "선택 취소" }));
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)).type).toBe("DESELECTED");
  });

  it("removes the selected label after DESELECTED succeeds", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "선택 취소" }));
    await waitFor(() => expect(screen.queryByText("선택됨")).not.toBeInTheDocument());
  });

  it("sends REJECTED from the secondary action", async () => {
    const rejected = journeyAggregate("BAG");
    rejected.interactions = [{ id: "reject-1", journeyStepId: "step-1", productId: "product-bag-1", type: "REJECTED", sequence: 1, createdAt: "2026-08-04T02:05:00.000Z" }];
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), success(rejected)));
    renderApp("/journey/journey-1/select");
    const rejectButtons = await screen.findAllByRole("button", { name: "이 제품은 제외할게요" });
    await userEvent.click(rejectButtons[0]!);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)).type).toBe("REJECTED");
  });

  it("marks a rejected product from the server aggregate", async () => {
    const rejected = journeyAggregate("BAG");
    rejected.interactions = [{ id: "reject-1", journeyStepId: "step-1", productId: "product-bag-1", type: "REJECTED", sequence: 1, createdAt: "2026-08-04T02:05:00.000Z" }];
    mockFetchQueue(...authenticatedResponses(success(rejected)));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("제외 기록됨")).toBeInTheDocument();
  });

  it("shows PRODUCT_NOT_ELIGIBLE guidance", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), apiFailure(409, "PRODUCT_NOT_ELIGIBLE", "internal")));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "Demo Visetos Carry Bag 선택" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("현재 선택할 수 없는 제품");
  });

  it("shows NO_ELIGIBLE_CANDIDATES guidance", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG", true)), apiFailure(409, "NO_ELIGIBLE_CANDIDATES", "internal")));
    renderApp("/journey/journey-1/select");
    await userEvent.click(await screen.findByRole("button", { name: "다음 Journey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("직원에게 문의");
  });

  it("prevents duplicate interaction while a product is saving", async () => {
    const fetchMock = mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG")), new Promise<Response>(() => undefined)));
    renderApp("/journey/journey-1/select");
    const button = await screen.findByRole("button", { name: "Demo Visetos Carry Bag 선택" });
    await userEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText("저장 중")).toBeInTheDocument();
  });

  it("renders the zone direction from the current step", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("BAG 전시 구역으로 이동해 주세요.")).toBeInTheDocument();
  });

  it("renders heritage text from the current step", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByText("BAG heritage story from database.")).toBeInTheDocument();
  });

  it("does not expose fallback status to customers", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    await screen.findByText("BAG 시나리오");
    expect(screen.queryByText(/usedFallback|fallback/i)).not.toBeInTheDocument();
  });

  it("keeps all product actions as real buttons", async () => {
    mockFetchQueue(...authenticatedResponses(success(journeyAggregate("BAG"))));
    renderApp("/journey/journey-1/select");
    expect(await screen.findByRole("button", { name: "Demo Visetos Carry Bag 선택" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "이 제품은 제외할게요" })).toHaveLength(3);
  });
});
