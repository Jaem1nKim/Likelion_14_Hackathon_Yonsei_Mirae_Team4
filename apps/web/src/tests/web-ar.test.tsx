import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserArRuntime } from "../features/ar/ar-runtime";
import { customer, journeyAggregate, journeyResult, success } from "./fixtures";
import { authenticate, mockFetchQueue, renderApp } from "./test-utils";

function renderAr(
  result = journeyResult,
  aggregate = journeyAggregate("FINISHED"),
) {
  authenticate();
  mockFetchQueue(success(customer), success(result), success(aggregate));
  return renderApp("/journey/journey-1/ar");
}

describe("Journey BAG, APPAREL, and ACCESSORY AR fitting", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(browserArRuntime, "loadImage").mockResolvedValue(document.createElement("img"));
  });

  it("moves from the Result page to the AR route", async () => {
    authenticate();
    mockFetchQueue(
      success(customer),
      success(journeyResult),
      success(journeyResult),
      success(journeyAggregate("FINISHED")),
    );
    renderApp("/journey/journey-1/result");
    await userEvent.click(await screen.findByRole("link", { name: "AR로 착용해보기" }));
    expect(await screen.findByRole("heading", { name: "BAG · APPAREL · ACCESSORY 가상 피팅" })).toBeInTheDocument();
  });

  it("selects the final BAG, APPAREL, and ACCESSORY from the stored Result", async () => {
    renderAr();
    const currentProducts = await screen.findByRole("list", { name: "현재 착용 제품" });
    expect(within(currentProducts).getByText(journeyResult.items[0]!.product.name)).toBeInTheDocument();
    expect(within(currentProducts).getByText(journeyResult.items[1]!.product.name)).toBeInTheDocument();
    expect(within(currentProducts).getByText(journeyResult.items[2]!.product.name)).toBeInTheDocument();
  });

  it("renders AR controls in the mobile action order", async () => {
    renderAr();
    const startButton = await screen.findByRole("button", { name: "카메라 시작" });
    const controls = startButton.parentElement;
    if (!controls) throw new Error("AR controls were not rendered");
    expect(controls).toHaveClass("ar-controls");

    expect(within(controls).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "카메라 시작",
      "ACCESSORY 숨기기",
      "가방 숨기기",
      "APPAREL 숨기기",
    ]);
  });

  it("shows three server-provided candidates in each comparison tab", async () => {
    renderAr();
    const panel = await screen.findByRole("tabpanel");
    expect(within(panel).getAllByRole("button")).toHaveLength(3);

    await userEvent.click(screen.getByRole("tab", { name: "APPAREL" }));
    expect(within(panel).getAllByRole("button")).toHaveLength(3);
    expect(within(panel).getByText("Blouson Leather Jacket")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "ACCESSORY" }));
    expect(within(panel).getAllByRole("button")).toHaveLength(3);
    expect(within(panel).getByText("MCM Silk Visetos Scarf - Brown")).toBeInTheDocument();
  });

  it("uses registered WebP assets for legacy seed images in every comparison tab", async () => {
    const result = structuredClone(journeyResult);
    const aggregate = structuredClone(journeyAggregate("FINISHED"));
    result.items.forEach((item) => {
      item.product.imageUrl = `/assets/demo/products/${item.product.sku.toLowerCase()}.png`;
    });
    aggregate.completedSteps.forEach((step) => {
      step.recommendations.forEach((recommendation) => {
        recommendation.product.imageUrl = `/assets/demo/products/${recommendation.product.sku.toLowerCase()}.png`;
      });
    });

    renderAr(result, aggregate);
    const panel = await screen.findByRole("tabpanel");
    const imageSources = () => [...panel.querySelectorAll("img")]
      .map((image) => image.getAttribute("src"))
      .sort();

    expect(imageSources()).toEqual([
      "/assets/ar/bag/demo-classic-boston-bag.webp",
      "/assets/ar/bag/demo-signal-mini-crossbody.webp",
      "/assets/ar/bag/demo-urban-carry-backpack.webp",
    ]);
    expect(within(panel).queryByText("MCM")).not.toBeInTheDocument();
    expect(within(panel).queryByText("이미지 준비 중")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "APPAREL" }));
    expect(imageSources()).toEqual([
      "/assets/ar/apparel/demo-blouson-leather-jacket.webp",
      "/assets/ar/apparel/demo-essential-logo-patch-varsity-jacket.webp",
      "/assets/ar/apparel/demo-monogram-backpack-vest.webp",
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "ACCESSORY" }));
    expect(imageSources()).toEqual([
      "/assets/ar/accessory/demo-aren-rabbit-2d-charm-pink.webp",
      "/assets/ar/accessory/demo-m-art-reversible-belt-grey.webp",
      "/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp",
    ]);
  });

  it("switches BAG, APPAREL, and ACCESSORY overlays without changing the Journey", async () => {
    const loadImage = vi.mocked(browserArRuntime.loadImage);
    renderAr();
    const currentProducts = await screen.findByRole("list", { name: "현재 착용 제품" });

    await userEvent.click(screen.getByRole("button", { name: /Demo Structured Tote/ }));
    await userEvent.click(screen.getByRole("tab", { name: "APPAREL" }));
    await userEvent.click(screen.getByRole("button", { name: /Blouson Leather Jacket/ }));
    await userEvent.click(screen.getByRole("tab", { name: "ACCESSORY" }));
    await userEvent.click(screen.getByRole("button", { name: /MCM Silk Visetos Scarf - Brown/ }));

    expect(within(currentProducts).getByText("Demo Structured Tote")).toBeInTheDocument();
    expect(within(currentProducts).getByText("Blouson Leather Jacket")).toBeInTheDocument();
    expect(within(currentProducts).getByText("MCM Silk Visetos Scarf - Brown")).toBeInTheDocument();
    expect(loadImage).toHaveBeenCalledWith("/assets/ar/bag/demo-classic-boston-bag.webp");
    expect(loadImage).toHaveBeenCalledWith("/assets/ar/apparel/demo-blouson-leather-jacket.webp");
    expect(loadImage).toHaveBeenCalledWith("/assets/ar/accessory/demo-silk-visetos-scarf-brown.webp");
    expect(screen.getAllByRole("button").filter(
      (button) => button.getAttribute("aria-pressed") === "true",
    ).length).toBeGreaterThanOrEqual(3);
    const journeyRequests = vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes("/journeys/"));
    expect(journeyRequests.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("marks stored AI-generated picks and restores all original products", async () => {
    const aggregate = journeyAggregate("FINISHED");
    aggregate.completedSteps = aggregate.completedSteps.map((step) => ({
      ...step,
      usedFallback: false,
    }));
    renderAr({ ...journeyResult, usedFallback: false }, aggregate);
    const currentProducts = await screen.findByRole("list", { name: "현재 착용 제품" });

    expect(screen.getByText("AI Pick")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Demo Structured Tote/ }));
    await userEvent.click(screen.getByRole("tab", { name: "APPAREL" }));
    expect(screen.getByText("AI Pick")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Blouson Leather Jacket/ }));
    await userEvent.click(screen.getByRole("button", { name: "원래 추천으로 돌아가기" }));

    expect(within(currentProducts).getByText(journeyResult.items[0]!.product.name)).toBeInTheDocument();
    expect(within(currentProducts).getByText(journeyResult.items[1]!.product.name)).toBeInTheDocument();
    expect(within(currentProducts).getByText(journeyResult.items[2]!.product.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "원래 추천으로 돌아가기" })).toBeDisabled();
  });

  it("restores the stored original products after a page refresh", async () => {
    const first = renderAr();
    const firstProducts = await screen.findByRole("list", { name: "현재 착용 제품" });
    await userEvent.click(screen.getByRole("button", { name: /Demo Structured Tote/ }));
    expect(within(firstProducts).getByText("Demo Structured Tote")).toBeInTheDocument();
    first.unmount();

    renderAr();
    const refreshedProducts = await screen.findByRole("list", { name: "현재 착용 제품" });
    expect(within(refreshedProducts).getByText(journeyResult.items[0]!.product.name)).toBeInTheDocument();
    expect(within(refreshedProducts).queryByText("Demo Structured Tote")).not.toBeInTheDocument();
  });

  it("shows a safe fallback when the transparent BAG asset is absent", async () => {
    vi.mocked(browserArRuntime.loadImage).mockRejectedValue(new Error("missing"));
    renderAr();
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes("BAG AR asset이 준비되지 않았습니다"))).toBe(true);
    expect(screen.getByText(/demo-urban-carry-backpack\.webp/)).toBeInTheDocument();
  });

  it("shows the APPAREL asset path when its transparent overlay is absent", async () => {
    vi.mocked(browserArRuntime.loadImage).mockImplementation((path) => path.includes("/apparel/")
      ? Promise.reject(new Error("missing"))
      : Promise.resolve(document.createElement("img")));
    renderAr();
    expect(await screen.findByText("APPAREL AR asset이 준비되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getByText(/demo-monogram-backpack-vest\.webp/)).toBeInTheDocument();
  });

  it("shows the ACCESSORY asset path when its transparent overlay is absent", async () => {
    vi.mocked(browserArRuntime.loadImage).mockImplementation((path) => path.includes("/accessory/")
      ? Promise.reject(new Error("missing"))
      : Promise.resolve(document.createElement("img")));
    renderAr();
    expect(await screen.findByText("ACCESSORY AR 이미지가 준비되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getByText(/demo-m-art-reversible-belt-grey\.webp/)).toBeInTheDocument();
  });

  it("toggles BAG and APPAREL visibility independently", async () => {
    renderAr();
    const bagToggle = await screen.findByRole("button", { name: "가방 숨기기" });
    const apparelToggle = screen.getByRole("button", { name: "APPAREL 숨기기" });

    await userEvent.click(apparelToggle);
    expect(screen.getByRole("button", { name: "APPAREL 표시하기" })).toBeInTheDocument();
    expect(bagToggle).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(bagToggle);
    expect(screen.getByRole("button", { name: "가방 표시하기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "APPAREL 표시하기" })).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles ACCESSORY without changing BAG or APPAREL visibility", async () => {
    renderAr();
    const accessoryToggle = await screen.findByRole("button", { name: "ACCESSORY 숨기기" });

    await userEvent.click(accessoryToggle);

    expect(screen.getByRole("button", { name: "ACCESSORY 표시하기" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "가방 숨기기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "APPAREL 숨기기" })).toHaveAttribute("aria-pressed", "true");
  });

  it("runs Pose inference once per rendered frame for all three overlays", async () => {
    const detectForVideo = vi.fn(() => ({ landmarks: [] }));
    const scheduledFrame: { callback: FrameRequestCallback | null } = { callback: null };
    vi.spyOn(browserArRuntime, "getUserMedia").mockResolvedValue({
      getTracks: () => [],
    } as unknown as MediaStream);
    vi.spyOn(browserArRuntime, "prepareVideo").mockImplementation(async (video) => {
      Object.defineProperty(video, "readyState", { configurable: true, value: 2 });
      Object.defineProperty(video, "currentTime", { configurable: true, value: 1 });
      Object.defineProperty(video, "videoWidth", { configurable: true, value: 1280 });
      Object.defineProperty(video, "videoHeight", { configurable: true, value: 720 });
    });
    vi.spyOn(browserArRuntime, "createPoseDetector").mockResolvedValue({
      detectForVideo,
      close: vi.fn(),
    });
    vi.spyOn(browserArRuntime, "requestFrame").mockImplementation((callback) => {
      scheduledFrame.callback = callback;
      return 91;
    });
    vi.spyOn(browserArRuntime, "now").mockReturnValue(1_000);
    renderAr();
    const startButton = await screen.findByRole("button", { name: "카메라 시작" });
    await userEvent.click(startButton);
    await waitFor(() => expect(scheduledFrame.callback).not.toBeNull());

    scheduledFrame.callback?.(1_000);

    expect(detectForVideo).toHaveBeenCalledTimes(1);
  });

  it("handles camera permission denial", async () => {
    vi.spyOn(browserArRuntime, "getUserMedia").mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    renderAr();
    await userEvent.click(await screen.findByRole("button", { name: "카메라 시작" }));
    expect(await screen.findByText(/카메라 권한이 필요합니다/)).toBeInTheDocument();
  });

  it("stops camera, animation and Pose Landmarker resources on unmount", async () => {
    const stop = vi.fn();
    const close = vi.fn();
    const cancelFrame = vi.spyOn(browserArRuntime, "cancelFrame");
    vi.spyOn(browserArRuntime, "getUserMedia").mockResolvedValue({
      getTracks: () => [{ stop }],
    } as unknown as MediaStream);
    vi.spyOn(browserArRuntime, "prepareVideo").mockResolvedValue(undefined);
    vi.spyOn(browserArRuntime, "createPoseDetector").mockResolvedValue({
      detectForVideo: () => ({ landmarks: [] }),
      close,
    });
    vi.spyOn(browserArRuntime, "requestFrame").mockReturnValue(73);

    const view = renderAr();
    await userEvent.click(await screen.findByRole("button", { name: "카메라 시작" }));
    expect(await screen.findByText(/사람을 화면 중앙에 맞춰주세요/)).toBeInTheDocument();
    view.unmount();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(cancelFrame).toHaveBeenCalledWith(73);
  });

  it("allows a fallback Result to enter AR without claiming AI state", async () => {
    renderAr({ ...journeyResult, usedFallback: true });
    expect(await screen.findByRole("heading", { name: "BAG · APPAREL · ACCESSORY 가상 피팅" })).toBeInTheDocument();
    expect(screen.queryByText(/AI 맞춤|AI GENERATED/)).not.toBeInTheDocument();
  });

  it("captures the current camera and AR overlay, previews it, and allows retaking", async () => {
    const scheduledFrame: { callback: FrameRequestCallback | null } = { callback: null };
    const context = {
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["ar-capture"], { type: "image/png" }));
    });
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ar-capture");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(browserArRuntime, "getUserMedia").mockResolvedValue({
      getTracks: () => [],
    } as unknown as MediaStream);
    vi.spyOn(browserArRuntime, "prepareVideo").mockImplementation(async (video) => {
      Object.defineProperty(video, "readyState", { configurable: true, value: 2 });
      Object.defineProperty(video, "videoWidth", { configurable: true, value: 1280 });
      Object.defineProperty(video, "videoHeight", { configurable: true, value: 720 });
      Object.defineProperty(video, "currentTime", { configurable: true, value: 1 });
    });
    vi.spyOn(browserArRuntime, "createPoseDetector").mockResolvedValue({
      detectForVideo: () => ({ landmarks: [] }),
      close: vi.fn(),
    });
    vi.spyOn(browserArRuntime, "requestFrame").mockImplementation((callback) => {
      scheduledFrame.callback = callback;
      return 101;
    });
    vi.spyOn(browserArRuntime, "now").mockReturnValue(1_000);

    renderAr();
    await userEvent.click(await screen.findByRole("button", { name: "카메라 시작" }));
    await waitFor(() => expect(scheduledFrame.callback).not.toBeNull());
    scheduledFrame.callback?.(1_000);
    const captureButton = await screen.findByRole("button", { name: "촬영" });
    await waitFor(() => expect(captureButton).toBeEnabled());
    await userEvent.click(captureButton);

    expect(await screen.findByRole("dialog", { name: "촬영 미리보기" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "현재 AR 착용 화면 촬영 미리보기" }))
      .toHaveAttribute("src", "blob:ar-capture");
    expect(screen.getByRole("link", { name: "이미지 저장" }))
      .toHaveAttribute("download", "mcm-journey-ar.png");
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(context.scale).toHaveBeenCalledWith(-1, 1);
    expect(context.drawImage).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole("button", { name: "다시 찍기" }));
    expect(screen.queryByRole("dialog", { name: "촬영 미리보기" })).not.toBeInTheDocument();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:ar-capture");
  });

  it("does not start duplicate camera requests while permission is pending", async () => {
    let resolveStream!: (stream: MediaStream) => void;
    const pending = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve;
    });
    const getUserMedia = vi.spyOn(browserArRuntime, "getUserMedia").mockReturnValue(pending);
    renderAr();
    const button = await screen.findByRole("button", { name: "카메라 시작" });
    await userEvent.click(button);
    expect(button).not.toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    resolveStream({ getTracks: () => [] } as unknown as MediaStream);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  });
});
