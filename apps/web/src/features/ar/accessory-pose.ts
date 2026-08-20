import {
  calculateCanvasLayout,
  calculateTorsoPoseGeometry,
  createBagTrackingState,
  finalizeOverlayTransform,
  normalizeShoulderRotation,
  isPoseLandmarkVisible,
  POSE_LANDMARK_INDEX,
  projectPoseLandmark,
  updateBagTracking,
  type BagOverlayTransform,
  type BagSmoothingOptions,
  type BagTrackingState,
  type BagTrackingUpdate,
  type PoseLandmark,
  type VideoViewport,
} from "./bag-pose";

export type AccessoryAnchor = "NECK" | "WAIST" | "TORSO_SIDE" | "BAG_ATTACHED" | "GLASSES";

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

const ANCHOR_CALIBRATION: Record<Exclude<AccessoryAnchor, "BAG_ATTACHED" | "GLASSES">, {
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

function calculateGlassesOverlay(
  landmarks: readonly PoseLandmark[] | undefined,
  viewport: VideoViewport,
  config: AccessoryOverlayConfig,
  mirrored: boolean,
): AccessoryOverlayTransform | null {
  const layout = calculateCanvasLayout(viewport);
  if (!landmarks || !layout || config.aspectRatio <= 0 || config.scaleMultiplier <= 0) {
    return null;
  }

  const leftEyeLandmark = landmarks[POSE_LANDMARK_INDEX.leftEyeOuter];
  const rightEyeLandmark = landmarks[POSE_LANDMARK_INDEX.rightEyeOuter];
  if (!isPoseLandmarkVisible(leftEyeLandmark) || !isPoseLandmarkVisible(rightEyeLandmark)) {
    return null;
  }

  const leftEye = projectPoseLandmark(leftEyeLandmark, layout);
  const rightEye = projectPoseLandmark(rightEyeLandmark, layout);
  const eyeVector = {
    x: rightEye.x - leftEye.x,
    y: rightEye.y - leftEye.y,
  };
  const eyeWidth = Math.hypot(eyeVector.x, eyeVector.y);
  if (eyeWidth < viewport.displayWidth * 0.025) return null;

  const leftEarLandmark = landmarks[POSE_LANDMARK_INDEX.leftEar];
  const rightEarLandmark = landmarks[POSE_LANDMARK_INDEX.rightEar];
  let faceWidth = eyeWidth * 2.15;
  if (isPoseLandmarkVisible(leftEarLandmark) && isPoseLandmarkVisible(rightEarLandmark)) {
    const leftEar = projectPoseLandmark(leftEarLandmark, layout);
    const rightEar = projectPoseLandmark(rightEarLandmark, layout);
    faceWidth = Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y);
  }
  const width = clamp(
    faceWidth * 0.94 * config.scaleMultiplier,
    viewport.displayWidth * 0.13,
    viewport.displayWidth * 0.48,
  );
  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const rotationRadians = normalizeShoulderRotation(
    Math.atan2(eyeVector.y, eyeVector.x),
  ) + config.rotationOffset;

  return finalizeOverlayTransform({
    centerX: eyeCenter.x + width * config.offsetX,
    centerY: eyeCenter.y + width * config.offsetY,
    width,
    height: width / config.aspectRatio,
    rotationRadians,
  }, viewport, layout, mirrored);
}

export function calculateAccessoryOverlay(
  landmarks: readonly PoseLandmark[] | undefined,
  viewport: VideoViewport,
  config: AccessoryOverlayConfig,
  mirrored = true,
): AccessoryOverlayTransform | null {
  if (config.anchor === "BAG_ATTACHED") return null;
  if (config.anchor === "GLASSES") {
    return calculateGlassesOverlay(landmarks, viewport, config, mirrored);
  }
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
