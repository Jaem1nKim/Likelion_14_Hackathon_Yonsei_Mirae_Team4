import type { PoseLandmark } from "./bag-pose";

export type PoseDetectionResult = {
  landmarks: PoseLandmark[][];
};

export type PoseDetector = {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): PoseDetectionResult;
  close(): void;
};

export type ArRuntime = {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  prepareVideo(video: HTMLVideoElement, stream: MediaStream): Promise<void>;
  createPoseDetector(): Promise<PoseDetector>;
  loadImage(path: string): Promise<HTMLImageElement>;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
  now(): number;
};

const MEDIAPIPE_VERSION = "1.0.1";
const VISION_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

async function prepareVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("CAMERA_METADATA_TIMEOUT"));
      }, 10_000);
      const cleanup = () => {
        window.clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("CAMERA_VIDEO_ERROR"));
      };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
  }
  await video.play();
}

async function createPoseDetector(): Promise<PoseDetector> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(VISION_WASM_ROOT);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
}

function loadImage(path: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("AR_ASSET_NOT_FOUND")), { once: true });
    image.src = path;
  });
}

export const browserArRuntime: ArRuntime = {
  getUserMedia: (constraints) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return Promise.reject(new Error("CAMERA_API_UNAVAILABLE"));
    }
    return navigator.mediaDevices.getUserMedia(constraints);
  },
  prepareVideo,
  createPoseDetector,
  loadImage,
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (handle) => window.cancelAnimationFrame(handle),
  now: () => performance.now(),
};
