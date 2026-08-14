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

export type ApparelOverlayConfig = {
  scaleMultiplier: number;
  offsetX: number;
  offsetY: number;
  rotationOffset: number;
};

export type ApparelOverlayTransform = BagOverlayTransform;
export type ApparelTrackingState = BagTrackingState;
export type ApparelTrackingUpdate = BagTrackingUpdate;

export const APPAREL_POSE_LOSS_GRACE_MS = 240;
export const APPAREL_COMMON_Y_ANCHOR_OFFSET = -0.12;

export const APPAREL_SMOOTHING: BagSmoothingOptions = {
  positionTimeConstantMs: 75,
  scaleTimeConstantMs: 115,
  rotationTimeConstantMs: 95,
  rapidMovementThreshold: 0.3,
  rapidMovementAlpha: 0.68,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateApparelOverlay(
  landmarks: readonly PoseLandmark[] | undefined,
  viewport: VideoViewport,
  config: ApparelOverlayConfig,
  mirrored = true,
): ApparelOverlayTransform | null {
  const geometry = calculateTorsoPoseGeometry(landmarks, viewport);
  if (!geometry || config.scaleMultiplier <= 0) return null;

  const {
    layout,
    shoulderCenter,
    shoulderVector,
    torsoVector,
    shoulderWidth,
    torsoHeight,
  } = geometry;
  const width = clamp(
    shoulderWidth * 1.38 * config.scaleMultiplier,
    viewport.displayWidth * 0.24,
    viewport.displayWidth * 0.82,
  );
  const height = clamp(
    torsoHeight * 1.15 * config.scaleMultiplier,
    viewport.displayHeight * 0.25,
    viewport.displayHeight * 0.86,
  );
  const torsoAnchor = 0.5 + APPAREL_COMMON_Y_ANCHOR_OFFSET + config.offsetY;
  const centerX = shoulderCenter.x
    + torsoVector.x * torsoAnchor
    + shoulderVector.x * config.offsetX;
  const centerY = shoulderCenter.y
    + torsoVector.y * torsoAnchor
    + shoulderVector.y * config.offsetX;
  const rotationRadians = normalizeShoulderRotation(
    Math.atan2(shoulderVector.y, shoulderVector.x),
  ) + config.rotationOffset;

  return finalizeOverlayTransform({
    centerX,
    centerY,
    width,
    height,
    rotationRadians,
  }, viewport, layout, mirrored);
}

export function createApparelTrackingState(): ApparelTrackingState {
  return createBagTrackingState();
}

export function updateApparelTracking(
  previous: ApparelTrackingState,
  detected: ApparelOverlayTransform | null,
  nowMs: number,
): ApparelTrackingUpdate {
  return updateBagTracking(
    previous,
    detected,
    nowMs,
    APPAREL_POSE_LOSS_GRACE_MS,
    APPAREL_SMOOTHING,
  );
}
