import { describe, expect, it } from "vitest";

import { getAccessoryArAsset } from "./accessory-ar-assets";
import {
  ACCESSORY_POSE_LOSS_GRACE_MS,
  BAG_ATTACHED_ACCESSORY_CALIBRATION,
  calculateAccessoryOverlay,
  calculateBagAttachedAccessoryOverlay,
  createAccessoryTrackingState,
  shouldRenderAccessoryOverlay,
  updateAccessoryTracking,
  updateBagAttachedAccessoryTracking,
  type AccessoryOverlayConfig,
} from "./accessory-pose";
import type { BagOverlayTransform, PoseLandmark, VideoViewport } from "./bag-pose";

const viewport: VideoViewport = {
  sourceWidth: 1000,
  sourceHeight: 800,
  displayWidth: 1000,
  displayHeight: 800,
  devicePixelRatio: 1,
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

function config(anchor: AccessoryOverlayConfig["anchor"]): AccessoryOverlayConfig {
  return {
    anchor,
    aspectRatio: 1,
    scaleMultiplier: 1,
    offsetX: 0,
    offsetY: 0,
    rotationOffset: 0,
  };
}

describe("ACCESSORY pose projection", () => {
  it("uses product-specific neck, waist, and torso-side anchors", () => {
    const pose = torsoLandmarks();
    const scarf = calculateAccessoryOverlay(pose, viewport, config("NECK"), false)!;
    const belt = calculateAccessoryOverlay(pose, viewport, config("WAIST"), false)!;
    const charm = calculateAccessoryOverlay(pose, viewport, config("TORSO_SIDE"), false)!;

    expect(scarf.centerY).toBeLessThan(charm.centerY);
    expect(charm.centerY).toBeLessThan(belt.centerY);
    expect(charm.centerX).not.toBeCloseTo(belt.centerX, 4);
    expect(belt.width).toBeGreaterThan(scarf.width);
    expect(scarf.width).toBeGreaterThan(charm.width);
  });

  it.each(["DEMO-ACC-001", "DEMO-ACC-002"])(
    "applies the %s calibration to a valid torso",
    (sku) => {
      const asset = getAccessoryArAsset({ id: sku, sku, category: "ACCESSORY" })!;
      const overlay = calculateAccessoryOverlay(torsoLandmarks(), viewport, asset, false);
      expect(overlay).not.toBeNull();
      expect(overlay!.width).toBeGreaterThan(0);
      expect(overlay!.height).toBeGreaterThan(0);
    },
  );

  it("does not project a BAG-attached accessory from torso landmarks", () => {
    const charm = getAccessoryArAsset({
      id: "DEMO-ACC-003",
      sku: "DEMO-ACC-003",
      category: "ACCESSORY",
    })!;
    expect(calculateAccessoryOverlay(torsoLandmarks(), viewport, charm, false)).toBeNull();
  });

  it("mirrors horizontal position and rotation exactly once", () => {
    const pose = torsoLandmarks({
      11: { x: 0.8, y: 0.2, visibility: 1 },
      12: { x: 0.4, y: 0.3, visibility: 1 },
      23: { x: 0.7, y: 0.75, visibility: 1 },
      24: { x: 0.45, y: 0.72, visibility: 1 },
    });
    const normal = calculateAccessoryOverlay(pose, viewport, config("TORSO_SIDE"), false)!;
    const mirrored = calculateAccessoryOverlay(pose, viewport, config("TORSO_SIDE"), true)!;

    expect(mirrored.centerX).toBeCloseTo(viewport.displayWidth - normal.centerX, 6);
    expect(mirrored.rotationRadians).toBeCloseTo(-normal.rotationRadians, 6);
    expect(mirrored.width).toBeCloseTo(normal.width, 6);
  });

  it("returns no overlay when a required torso landmark is unreliable", () => {
    const pose = torsoLandmarks({
      23: { x: 0.62, y: 0.75, visibility: 0.2, presence: 1 },
    });
    expect(calculateAccessoryOverlay(pose, viewport, config("WAIST"))).toBeNull();
  });

  it("can calculate BAG, APPAREL, and ACCESSORY transforms from one pose result", async () => {
    const [{ calculateBagOverlay }, { calculateApparelOverlay }] = await Promise.all([
      import("./bag-pose"),
      import("./apparel-pose"),
    ]);
    const pose = torsoLandmarks();
    const bag = calculateBagOverlay(pose, viewport, {
      anchor: "UPPER_TORSO",
      aspectRatio: 1,
      scaleMultiplier: 1,
      offsetX: 0,
      offsetY: 0.5,
      rotationOffset: 0,
    });
    const apparel = calculateApparelOverlay(pose, viewport, {
      scaleMultiplier: 1,
      offsetX: 0,
      offsetY: 0,
      rotationOffset: 0,
    });
    const accessory = calculateAccessoryOverlay(pose, viewport, config("NECK"));

    expect([bag, apparel, accessory].every(Boolean)).toBe(true);
  });
});

describe("BAG-attached Charm projection", () => {
  const bag: BagOverlayTransform = {
    centerX: 500,
    centerY: 420,
    width: 300,
    height: 260,
    rotationRadians: 0,
  };
  const charm = getAccessoryArAsset({
    id: "DEMO-ACC-003",
    sku: "DEMO-ACC-003",
    category: "ACCESSORY",
  })!;

  it("anchors the Charm near the BAG right side and zipper", () => {
    const overlay = calculateBagAttachedAccessoryOverlay(bag, charm)!;
    const expectedLocalX = bag.width
      * (BAG_ATTACHED_ACCESSORY_CALIBRATION.baseOffsetX + charm.offsetX);
    const expectedLocalY = bag.height
      * (BAG_ATTACHED_ACCESSORY_CALIBRATION.baseOffsetY + charm.offsetY);

    expect(overlay.centerX).toBeGreaterThan(bag.centerX);
    expect(overlay.centerY).toBeGreaterThan(bag.centerY);
    expect(overlay.centerX).toBeCloseTo(bag.centerX + expectedLocalX, 6);
    expect(overlay.centerY).toBeCloseTo(bag.centerY + expectedLocalY, 6);
    expect(expectedLocalX / bag.width).toBeCloseTo(0.35, 6);
    expect(expectedLocalY / bag.height).toBeCloseTo(0.02, 6);
    expect(overlay.width).toBeCloseTo(
      bag.width * BAG_ATTACHED_ACCESSORY_CALIBRATION.widthRatio * charm.scaleMultiplier,
      6,
    );
    expect(overlay.height).toBeCloseTo(overlay.width / charm.aspectRatio, 6);
    expect(overlay.rotationRadians).toBeCloseTo(charm.rotationOffset, 6);
  });

  it("follows BAG translation and scale", () => {
    const initial = calculateBagAttachedAccessoryOverlay(bag, charm)!;
    const moved = calculateBagAttachedAccessoryOverlay({
      ...bag,
      centerX: bag.centerX + 80,
      centerY: bag.centerY + 35,
    }, charm)!;
    const scaled = calculateBagAttachedAccessoryOverlay({
      ...bag,
      width: bag.width * 1.5,
      height: bag.height * 1.5,
    }, charm)!;

    expect(moved.centerX - initial.centerX).toBeCloseTo(80, 6);
    expect(moved.centerY - initial.centerY).toBeCloseTo(35, 6);
    expect(scaled.width).toBeCloseTo(initial.width * 1.5, 6);
    expect(scaled.centerX - bag.centerX).toBeCloseTo((initial.centerX - bag.centerX) * 1.5, 6);
    expect(scaled.centerY - bag.centerY).toBeCloseTo((initial.centerY - bag.centerY) * 1.5, 6);
  });

  it("rotates the attachment point and Charm with the BAG", () => {
    const rotatedBag = { ...bag, rotationRadians: Math.PI / 2 };
    const overlay = calculateBagAttachedAccessoryOverlay(rotatedBag, charm)!;
    const localX = bag.width
      * (BAG_ATTACHED_ACCESSORY_CALIBRATION.baseOffsetX + charm.offsetX);
    const localY = bag.height
      * (BAG_ATTACHED_ACCESSORY_CALIBRATION.baseOffsetY + charm.offsetY);

    expect(overlay.centerX).toBeCloseTo(bag.centerX - localY, 6);
    expect(overlay.centerY).toBeCloseTo(bag.centerY + localX, 6);
    expect(overlay.rotationRadians).toBeCloseTo(
      Math.PI / 2 * BAG_ATTACHED_ACCESSORY_CALIBRATION.rotationFollowRatio
        + charm.rotationOffset,
      6,
    );
    expect(Math.abs(overlay.rotationRadians)).toBeLessThan(Math.PI / 8);
  });

  it("returns no Charm without a valid BAG transform", () => {
    expect(calculateBagAttachedAccessoryOverlay(null, charm)).toBeNull();
    expect(calculateBagAttachedAccessoryOverlay(bag, config("NECK"))).toBeNull();
  });

  it("hides attached Charm when BAG is hidden, missing, or undetected", () => {
    expect(shouldRenderAccessoryOverlay("BAG_ATTACHED", true, true, true, bag)).toBe(true);
    expect(shouldRenderAccessoryOverlay("BAG_ATTACHED", true, false, true, bag)).toBe(false);
    expect(shouldRenderAccessoryOverlay("BAG_ATTACHED", true, true, false, bag)).toBe(false);
    expect(shouldRenderAccessoryOverlay("BAG_ATTACHED", true, true, true, null)).toBe(false);
    expect(shouldRenderAccessoryOverlay("WAIST", true, false, false, null)).toBe(true);
  });

  it("drops the attached Charm immediately when BAG detection is lost", () => {
    const initial = calculateBagAttachedAccessoryOverlay(bag, charm)!;
    const tracked = updateBagAttachedAccessoryTracking(
      createAccessoryTrackingState(),
      initial,
      1_000,
    );
    const lost = updateBagAttachedAccessoryTracking(tracked.state, null, 1_001);

    expect(lost.transform).toBeNull();
    expect(lost.isWithinGracePeriod).toBe(false);
  });
});

describe("ACCESSORY smoothing and landmark loss", () => {
  it("smooths position, scale, and rotation without updating React state", () => {
    const initial = calculateAccessoryOverlay(torsoLandmarks(), viewport, config("NECK"), true)!;
    const first = updateAccessoryTracking(createAccessoryTrackingState(), initial, 1_000);
    const noisy = {
      ...initial,
      centerX: initial.centerX + 8,
      width: initial.width + 10,
      rotationRadians: 0.05,
    };
    const second = updateAccessoryTracking(first.state, noisy, 1_033);

    expect(second.transform!.centerX).toBeGreaterThan(initial.centerX);
    expect(second.transform!.centerX).toBeLessThan(noisy.centerX);
    expect(second.transform!.width).toBeLessThan(noisy.width);
    expect(second.transform!.rotationRadians).toBeLessThan(noisy.rotationRadians);
  });

  it("keeps the ACCESSORY during brief pose loss and then hides it", () => {
    const initial = calculateAccessoryOverlay(torsoLandmarks(), viewport, config("WAIST"), true)!;
    const tracked = updateAccessoryTracking(createAccessoryTrackingState(), initial, 1_000);
    const grace = updateAccessoryTracking(
      tracked.state,
      null,
      1_000 + ACCESSORY_POSE_LOSS_GRACE_MS - 1,
    );
    const lost = updateAccessoryTracking(
      tracked.state,
      null,
      1_000 + ACCESSORY_POSE_LOSS_GRACE_MS + 1,
    );

    expect(grace.transform).toEqual(tracked.transform);
    expect(grace.isWithinGracePeriod).toBe(true);
    expect(lost.transform).toBeNull();
  });
});
