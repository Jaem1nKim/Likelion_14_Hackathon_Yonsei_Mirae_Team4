import { describe, expect, it, vi } from "vitest";

import { drawArOverlayLayers } from "./ar-overlay-renderer";

describe("AR overlay renderer", () => {
  it("draws APPAREL, BAG, and ACCESSORY in order without clearing between layers", () => {
    const context = {
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
    };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 800;
    const apparel = document.createElement("img");
    const bag = document.createElement("img");
    const accessory = document.createElement("img");

    drawArOverlayLayers(canvas, [
      { image: apparel, visible: true, transform: { centerX: 500, centerY: 400, width: 500, height: 450, rotationRadians: 0 } },
      { image: bag, visible: true, transform: { centerX: 520, centerY: 430, width: 280, height: 300, rotationRadians: 0.05 } },
      { image: accessory, visible: true, transform: { centerX: 480, centerY: 280, width: 180, height: 160, rotationRadians: -0.02 } },
    ]);

    expect(context.clearRect).toHaveBeenCalledTimes(1);
    expect(context.drawImage).toHaveBeenCalledTimes(3);
    expect(context.drawImage.mock.calls[0]?.[0]).toBe(apparel);
    expect(context.drawImage.mock.calls[1]?.[0]).toBe(bag);
    expect(context.drawImage.mock.calls[2]?.[0]).toBe(accessory);
  });

  it("can hide APPAREL without suppressing BAG", () => {
    const context = {
      clearRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), restore: vi.fn(),
    };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    const canvas = document.createElement("canvas");
    const bag = document.createElement("img");

    drawArOverlayLayers(canvas, [
      { image: document.createElement("img"), visible: false, transform: { centerX: 1, centerY: 1, width: 1, height: 1, rotationRadians: 0 } },
      { image: bag, visible: true, transform: { centerX: 2, centerY: 2, width: 2, height: 2, rotationRadians: 0 } },
    ]);

    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.drawImage.mock.calls[0]?.[0]).toBe(bag);
  });

  it("can hide ACCESSORY without suppressing BAG and APPAREL", () => {
    const context = {
      clearRect: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), restore: vi.fn(),
    };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    const canvas = document.createElement("canvas");
    const apparel = document.createElement("img");
    const bag = document.createElement("img");

    drawArOverlayLayers(canvas, [
      { image: apparel, visible: true, transform: { centerX: 1, centerY: 1, width: 1, height: 1, rotationRadians: 0 } },
      { image: bag, visible: true, transform: { centerX: 2, centerY: 2, width: 2, height: 2, rotationRadians: 0 } },
      { image: document.createElement("img"), visible: false, transform: { centerX: 3, centerY: 3, width: 3, height: 3, rotationRadians: 0 } },
    ]);

    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls[0]?.[0]).toBe(apparel);
    expect(context.drawImage.mock.calls[1]?.[0]).toBe(bag);
  });
});
