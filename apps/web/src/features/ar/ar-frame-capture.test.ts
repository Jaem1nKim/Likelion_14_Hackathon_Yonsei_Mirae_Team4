import { describe, expect, it, vi } from "vitest";

import { calculateCoverRect, drawArCaptureFrame } from "./ar-frame-capture";

function contextDouble() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("AR frame capture", () => {
  it("calculates an object-fit cover rectangle for portrait output", () => {
    expect(calculateCoverRect(1280, 720, 600, 800)).toEqual({
      x: expect.closeTo(-411.111, 2),
      y: 0,
      width: expect.closeTo(1422.222, 2),
      height: 800,
    });
  });

  it("rejects invalid source or output dimensions", () => {
    expect(calculateCoverRect(0, 720, 600, 800)).toBeNull();
    expect(calculateCoverRect(1280, 720, 0, 800)).toBeNull();
  });

  it("draws the mirrored camera frame before the current AR overlay", () => {
    const context = contextDouble();
    const video = { videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement;
    const overlay = document.createElement("canvas");

    drawArCaptureFrame(context, video, overlay, 800, 600);

    expect(context.translate).toHaveBeenCalledWith(800, 0);
    expect(context.scale).toHaveBeenCalledWith(-1, 1);
    expect(vi.mocked(context.drawImage).mock.calls[0]?.[0]).toBe(video);
    expect(vi.mocked(context.drawImage).mock.calls[1]).toEqual([overlay, 0, 0, 800, 600]);
    expect(vi.mocked(context.restore).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(context.drawImage).mock.invocationCallOrder[1]!);
  });
});
