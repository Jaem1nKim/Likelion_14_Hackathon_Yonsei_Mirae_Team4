import { describe, expect, it } from "vitest";

import { getBagArAsset } from "./bag-ar-assets";
import {
  calculateBagOverlay,
  calculateCanvasLayout,
  createBagTrackingState,
  normalizeShoulderRotation,
  POSE_LOSS_GRACE_MS,
  smoothBagOverlay,
  updateBagTracking,
  type BagOverlayConfig,
  type BagOverlayTransform,
  type PoseLandmark,
  type VideoViewport,
} from "./bag-pose";

const config: BagOverlayConfig = {
  aspectRatio: 1,
  scaleMultiplier: 1,
  offsetX: 0,
  offsetY: 0.6,
  rotationOffset: 0,
  anchor: "UPPER_TORSO",
};

const viewport: VideoViewport = {
  sourceWidth: 1280,
  sourceHeight: 720,
  displayWidth: 1000,
  displayHeight: 800,
  devicePixelRatio: 1,
};

function torsoLandmarks(overrides: Partial<Record<11 | 12 | 23 | 24, PoseLandmark>> = {}) {
  const landmarks: PoseLandmark[] = Array.from(
    { length: 33 },
    () => ({ x: 0, y: 0, visibility: 0 }),
  );
  landmarks[11] = overrides[11] ?? { x: 0.3, y: 0.25, visibility: 1, presence: 1 };
  landmarks[12] = overrides[12] ?? { x: 0.7, y: 0.25, visibility: 1, presence: 1 };
  landmarks[23] = overrides[23] ?? { x: 0.38, y: 0.75, visibility: 1, presence: 1 };
  landmarks[24] = overrides[24] ?? { x: 0.62, y: 0.75, visibility: 1, presence: 1 };
  return landmarks;
}

function frontFacingMediaPipeLandmarks() {
  return torsoLandmarks({
    11: { x: 0.7, y: 0.25, visibility: 1, presence: 1 },
    12: { x: 0.3, y: 0.25, visibility: 1, presence: 1 },
    23: { x: 0.62, y: 0.75, visibility: 1, presence: 1 },
    24: { x: 0.38, y: 0.75, visibility: 1, presence: 1 },
  });
}

function transform(overrides: Partial<BagOverlayTransform> = {}): BagOverlayTransform {
  return {
    centerX: 500,
    centerY: 400,
    width: 300,
    height: 300,
    rotationRadians: 0,
    ...overrides,
  };
}

describe("BAG pose projection and calibration", () => {
  it("normalizes either horizontal shoulder vector direction to zero rotation", () => {
    expect(normalizeShoulderRotation(0)).toBeCloseTo(0, 8);
    expect(normalizeShoulderRotation(Math.PI)).toBeCloseTo(0, 8);
    expect(normalizeShoulderRotation(-Math.PI)).toBeCloseTo(0, 8);
  });

  it.each([
    ["DEMO-BAG-001", 0],
    ["DEMO-BAG-002", 0.025],
    ["DEMO-BAG-003", -0.075],
  ])(
    "keeps %s upright with MediaPipe's anatomical shoulder direction",
    (sku, expectedRotation) => {
      const asset = getBagArAsset({ id: sku, sku, category: "BAG" })!;
      const normal = calculateBagOverlay(
        frontFacingMediaPipeLandmarks(),
        viewport,
        asset,
        false,
      )!;
      const mirrored = calculateBagOverlay(
        frontFacingMediaPipeLandmarks(),
        viewport,
        asset,
        true,
      )!;

      expect(normal.rotationRadians).toBeCloseTo(expectedRotation, 8);
      expect(mirrored.rotationRadians).toBeCloseTo(-expectedRotation, 8);
      expect(Math.abs(normal.rotationRadians)).toBeLessThan(0.1);
      expect(Math.abs(mirrored.rotationRadians)).toBeLessThan(0.1);
    },
  );

  it("places a bag between the shoulders and hips", () => {
    const result = calculateBagOverlay(torsoLandmarks(), viewport, config, false);
    expect(result).not.toBeNull();
    expect(result!.centerX).toBeCloseTo(500, 4);
    expect(result!.centerY).toBeGreaterThan(300);
  });

  it("scales the bag with shoulder width and torso height", () => {
    const compact = torsoLandmarks({
      11: { x: 0.4, y: 0.3, visibility: 1 },
      12: { x: 0.6, y: 0.3, visibility: 1 },
      23: { x: 0.44, y: 0.6, visibility: 1 },
      24: { x: 0.56, y: 0.6, visibility: 1 },
    });
    const compactResult = calculateBagOverlay(compact, viewport, config, false);
    const largeResult = calculateBagOverlay(torsoLandmarks(), viewport, config, false);
    expect(largeResult!.width).toBeGreaterThan(compactResult!.width);
  });

  it("uses shoulder tilt for rotation and reverses it for mirrored video", () => {
    const tilted = torsoLandmarks({
      11: { x: 0.7, y: 0.2, visibility: 1 },
      12: { x: 0.3, y: 0.3, visibility: 1 },
    });
    const normal = calculateBagOverlay(tilted, viewport, config, false);
    const mirrored = calculateBagOverlay(tilted, viewport, config, true);
    expect(normal!.rotationRadians).toBeLessThan(0);
    expect(Math.abs(normal!.rotationRadians)).toBeLessThan(Math.PI / 2);
    expect(mirrored!.rotationRadians).toBeCloseTo(-normal!.rotationRadians, 8);
  });

  it("mirrors the display coordinate once for the front camera", () => {
    const shifted = torsoLandmarks({
      11: { x: 0.15, y: 0.25, visibility: 1 },
      12: { x: 0.45, y: 0.25, visibility: 1 },
      23: { x: 0.2, y: 0.75, visibility: 1 },
      24: { x: 0.4, y: 0.75, visibility: 1 },
    });
    const normal = calculateBagOverlay(shifted, viewport, config, false);
    const mirrored = calculateBagOverlay(shifted, viewport, config, true);
    expect(mirrored!.centerX).toBeCloseTo(viewport.displayWidth - normal!.centerX, 8);
  });

  it("accepts the 0.45 threshold and rejects lower visibility or presence", () => {
    const boundary = torsoLandmarks({ 23: { x: 0.38, y: 0.75, visibility: 0.45, presence: 0.45 } });
    const below = torsoLandmarks({ 23: { x: 0.38, y: 0.75, visibility: 0.449, presence: 1 } });
    expect(calculateBagOverlay(boundary, viewport, config)).not.toBeNull();
    expect(calculateBagOverlay(below, viewport, config)).toBeNull();
  });

  it("applies different normalized anchors for backpack, Boston and crossbody bags", () => {
    const backpack = getBagArAsset({ id: "1", sku: "DEMO-BAG-001", category: "BAG" })!;
    const boston = getBagArAsset({ id: "2", sku: "DEMO-BAG-002", category: "BAG" })!;
    const crossbody = getBagArAsset({ id: "3", sku: "DEMO-BAG-003", category: "BAG" })!;
    const pose = torsoLandmarks();
    const backpackResult = calculateBagOverlay(pose, viewport, backpack, false)!;
    const bostonResult = calculateBagOverlay(pose, viewport, boston, false)!;
    const crossbodyResult = calculateBagOverlay(pose, viewport, crossbody, false)!;

    expect(backpack.anchor).toBe("UPPER_TORSO");
    expect(boston.anchor).toBe("LOWER_SIDE");
    expect(crossbody.anchor).toBe("CROSSBODY");
    expect(backpackResult.centerY).toBeLessThan(crossbodyResult.centerY);
    expect(crossbodyResult.centerY).toBeLessThan(bostonResult.centerY);
    expect(bostonResult.centerX).toBeGreaterThan(backpackResult.centerX);
    expect(crossbodyResult.centerX).toBeLessThan(backpackResult.centerX);
  });
});

describe("BAG transform smoothing and pose loss", () => {
  it("suppresses small landmark noise", () => {
    const previous = transform();
    const noisy = transform({ centerX: 506, centerY: 397, width: 304, rotationRadians: 0.03 });
    const smoothed = smoothBagOverlay(previous, noisy, 1000 / 30);
    expect(smoothed.centerX).toBeGreaterThan(previous.centerX);
    expect(smoothed.centerX).toBeLessThan(noisy.centerX);
    expect(smoothed.width).toBeLessThan(noisy.width);
    expect(smoothed.rotationRadians).toBeLessThan(noisy.rotationRadians);
  });

  it("uses a faster response for rapid movement", () => {
    const previous = transform();
    const rapid = transform({ centerX: 700, centerY: 520 });
    const smoothed = smoothBagOverlay(previous, rapid, 1000 / 30);
    expect(smoothed.centerX).toBeGreaterThanOrEqual(636);
    expect(smoothed.centerY).toBeGreaterThanOrEqual(481.6);
  });

  it("keeps the last transform during a short landmark loss", () => {
    const detected = transform();
    const tracked = updateBagTracking(createBagTrackingState(), detected, 1_000);
    const temporaryLoss = updateBagTracking(tracked.state, null, 1_000 + POSE_LOSS_GRACE_MS - 1);
    expect(temporaryLoss.transform).toEqual(tracked.transform);
    expect(temporaryLoss.isWithinGracePeriod).toBe(true);
  });

  it("hides the overlay after the grace period and reacquires cleanly", () => {
    const tracked = updateBagTracking(createBagTrackingState(), transform(), 1_000);
    const lost = updateBagTracking(tracked.state, null, 1_000 + POSE_LOSS_GRACE_MS + 1);
    expect(lost.transform).toBeNull();
    const reacquired = updateBagTracking(lost.state, transform({ centerX: 620 }), 2_000);
    expect(reacquired.transform?.centerX).toBe(620);
  });
});

describe("responsive canvas projection", () => {
  it("accounts for device pixel ratio without changing CSS placement", () => {
    const layout = calculateCanvasLayout({
      sourceWidth: 1280,
      sourceHeight: 720,
      displayWidth: 400,
      displayHeight: 300,
      devicePixelRatio: 2,
    });
    expect(layout?.canvasWidth).toBe(800);
    expect(layout?.canvasHeight).toBe(600);
    const oneX = calculateBagOverlay(torsoLandmarks(), { ...viewport, devicePixelRatio: 1 }, config, false)!;
    const twoX = calculateBagOverlay(torsoLandmarks(), { ...viewport, devicePixelRatio: 2 }, config, false)!;
    expect(twoX.centerX).toBeCloseTo(oneX.centerX * 2, 6);
    expect(twoX.width).toBeCloseTo(oneX.width * 2, 6);
  });

  it("supports portrait and landscape object-fit cover layouts", () => {
    const portrait = calculateCanvasLayout({
      sourceWidth: 1280,
      sourceHeight: 720,
      displayWidth: 390,
      displayHeight: 700,
    })!;
    const landscape = calculateCanvasLayout({
      sourceWidth: 1280,
      sourceHeight: 720,
      displayWidth: 800,
      displayHeight: 450,
    })!;
    expect(portrait.renderedVideoHeight).toBeCloseTo(700, 6);
    expect(portrait.videoOffsetX).toBeLessThan(0);
    expect(landscape.videoOffsetX).toBeCloseTo(0, 6);
    expect(landscape.videoOffsetY).toBeCloseTo(0, 6);
  });
});
