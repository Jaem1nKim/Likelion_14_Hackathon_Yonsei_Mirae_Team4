import {
  calculateTorsoPoseGeometry,
  createBagTrackingState,
  finalizeOverlayTransform,
  normalizeShoulderRotation,
  updateBagTracking,
  type BagOverlayTransform,
  type BagSmoothingOptions,
  type BagTrackingState,
  type BagTrackingUpdate,
  type PoseLandmark,
  type VideoViewport,
} from "./bag-pose";

export type AccessoryAnchor = "NECK" | "WAIST" | "TORSO_SIDE" | "BAG_ATTACHED";

export type AccessoryOverlayConfig = {
  anchor: AccessoryAnchor;
  aspectRatio: number;
  scaleMultiplier: number;
  offsetX: number;
  offsetY: number;
  rotationOffset: number;
};

export type AccessoryOverlayTransform = BagOverlayTransform;
export type AccessoryTrackingState = BagTrackingState;
export type AccessoryTrackingUpdate = BagTrackingUpdate;

export const ACCESSORY_POSE_LOSS_GRACE_MS = 240;

export const ACCESSORY_SMOOTHING: BagSmoothingOptions = {
  positionTimeConstantMs: 70,
  scaleTimeConstantMs: 105,
  rotationTimeConstantMs: 90,
  rapidMovementThreshold: 0.3,
  rapidMovementAlpha: 0.68,
};

export const BAG_ATTACHED_ACCESSORY_CALIBRATION = {
  baseOffsetX: 0.31,
  baseOffsetY: 0,
  widthRatio: 0.14,
  rotationFollowRatio: 0.12,
} as const;

const ANCHOR_CALIBRATION: Record<Exclude<AccessoryAnchor, "BAG_ATTACHED">, {
  torsoRatio: number;
  shoulderAxisRatio: number;
  widthFromShoulders: number;
  minimumWidthRatio: number;
  maximumWidthRatio: number;
}> = {
  NECK: {
    torsoRatio: 0.08,
    shoulderAxisRatio: 0,
    widthFromShoulders: 0.78,
    minimumWidthRatio: 0.12,
    maximumWidthRatio: 0.42,
  },
  WAIST: {
    torsoRatio: 0.9,
    shoulderAxisRatio: 0,
    widthFromShoulders: 1.12,
    minimumWidthRatio: 0.2,
    maximumWidthRatio: 0.62,
  },
  TORSO_SIDE: {
    torsoRatio: 0.56,
    shoulderAxisRatio: 0.48,
    widthFromShoulders: 0.3,
    minimumWidthRatio: 0.07,
    maximumWidthRatio: 0.24,
  },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateAccessoryOverlay(
  landmarks: readonly PoseLandmark[] | undefined,
  viewport: VideoViewport,
  config: AccessoryOverlayConfig,
  mirrored = true,
): AccessoryOverlayTransform | null {
  if (config.anchor === "BAG_ATTACHED") return null;
  const geometry = calculateTorsoPoseGeometry(landmarks, viewport);
  if (!geometry || config.aspectRatio <= 0 || config.scaleMultiplier <= 0) return null;

  const {
    layout,
    shoulderCenter,
    shoulderVector,
    torsoVector,
    shoulderWidth,
  } = geometry;
  const anchor = ANCHOR_CALIBRATION[config.anchor];
  const width = clamp(
    shoulderWidth * anchor.widthFromShoulders * config.scaleMultiplier,
    viewport.displayWidth * anchor.minimumWidthRatio,
    viewport.displayWidth * anchor.maximumWidthRatio,
  );
  const torsoRatio = anchor.torsoRatio + config.offsetY;
  const shoulderAxisRatio = anchor.shoulderAxisRatio + config.offsetX;
  const centerX = shoulderCenter.x
    + torsoVector.x * torsoRatio
    + shoulderVector.x * shoulderAxisRatio;
  const centerY = shoulderCenter.y
    + torsoVector.y * torsoRatio
    + shoulderVector.y * shoulderAxisRatio;
  const rotationRadians = normalizeShoulderRotation(
    Math.atan2(shoulderVector.y, shoulderVector.x),
  ) + config.rotationOffset;

  return finalizeOverlayTransform({
    centerX,
    centerY,
    width,
    height: width / config.aspectRatio,
    rotationRadians,
  }, viewport, layout, mirrored);
}

export function calculateBagAttachedAccessoryOverlay(
  bagTransform: BagOverlayTransform | null,
  config: AccessoryOverlayConfig,
): AccessoryOverlayTransform | null {
  if (
    !bagTransform
    || config.anchor !== "BAG_ATTACHED"
    || config.aspectRatio <= 0
    || config.scaleMultiplier <= 0
  ) {
    return null;
  }

  const localX = bagTransform.width
    * (BAG_ATTACHED_ACCESSORY_CALIBRATION.baseOffsetX + config.offsetX);
  const localY = bagTransform.height
    * (BAG_ATTACHED_ACCESSORY_CALIBRATION.baseOffsetY + config.offsetY);
  const cosine = Math.cos(bagTransform.rotationRadians);
  const sine = Math.sin(bagTransform.rotationRadians);
  const width = bagTransform.width
    * BAG_ATTACHED_ACCESSORY_CALIBRATION.widthRatio
    * config.scaleMultiplier;

  return {
    centerX: bagTransform.centerX + localX * cosine - localY * sine,
    centerY: bagTransform.centerY + localX * sine + localY * cosine,
    width,
    height: width / config.aspectRatio,
    rotationRadians: bagTransform.rotationRadians
      * BAG_ATTACHED_ACCESSORY_CALIBRATION.rotationFollowRatio
      + config.rotationOffset,
  };
}

export function shouldRenderAccessoryOverlay(
  anchor: AccessoryAnchor | null,
  accessoryVisible: boolean,
  bagVisible: boolean,
  bagAssetReady: boolean,
  bagTransform: BagOverlayTransform | null,
): boolean {
  if (!anchor || !accessoryVisible) return false;
  if (anchor !== "BAG_ATTACHED") return true;
  return bagVisible && bagAssetReady && bagTransform !== null;
}

export function createAccessoryTrackingState(): AccessoryTrackingState {
  return createBagTrackingState();
}

export function updateAccessoryTracking(
  previous: AccessoryTrackingState,
  detected: AccessoryOverlayTransform | null,
  nowMs: number,
): AccessoryTrackingUpdate {
  return updateBagTracking(
    previous,
    detected,
    nowMs,
    ACCESSORY_POSE_LOSS_GRACE_MS,
    ACCESSORY_SMOOTHING,
  );
}

export function updateBagAttachedAccessoryTracking(
  previous: AccessoryTrackingState,
  detected: AccessoryOverlayTransform | null,
  nowMs: number,
): AccessoryTrackingUpdate {
  return updateBagTracking(
    previous,
    detected,
    nowMs,
    0,
    ACCESSORY_SMOOTHING,
  );
}
