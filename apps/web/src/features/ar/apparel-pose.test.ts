import { describe, expect, it } from "vitest";

import { getApparelArAsset } from "./apparel-ar-assets";
import {
  APPAREL_COMMON_Y_ANCHOR_OFFSET,
  APPAREL_POSE_LOSS_GRACE_MS,
  calculateApparelOverlay,
  createApparelTrackingState,
  updateApparelTracking,
  type ApparelOverlayConfig,
} from "./apparel-pose";
import type { PoseLandmark, VideoViewport } from "./bag-pose";

const viewport: VideoViewport = {
  sourceWidth: 1000,
  sourceHeight: 800,
  displayWidth: 1000,
  displayHeight: 800,
  devicePixelRatio: 1,
};

const config: ApparelOverlayConfig = {
  scaleMultiplier: 1,
  offsetX: 0,
  offsetY: 0,
  rotationOffset: 0,
};

function torsoLandmarks(overrides: Partial<Record<11 | 12 | 23 | 24, PoseLandmark>> = {}) {
  const landmarks: PoseLandmark[] = Array.from(
    { length: 33 },
    () => ({ x: 0, y: 0, visibility: 0 }),
  );
  landmarks[11] = overrides[11] ?? { x: 0.7, y: 0.25, visibility: 1, presence: 1 };
  landmarks[12] = overrides[12] ?? { x: 0.3, y: 0.25, visibility: 1, presence: 1 };
  landmarks[23] = overrides[23] ?? { x: 0.62, y: 0.75, visibility: 1, presence: 1 };
  landmarks[24] = overrides[24] ?? { x: 0.38, y: 0.75, visibility: 1, presence: 1 };
  return landmarks;
}

describe("APPAREL torso projection", () => {
  it("uses shoulder width, torso height and torso center for the overlay", () => {
    const result = calculateApparelOverlay(torsoLandmarks(), viewport, config, false)!;
    expect(result.centerX).toBeCloseTo(500, 6);
    expect(result.centerY).toBeCloseTo(352, 6);
    expect(result.width).toBeCloseTo(552, 6);
    expect(result.height).toBeCloseTo(460, 6);
    expect(result.rotationRadians).toBeCloseTo(0, 6);
  });

  it.each(["DEMO-APP-001", "DEMO-APP-002", "DEMO-APP-003"])(
    "moves %s upward by the common torso anchor and covers the shoulder line",
    (sku) => {
      const asset = getApparelArAsset({ id: sku, sku, category: "APPAREL" })!;
      const result = calculateApparelOverlay(torsoLandmarks(), viewport, asset, false)!;
      const shoulderY = 0.25 * viewport.displayHeight;
      const torsoHeight = (0.75 - 0.25) * viewport.displayHeight;
      const centerWithoutCommonOffset = shoulderY + torsoHeight * (0.5 + asset.offsetY);
      const overlayTop = result.centerY - result.height / 2;

      expect(result.centerY).toBeCloseTo(
        centerWithoutCommonOffset + torsoHeight * APPAREL_COMMON_Y_ANCHOR_OFFSET,
        6,
      );
      expect(overlayTop).toBeLessThan(shoulderY);
    },
  );

  it("scales width from shoulders and height from shoulder-to-hip length", () => {
    const narrow = calculateApparelOverlay(torsoLandmarks({
      11: { x: 0.6, y: 0.25, visibility: 1 },
      12: { x: 0.4, y: 0.25, visibility: 1 },
    }), viewport, config, false)!;
    const short = calculateApparelOverlay(torsoLandmarks({
      23: { x: 0.62, y: 0.55, visibility: 1 },
      24: { x: 0.38, y: 0.55, visibility: 1 },
    }), viewport, config, false)!;
    const baseline = calculateApparelOverlay(torsoLandmarks(), viewport, config, false)!;

    expect(narrow.width).toBeLessThan(baseline.width);
    expect(narrow.height).toBeCloseTo(baseline.height, 6);
    expect(short.height).toBeLessThan(baseline.height);
    expect(short.width).toBeCloseTo(baseline.width, 6);
  });

  it("mirrors horizontal position and rotation exactly once", () => {
    const pose = torsoLandmarks({
      11: { x: 0.8, y: 0.2, visibility: 1 },
      12: { x: 0.4, y: 0.3, visibility: 1 },
      23: { x: 0.7, y: 0.75, visibility: 1 },
      24: { x: 0.45, y: 0.72, visibility: 1 },
    });
    const normal = calculateApparelOverlay(pose, viewport, config, false)!;
    const mirrored = calculateApparelOverlay(pose, viewport, config, true)!;

    expect(mirrored.centerX).toBeCloseTo(viewport.displayWidth - normal.centerX, 6);
    expect(mirrored.rotationRadians).toBeCloseTo(-normal.rotationRadians, 6);
    expect(mirrored.width).toBeCloseTo(normal.width, 6);
    expect(mirrored.height).toBeCloseTo(normal.height, 6);
  });

  it("hides the overlay when a torso landmark is unreliable", () => {
    const pose = torsoLandmarks({
      24: { x: 0.38, y: 0.75, visibility: 0.2, presence: 1 },
    });
    expect(calculateApparelOverlay(pose, viewport, config)).toBeNull();
  });
});

describe("APPAREL smoothing and landmark loss", () => {
  it("smooths small position, size and rotation changes with APPAREL settings", () => {
    const initial = calculateApparelOverlay(torsoLandmarks(), viewport, config, true)!;
    const first = updateApparelTracking(createApparelTrackingState(), initial, 1_000);
    const noisy = { ...initial, centerX: initial.centerX + 6, width: initial.width + 8, rotationRadians: 0.04 };
    const second = updateApparelTracking(first.state, noisy, 1_033);

    expect(second.transform!.centerX).toBeGreaterThan(initial.centerX);
    expect(second.transform!.centerX).toBeLessThan(noisy.centerX);
    expect(second.transform!.width).toBeLessThan(noisy.width);
    expect(second.transform!.rotationRadians).toBeLessThan(noisy.rotationRadians);
  });

  it("keeps APPAREL briefly during landmark loss, then hides it", () => {
    const initial = calculateApparelOverlay(torsoLandmarks(), viewport, config, true)!;
    const tracked = updateApparelTracking(createApparelTrackingState(), initial, 1_000);
    const grace = updateApparelTracking(tracked.state, null, 1_000 + APPAREL_POSE_LOSS_GRACE_MS - 1);
    const lost = updateApparelTracking(tracked.state, null, 1_000 + APPAREL_POSE_LOSS_GRACE_MS + 1);

    expect(grace.transform).toEqual(tracked.transform);
    expect(grace.isWithinGracePeriod).toBe(true);
    expect(lost.transform).toBeNull();
  });
});
