export const POSE_LANDMARK_INDEX = {
  leftEyeOuter: 3,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
} as const;

export const POSE_VISIBILITY_THRESHOLD = 0.45;
export const POSE_LOSS_GRACE_MS = 240;

export type PoseLandmark = {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
};

export type BagAnchor = "UPPER_TORSO" | "LOWER_SIDE" | "CROSSBODY";

export type BagOverlayConfig = {
  aspectRatio: number;
  scaleMultiplier: number;
  offsetX: number;
  offsetY: number;
  rotationOffset: number;
  anchor: BagAnchor;
};

export type VideoViewport = {
  sourceWidth: number;
  sourceHeight: number;
  displayWidth: number;
  displayHeight: number;
  devicePixelRatio?: number;
};

export type CanvasLayout = {
  canvasWidth: number;
  canvasHeight: number;
  devicePixelRatio: number;
  renderedVideoWidth: number;
  renderedVideoHeight: number;
  videoOffsetX: number;
  videoOffsetY: number;
};

export type TorsoPoseGeometry = {
  layout: CanvasLayout;
  shoulderCenter: { x: number; y: number };
  hipCenter: { x: number; y: number };
  shoulderVector: { x: number; y: number };
  torsoVector: { x: number; y: number };
  shoulderWidth: number;
  torsoHeight: number;
};

export type BagOverlayTransform = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotationRadians: number;
};

export type BagTrackingState = {
  transform: BagOverlayTransform | null;
  lastSeenAtMs: number | null;
  lastUpdatedAtMs: number | null;
};

export type BagTrackingUpdate = {
  state: BagTrackingState;
  transform: BagOverlayTransform | null;
  hasFreshPose: boolean;
  isWithinGracePeriod: boolean;
};

export type BagSmoothingOptions = {
  positionTimeConstantMs: number;
  scaleTimeConstantMs: number;
  rotationTimeConstantMs: number;
  rapidMovementThreshold: number;
  rapidMovementAlpha: number;
};

export const DEFAULT_BAG_SMOOTHING: BagSmoothingOptions = {
  positionTimeConstantMs: 70,
  scaleTimeConstantMs: 105,
  rotationTimeConstantMs: 90,
  rapidMovementThreshold: 0.32,
  rapidMovementAlpha: 0.68,
};

export function isPoseLandmarkVisible(
  landmark: PoseLandmark | undefined,
): landmark is PoseLandmark {
  if (!landmark) return false;
  return (landmark.visibility ?? 1) >= POSE_VISIBILITY_THRESHOLD
    && (landmark.presence ?? 1) >= POSE_VISIBILITY_THRESHOLD;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeShoulderRotation(rotationRadians: number): number {
  let normalized = Math.atan2(
    Math.sin(rotationRadians),
    Math.cos(rotationRadians),
  );

  // A shoulder line is an undirected axis. MediaPipe's anatomical left-to-right
  // vector can point toward PI for a level, front-facing person.
  if (normalized > Math.PI / 2) {
    normalized -= Math.PI;
  } else if (normalized < -Math.PI / 2) {
    normalized += Math.PI;
  }

  return normalized;
}

export function calculateCanvasLayout(viewport: VideoViewport): CanvasLayout | null {
  const {
    sourceWidth,
    sourceHeight,
    displayWidth,
    displayHeight,
  } = viewport;
  if (sourceWidth <= 0 || sourceHeight <= 0 || displayWidth <= 0 || displayHeight <= 0) {
    return null;
  }

  const devicePixelRatio = clamp(viewport.devicePixelRatio ?? 1, 1, 3);
  const coverScale = Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const renderedVideoWidth = sourceWidth * coverScale;
  const renderedVideoHeight = sourceHeight * coverScale;

  return {
    canvasWidth: Math.max(1, Math.round(displayWidth * devicePixelRatio)),
    canvasHeight: Math.max(1, Math.round(displayHeight * devicePixelRatio)),
    devicePixelRatio,
    renderedVideoWidth,
    renderedVideoHeight,
    videoOffsetX: (displayWidth - renderedVideoWidth) / 2,
    videoOffsetY: (displayHeight - renderedVideoHeight) / 2,
  };
}

export function projectPoseLandmark(landmark: PoseLandmark, layout: CanvasLayout) {
  return {
    x: landmark.x * layout.renderedVideoWidth + layout.videoOffsetX,
    y: landmark.y * layout.renderedVideoHeight + layout.videoOffsetY,
  };
}

export function calculateTorsoPoseGeometry(
  landmarks: readonly PoseLandmark[] | undefined,
  viewport: VideoViewport,
): TorsoPoseGeometry | null {
  const layout = calculateCanvasLayout(viewport);
  if (!landmarks || !layout) return null;

  const leftShoulderLandmark = landmarks[POSE_LANDMARK_INDEX.leftShoulder];
  const rightShoulderLandmark = landmarks[POSE_LANDMARK_INDEX.rightShoulder];
  const leftHipLandmark = landmarks[POSE_LANDMARK_INDEX.leftHip];
  const rightHipLandmark = landmarks[POSE_LANDMARK_INDEX.rightHip];

  if (
    !isPoseLandmarkVisible(leftShoulderLandmark)
    || !isPoseLandmarkVisible(rightShoulderLandmark)
    || !isPoseLandmarkVisible(leftHipLandmark)
    || !isPoseLandmarkVisible(rightHipLandmark)
  ) {
    return null;
  }

  const leftShoulder = projectPoseLandmark(leftShoulderLandmark, layout);
  const rightShoulder = projectPoseLandmark(rightShoulderLandmark, layout);
  const leftHip = projectPoseLandmark(leftHipLandmark, layout);
  const rightHip = projectPoseLandmark(rightHipLandmark, layout);
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };
  const shoulderVector = {
    x: rightShoulder.x - leftShoulder.x,
    y: rightShoulder.y - leftShoulder.y,
  };
  const torsoVector = {
    x: hipCenter.x - shoulderCenter.x,
    y: hipCenter.y - shoulderCenter.y,
  };
  const shoulderWidth = Math.hypot(shoulderVector.x, shoulderVector.y);
  const torsoHeight = Math.hypot(torsoVector.x, torsoVector.y);

  if (shoulderWidth < viewport.displayWidth * 0.03 || torsoHeight < viewport.displayHeight * 0.05) {
    return null;
  }

  return {
    layout,
    shoulderCenter,
    hipCenter,
    shoulderVector,
    torsoVector,
    shoulderWidth,
    torsoHeight,
  };
}

export function finalizeOverlayTransform(
  transform: BagOverlayTransform,
  viewport: VideoViewport,
  layout: CanvasLayout,
  mirrored: boolean,
): BagOverlayTransform {
  const centerX = mirrored
    ? viewport.displayWidth - transform.centerX
    : transform.centerX;
  return {
    centerX: centerX * layout.devicePixelRatio,
    centerY: transform.centerY * layout.devicePixelRatio,
    width: transform.width * layout.devicePixelRatio,
    height: transform.height * layout.devicePixelRatio,
    rotationRadians: mirrored ? -transform.rotationRadians : transform.rotationRadians,
  };
}

export function calculateBagOverlay(
  landmarks: readonly PoseLandmark[] | undefined,
  viewport: VideoViewport,
  config: BagOverlayConfig,
  mirrored = true,
): BagOverlayTransform | null {
  const geometry = calculateTorsoPoseGeometry(landmarks, viewport);
  if (!geometry || config.aspectRatio <= 0) return null;
  const {
    layout,
    shoulderCenter,
    shoulderVector,
    torsoVector,
    shoulderWidth,
    torsoHeight,
  } = geometry;

  const normalizedWidth = clamp(
    Math.max(shoulderWidth * 0.82, torsoHeight * 0.58) * config.scaleMultiplier,
    viewport.displayWidth * 0.14,
    viewport.displayWidth * 0.56,
  );
  const bodyCenterX = shoulderCenter.x
    + torsoVector.x * config.offsetY
    + shoulderVector.x * config.offsetX;
  const bodyCenterY = shoulderCenter.y
    + torsoVector.y * config.offsetY
    + shoulderVector.y * config.offsetX;
  const shoulderAngle = normalizeShoulderRotation(
    Math.atan2(shoulderVector.y, shoulderVector.x),
  );
  const rotationRadians = shoulderAngle + config.rotationOffset;

  return finalizeOverlayTransform({
    centerX: bodyCenterX,
    centerY: bodyCenterY,
    width: normalizedWidth,
    height: normalizedWidth / config.aspectRatio,
    rotationRadians,
  }, viewport, layout, mirrored);
}

function timeBasedAlpha(deltaMs: number, timeConstantMs: number) {
  return 1 - Math.exp(-clamp(deltaMs, 1, 100) / timeConstantMs);
}

function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function smoothBagOverlay(
  previous: BagOverlayTransform | null,
  current: BagOverlayTransform,
  deltaMs = 1000 / 30,
  options: BagSmoothingOptions = DEFAULT_BAG_SMOOTHING,
): BagOverlayTransform {
  if (!previous) return current;

  const movement = Math.hypot(
    current.centerX - previous.centerX,
    current.centerY - previous.centerY,
  ) / Math.max(previous.width, 1);
  const basePositionAlpha = timeBasedAlpha(deltaMs, options.positionTimeConstantMs);
  const positionAlpha = movement >= options.rapidMovementThreshold
    ? Math.max(basePositionAlpha, options.rapidMovementAlpha)
    : basePositionAlpha;
  const scaleAlpha = timeBasedAlpha(deltaMs, options.scaleTimeConstantMs);
  const rotationAlpha = timeBasedAlpha(deltaMs, options.rotationTimeConstantMs);
  const mix = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

  return {
    centerX: mix(previous.centerX, current.centerX, positionAlpha),
    centerY: mix(previous.centerY, current.centerY, positionAlpha),
    width: mix(previous.width, current.width, scaleAlpha),
    height: mix(previous.height, current.height, scaleAlpha),
    rotationRadians: previous.rotationRadians
      + shortestAngleDelta(previous.rotationRadians, current.rotationRadians) * rotationAlpha,
  };
}

export function createBagTrackingState(): BagTrackingState {
  return {
    transform: null,
    lastSeenAtMs: null,
    lastUpdatedAtMs: null,
  };
}

export function updateBagTracking(
  previous: BagTrackingState,
  detected: BagOverlayTransform | null,
  nowMs: number,
  gracePeriodMs = POSE_LOSS_GRACE_MS,
  smoothingOptions: BagSmoothingOptions = DEFAULT_BAG_SMOOTHING,
): BagTrackingUpdate {
  if (!detected) {
    const isWithinGracePeriod = previous.transform !== null
      && previous.lastSeenAtMs !== null
      && nowMs - previous.lastSeenAtMs <= gracePeriodMs;
    if (isWithinGracePeriod) {
      return {
        state: previous,
        transform: previous.transform,
        hasFreshPose: false,
        isWithinGracePeriod: true,
      };
    }
    const state = createBagTrackingState();
    return { state, transform: null, hasFreshPose: false, isWithinGracePeriod: false };
  }

  const deltaMs = previous.lastUpdatedAtMs === null
    ? 1000 / 30
    : Math.max(1, nowMs - previous.lastUpdatedAtMs);
  const transform = smoothBagOverlay(previous.transform, detected, deltaMs, smoothingOptions);
  const state = {
    transform,
    lastSeenAtMs: nowMs,
    lastUpdatedAtMs: nowMs,
  };
  return { state, transform, hasFreshPose: true, isWithinGracePeriod: false };
}
