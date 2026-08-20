import type { CustomerJourneyResultView, JourneyAggregate } from "@mcm/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getJourney } from "../api/journey-api";
import { getJourneyResult } from "../api/result-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { getAccessoryArAsset } from "../features/ar/accessory-ar-assets";
import {
  calculateAccessoryOverlay,
  calculateBagAttachedAccessoryOverlay,
  createAccessoryTrackingState,
  shouldRenderAccessoryOverlay,
  updateAccessoryTracking,
  updateBagAttachedAccessoryTracking,
  type AccessoryTrackingState,
} from "../features/ar/accessory-pose";
import { getApparelArAsset } from "../features/ar/apparel-ar-assets";
import {
  calculateApparelOverlay,
  createApparelTrackingState,
  updateApparelTracking,
  type ApparelTrackingState,
} from "../features/ar/apparel-pose";
import { drawArOverlayLayers } from "../features/ar/ar-overlay-renderer";
import { captureArFrame } from "../features/ar/ar-frame-capture";
import { getBagArAsset } from "../features/ar/bag-ar-assets";
import {
  AR_COMPARISON_CATEGORIES,
  buildArComparisonOptions,
  createOriginalArSelection,
  isOriginalArSelection,
  resolveArPreviewProduct,
  type ArComparisonCategory,
  type ArPreviewSelection,
} from "../features/ar/ar-product-comparison";
import {
  browserArRuntime,
  type ArRuntime,
  type PoseDetector,
} from "../features/ar/ar-runtime";
import {
  calculateBagOverlay,
  calculateCanvasLayout,
  createBagTrackingState,
  updateBagTracking,
  type BagTrackingState,
} from "../features/ar/bag-pose";

type CameraState =
  | "idle"
  | "requesting"
  | "loading"
  | "detecting"
  | "tracking"
  | "no-person"
  | "permission-denied"
  | "camera-unavailable"
  | "mediapipe-error";

type AssetState = "loading" | "ready" | "missing";

type JourneyArPageProps = {
  runtime?: ArRuntime;
};

const CAMERA_STATUS: Record<CameraState, string> = {
  idle: "카메라를 시작해 주세요.",
  requesting: "카메라 권한이 필요합니다. 브라우저 안내에서 허용해 주세요.",
  loading: "카메라 준비 중",
  detecting: "사람을 화면 중앙에 맞춰주세요.",
  tracking: "AR 적용 중",
  "no-person": "사람을 화면 중앙에 맞춰주세요.",
  "permission-denied": "카메라 권한이 필요합니다. 브라우저 설정에서 권한을 허용해 주세요.",
  "camera-unavailable": "사용 가능한 카메라를 찾을 수 없습니다.",
  "mediapipe-error": "자세 인식을 초기화하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.",
};

function classifyCameraError(error: unknown): CameraState {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission-denied";
  if (
    name === "NotFoundError"
    || name === "NotReadableError"
    || name === "OverconstrainedError"
    || (error instanceof Error && error.message === "CAMERA_API_UNAVAILABLE")
  ) {
    return "camera-unavailable";
  }
  return "camera-unavailable";
}

export function JourneyArPage({ runtime = browserArRuntime }: JourneyArPageProps = {}) {
  const { journeyId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<CustomerJourneyResultView | null>(null);
  const [aggregate, setAggregate] = useState<JourneyAggregate | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [bagAssetState, setBagAssetState] = useState<AssetState>("loading");
  const [apparelAssetState, setApparelAssetState] = useState<AssetState>("loading");
  const [accessoryAssetState, setAccessoryAssetState] = useState<AssetState>("loading");
  const [isBagVisible, setIsBagVisible] = useState(true);
  const [isApparelVisible, setIsApparelVisible] = useState(true);
  const [isAccessoryVisible, setIsAccessoryVisible] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ArComparisonCategory>("BAG");
  const [previewSelection, setPreviewSelection] = useState<ArPreviewSelection>({
    BAG: null,
    APPAREL: null,
    ACCESSORY: null,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isCaptureReady, setIsCaptureReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const frameRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const bagTrackingRef = useRef<BagTrackingState>(createBagTrackingState());
  const apparelTrackingRef = useRef<ApparelTrackingState>(createApparelTrackingState());
  const accessoryTrackingRef = useRef<AccessoryTrackingState>(createAccessoryTrackingState());
  const lastDetectionAtRef = useRef(-Infinity);
  const bagAssetImageRef = useRef<HTMLImageElement | null>(null);
  const apparelAssetImageRef = useRef<HTMLImageElement | null>(null);
  const accessoryAssetImageRef = useRef<HTMLImageElement | null>(null);
  const bagVisibleRef = useRef(true);
  const apparelVisibleRef = useRef(true);
  const accessoryVisibleRef = useRef(true);
  const statusRef = useRef<CameraState>("idle");
  const capturePreviewUrlRef = useRef<string | null>(null);
  const captureReadyRef = useRef(false);

  const originalSelection = useMemo(
    () => result ? createOriginalArSelection(result) : null,
    [result],
  );
  const comparisonOptions = useMemo(
    () => aggregate && result ? buildArComparisonOptions(aggregate, result) : null,
    [aggregate, result],
  );
  const bagProduct = useMemo(
    () => comparisonOptions
      ? resolveArPreviewProduct(comparisonOptions, previewSelection, "BAG")
      : null,
    [comparisonOptions, previewSelection],
  );
  const bagAsset = useMemo(
    () => bagProduct ? getBagArAsset(bagProduct) : null,
    [bagProduct],
  );
  const apparelProduct = useMemo(
    () => comparisonOptions
      ? resolveArPreviewProduct(comparisonOptions, previewSelection, "APPAREL")
      : null,
    [comparisonOptions, previewSelection],
  );
  const apparelAsset = useMemo(
    () => apparelProduct ? getApparelArAsset(apparelProduct) : null,
    [apparelProduct],
  );
  const accessoryProduct = useMemo(
    () => comparisonOptions
      ? resolveArPreviewProduct(comparisonOptions, previewSelection, "ACCESSORY")
      : null,
    [comparisonOptions, previewSelection],
  );
  const accessoryAsset = useMemo(
    () => accessoryProduct ? getAccessoryArAsset(accessoryProduct) : null,
    [accessoryProduct],
  );
  const isOriginalPreview = originalSelection
    ? isOriginalArSelection(previewSelection, originalSelection)
    : true;

  const publishCameraState = useCallback((next: CameraState) => {
    if (statusRef.current !== next) {
      statusRef.current = next;
      setCameraState(next);
    }
  }, []);

  const paintOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawArOverlayLayers(canvas, [
      {
        image: apparelAssetImageRef.current,
        transform: apparelTrackingRef.current.transform,
        visible: apparelVisibleRef.current,
      },
      {
        image: bagAssetImageRef.current,
        transform: bagTrackingRef.current.transform,
        visible: bagVisibleRef.current,
      },
      {
        image: accessoryAssetImageRef.current,
        transform: accessoryTrackingRef.current.transform,
        visible: shouldRenderAccessoryOverlay(
          accessoryAsset?.anchor ?? null,
          accessoryVisibleRef.current,
          bagVisibleRef.current,
          bagAssetImageRef.current !== null,
          bagTrackingRef.current.transform,
        ),
      },
    ]);
  }, [accessoryAsset?.anchor]);

  const stopResources = useCallback(() => {
    if (frameRef.current !== null) {
      runtime.cancelFrame(frameRef.current);
      frameRef.current = null;
    }
    detectorRef.current?.close();
    detectorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    bagTrackingRef.current = createBagTrackingState();
    apparelTrackingRef.current = createApparelTrackingState();
    accessoryTrackingRef.current = createAccessoryTrackingState();
    captureReadyRef.current = false;
    lastVideoTimeRef.current = -1;
    lastDetectionAtRef.current = -Infinity;
  }, [runtime]);

  useEffect(() => {
    if (!journeyId) {
      setResultError("Journey 정보를 확인할 수 없습니다.");
      return;
    }
    const controller = new AbortController();
    setResult(null);
    setAggregate(null);
    setResultError(null);
    void Promise.all([
      getJourneyResult(journeyId, controller.signal),
      getJourney(journeyId, controller.signal),
    ])
      .then(([nextResult, nextAggregate]) => {
        setResult(nextResult);
        setAggregate(nextAggregate);
        setPreviewSelection(createOriginalArSelection(nextResult));
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setResultError(errorMessage(caught));
        }
      });
    return () => controller.abort();
  }, [attempt, journeyId]);

  useEffect(() => {
    let active = true;
    bagAssetImageRef.current = null;
    if (!bagAsset) {
      setBagAssetState("missing");
      return;
    }
    setBagAssetState("loading");
    void runtime.loadImage(bagAsset.path)
      .then((image) => {
        if (!active) return;
        bagAssetImageRef.current = image;
        setBagAssetState("ready");
      })
      .catch(() => {
        if (active) setBagAssetState("missing");
      });
    return () => {
      active = false;
    };
  }, [bagAsset, runtime]);

  useEffect(() => {
    let active = true;
    apparelAssetImageRef.current = null;
    if (!apparelAsset) {
      setApparelAssetState("missing");
      return;
    }
    setApparelAssetState("loading");
    void runtime.loadImage(apparelAsset.path)
      .then((image) => {
        if (!active) return;
        apparelAssetImageRef.current = image;
        setApparelAssetState("ready");
      })
      .catch(() => {
        if (active) setApparelAssetState("missing");
      });
    return () => {
      active = false;
    };
  }, [apparelAsset, runtime]);

  useEffect(() => {
    let active = true;
    accessoryAssetImageRef.current = null;
    if (!accessoryAsset) {
      setAccessoryAssetState("missing");
      return;
    }
    setAccessoryAssetState("loading");
    void runtime.loadImage(accessoryAsset.path)
      .then((image) => {
        if (!active) return;
        accessoryAssetImageRef.current = image;
        setAccessoryAssetState("ready");
      })
      .catch(() => {
        if (active) setAccessoryAssetState("missing");
      });
    return () => {
      active = false;
    };
  }, [accessoryAsset, runtime]);

  useEffect(() => () => {
    sessionRef.current += 1;
    stopResources();
    if (capturePreviewUrlRef.current) {
      URL.revokeObjectURL(capturePreviewUrlRef.current);
      capturePreviewUrlRef.current = null;
    }
  }, [stopResources]);

  useEffect(() => {
    bagVisibleRef.current = isBagVisible;
    paintOverlays();
  }, [isBagVisible, paintOverlays]);

  useEffect(() => {
    apparelVisibleRef.current = isApparelVisible;
    paintOverlays();
  }, [isApparelVisible, paintOverlays]);

  useEffect(() => {
    accessoryVisibleRef.current = isAccessoryVisible;
    paintOverlays();
  }, [isAccessoryVisible, paintOverlays]);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;
    if (!video || !canvas || !detector || (!bagAsset && !apparelAsset && !accessoryAsset)) return;

    const nowMs = runtime.now();
    const canDetect = nowMs - lastDetectionAtRef.current >= 1000 / 30;
    if (
      canDetect
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && video.currentTime !== lastVideoTimeRef.current
    ) {
      lastDetectionAtRef.current = nowMs;
      lastVideoTimeRef.current = video.currentTime;
      const bounds = canvas.getBoundingClientRect();
      const viewport = {
        sourceWidth: video.videoWidth || 1280,
        sourceHeight: video.videoHeight || 720,
        displayWidth: Math.max(1, bounds.width),
        displayHeight: Math.max(1, bounds.height),
        devicePixelRatio: window.devicePixelRatio || 1,
      };
      const layout = calculateCanvasLayout(viewport);
      if (layout && (canvas.width !== layout.canvasWidth || canvas.height !== layout.canvasHeight)) {
        canvas.width = layout.canvasWidth;
        canvas.height = layout.canvasHeight;
      }

      const detection = detector.detectForVideo(video, nowMs);
      const landmarks = detection.landmarks[0];
      const bagTransform = bagAsset
        ? calculateBagOverlay(landmarks, viewport, bagAsset, true)
        : null;
      const apparelTransform = apparelAsset
        ? calculateApparelOverlay(landmarks, viewport, apparelAsset, true)
        : null;
      const poseAccessoryTransform = accessoryAsset
        ? calculateAccessoryOverlay(landmarks, viewport, accessoryAsset, true)
        : null;
      const bagTracking = updateBagTracking(bagTrackingRef.current, bagTransform, nowMs);
      const apparelTracking = updateApparelTracking(
        apparelTrackingRef.current,
        apparelTransform,
        nowMs,
      );
      const isBagAttachedAccessory = accessoryAsset?.anchor === "BAG_ATTACHED";
      const accessoryTransform = isBagAttachedAccessory && accessoryAsset && bagTracking.hasFreshPose
        ? calculateBagAttachedAccessoryOverlay(bagTracking.transform, accessoryAsset)
        : poseAccessoryTransform;
      const accessoryTracking = isBagAttachedAccessory
        ? updateBagAttachedAccessoryTracking(
          accessoryTrackingRef.current,
          accessoryTransform,
          nowMs,
        )
        : updateAccessoryTracking(
          accessoryTrackingRef.current,
          accessoryTransform,
          nowMs,
        );
      bagTrackingRef.current = bagTracking.state;
      apparelTrackingRef.current = apparelTracking.state;
      accessoryTrackingRef.current = accessoryTracking.state;
      paintOverlays();
      if (!captureReadyRef.current) {
        captureReadyRef.current = true;
        setIsCaptureReady(true);
      }

      if (!bagTracking.transform && !apparelTracking.transform && !accessoryTracking.transform) {
        publishCameraState("no-person");
      } else {
        publishCameraState("tracking");
      }
    }
    frameRef.current = runtime.requestFrame(renderFrame);
  }, [accessoryAsset, apparelAsset, bagAsset, paintOverlays, publishCameraState, runtime]);

  function resetTracking(category: ArComparisonCategory) {
    captureReadyRef.current = false;
    setIsCaptureReady(false);
    if (category === "BAG") {
      bagTrackingRef.current = createBagTrackingState();
      bagAssetImageRef.current = null;
    } else if (category === "APPAREL") {
      apparelTrackingRef.current = createApparelTrackingState();
      apparelAssetImageRef.current = null;
    } else {
      accessoryTrackingRef.current = createAccessoryTrackingState();
      accessoryAssetImageRef.current = null;
    }
  }

  function previewProduct(category: ArComparisonCategory, productId: string) {
    resetTracking(category);
    setPreviewSelection((current) => ({ ...current, [category]: productId }));
  }

  function restoreOriginalSelection() {
    if (!originalSelection) return;
    for (const category of AR_COMPARISON_CATEGORIES) resetTracking(category);
    setPreviewSelection(originalSelection);
  }

  function clearCapturedPhoto() {
    if (capturePreviewUrlRef.current) {
      URL.revokeObjectURL(capturePreviewUrlRef.current);
      capturePreviewUrlRef.current = null;
    }
    setCapturePreviewUrl(null);
    setCaptureError(null);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay || isCapturing) return;

    setIsCapturing(true);
    setCaptureError(null);
    try {
      const blob = await captureArFrame(video, overlay);
      if (capturePreviewUrlRef.current) URL.revokeObjectURL(capturePreviewUrlRef.current);
      const nextUrl = URL.createObjectURL(blob);
      capturePreviewUrlRef.current = nextUrl;
      setCapturePreviewUrl(nextUrl);
    } catch {
      setCaptureError("촬영 이미지를 만들지 못했습니다. 카메라가 준비된 후 다시 시도해 주세요.");
    } finally {
      setIsCapturing(false);
    }
  }

  async function startCamera() {
    if (
      !bagProduct
      || (!bagAsset && !apparelAsset && !accessoryAsset)
      || cameraState === "requesting"
      || cameraState === "loading"
    ) return;
    stopResources();
    setIsCaptureReady(false);
    const session = ++sessionRef.current;
    publishCameraState("requesting");
    let stream: MediaStream;
    try {
      stream = await runtime.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (caught) {
      if (session === sessionRef.current) publishCameraState(classifyCameraError(caught));
      return;
    }

    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    publishCameraState("loading");

    try {
      if (!videoRef.current) throw new Error("CAMERA_VIDEO_UNAVAILABLE");
      await runtime.prepareVideo(videoRef.current, stream);
    } catch (caught) {
      stopResources();
      if (session === sessionRef.current) publishCameraState(classifyCameraError(caught));
      return;
    }

    try {
      const detector = await runtime.createPoseDetector();
      if (session !== sessionRef.current) {
        detector.close();
        return;
      }
      detectorRef.current = detector;
      publishCameraState("detecting");
      frameRef.current = runtime.requestFrame(renderFrame);
    } catch {
      stopResources();
      if (session === sessionRef.current) publishCameraState("mediapipe-error");
    }
  }

  function exitAr() {
    sessionRef.current += 1;
    stopResources();
    navigate(journeyId ? `/journey/${encodeURIComponent(journeyId)}/result` : "/profile");
  }

  if (resultError) {
    return <AppLayout><ErrorState message={resultError} onRetry={() => setAttempt((value) => value + 1)} /></AppLayout>;
  }
  if (!result || !aggregate || !comparisonOptions) {
    return <AppLayout><LoadingState message="AR 가상 피팅을 준비하고 있어요." /></AppLayout>;
  }
  if (!bagProduct) {
    return (
      <AppLayout>
        <ErrorState message="최종 선택 결과에서 BAG을 찾을 수 없습니다." />
        <button className="button button-secondary" type="button" onClick={exitAr}>결과로 돌아가기</button>
      </AppLayout>
    );
  }

  const canStart = cameraState === "idle"
    || cameraState === "permission-denied"
    || cameraState === "camera-unavailable"
    || cameraState === "mediapipe-error";
  const canCapture = cameraState === "detecting"
    || cameraState === "tracking"
    || cameraState === "no-person";

  return (
    <div className="ar-experience-page">
      <main className="ar-experience" aria-labelledby="ar-title">
        <header className="ar-experience-header">
          <div>
            <p className="ar-experience-eyebrow">MCM JOURNEY · VIRTUAL FITTING</p>
            <h1 id="ar-title">BAG · APPAREL · ACCESSORY 가상 피팅</h1>
            <p className="ar-experience-lead">Journey가 완성한 Look을 움직이며 확인해보세요.</p>
          </div>
          <button className="ar-exit-button" type="button" onClick={exitAr}>
            <span aria-hidden="true">←</span> AR 종료
          </button>
        </header>

        <div className="ar-experience-layout">
          <div className="ar-stage-column">
            <section
              className={`ar-camera-shell${canStart ? "" : " is-camera-active"}`}
              aria-label="실시간 BAG, APPAREL, ACCESSORY 가상 피팅 화면"
            >
              <video ref={videoRef} className="ar-video" muted playsInline aria-label="전면 카메라 영상" />
              <canvas ref={canvasRef} className="ar-overlay" aria-hidden="true" />
              {canStart && (
                <div className="ar-camera-placeholder">
                  <div className="ar-idle-copy">
                    <span>VIRTUAL FITTING EXPERIENCE</span>
                    <strong>YOUR LOOK,<br />IN MOTION.</strong>
                    <small>카메라를 시작해 착용 위치를 확인해보세요.</small>
                  </div>
                </div>
              )}
              <span className="ar-frame-corner ar-frame-corner-top" aria-hidden="true" />
              <span className="ar-frame-corner ar-frame-corner-bottom" aria-hidden="true" />
              <div className={`ar-detection-status ar-status-${cameraState}`} role="status" aria-live="polite">
                {CAMERA_STATUS[cameraState]}
              </div>
              <div className="ar-stage-controls">
                {canStart && (
                  <button
                    className="ar-primary-action"
                    type="button"
                    disabled={!bagAsset && !apparelAsset && !accessoryAsset}
                    onClick={() => void startCamera()}
                  >
                    카메라 시작 <span aria-hidden="true">→</span>
                  </button>
                )}
                {!canStart && (
                  <button
                    className="ar-primary-action"
                    type="button"
                    disabled={!canCapture || !isCaptureReady || isCapturing}
                    onClick={() => void capturePhoto()}
                  >
                    {isCapturing ? "촬영 이미지 준비 중" : "촬영"}
                  </button>
                )}
              </div>
            </section>

            <div className="ar-stage-messages">
              {bagAssetState === "missing" && (
                <div className="ar-asset-warning" role="alert">
                  <strong>BAG AR asset이 준비되지 않았습니다.</strong>
                  <span>{bagAsset?.path ?? "이 제품에 연결된 AR asset 경로가 없습니다."}</span>
                </div>
              )}
              {bagAssetState === "loading" && bagAsset && <p className="ar-asset-loading" role="status">BAG overlay를 준비하고 있어요.</p>}
              {apparelAssetState === "missing" && (
                <div className="ar-asset-warning" role="alert">
                  <strong>APPAREL AR asset이 준비되지 않았습니다.</strong>
                  <span>{apparelAsset?.path ?? "이 제품에 연결된 AR asset 경로가 없습니다."}</span>
                </div>
              )}
              {apparelAssetState === "loading" && apparelAsset && <p className="ar-asset-loading" role="status">APPAREL overlay를 준비하고 있어요.</p>}
              {accessoryAssetState === "missing" && (
                <div className="ar-asset-warning" role="alert">
                  <strong>ACCESSORY AR 이미지가 준비되지 않았습니다.</strong>
                  <span>{accessoryAsset?.path ?? "이 제품에 연결된 AR asset 경로가 없습니다."}</span>
                </div>
              )}
              {accessoryAssetState === "loading" && accessoryAsset && <p className="ar-asset-loading" role="status">ACCESSORY overlay를 준비하고 있어요.</p>}
              {captureError && <p className="ar-capture-error" role="alert">{captureError}</p>}
            </div>

            <p className="ar-privacy-note">카메라 영상과 자세 정보는 브라우저 안에서만 처리하며 저장하지 않습니다.</p>
          </div>

          <aside className="ar-look-rail" aria-label="가상 피팅 상품과 비교 옵션">
            <section className="ar-current-look" aria-labelledby="ar-current-look-title">
              <div className="ar-section-heading">
                <p className="ar-experience-eyebrow">CURRENT LOOK</p>
                <h2 id="ar-current-look-title">지금 착용 중인 Journey</h2>
              </div>
              <ul className="ar-product-list" aria-label="현재 착용 제품">
                <li className={!isBagVisible ? "is-hidden" : ""}>
                  <span className="ar-current-media"><img src={bagProduct.imageUrl} alt="" /></span>
                  <span className="ar-current-copy"><strong>BAG</strong><span>{bagProduct.name}</span></span>
                  <button type="button" disabled={bagAssetState !== "ready"} aria-pressed={isBagVisible} onClick={() => setIsBagVisible((visible) => !visible)}>
                    {isBagVisible ? "가방 숨기기" : "가방 표시하기"}
                  </button>
                </li>
                <li className={!isApparelVisible ? "is-hidden" : ""}>
                  <span className="ar-current-media">{apparelProduct && <img src={apparelProduct.imageUrl} alt="" />}</span>
                  <span className="ar-current-copy"><strong>APPAREL</strong><span>{apparelProduct?.name ?? "선택된 APPAREL 없음"}</span></span>
                  <button type="button" disabled={apparelAssetState !== "ready"} aria-pressed={isApparelVisible} onClick={() => setIsApparelVisible((visible) => !visible)}>
                    {isApparelVisible ? "APPAREL 숨기기" : "APPAREL 표시하기"}
                  </button>
                </li>
                <li className={!isAccessoryVisible ? "is-hidden" : ""}>
                  <span className="ar-current-media">{accessoryProduct && <img src={accessoryProduct.imageUrl} alt="" />}</span>
                  <span className="ar-current-copy"><strong>ACCESSORY</strong><span>{accessoryProduct?.name ?? "선택된 ACCESSORY 없음"}</span></span>
                  <button type="button" disabled={accessoryAssetState !== "ready"} aria-pressed={isAccessoryVisible} onClick={() => setIsAccessoryVisible((visible) => !visible)}>
                    {isAccessoryVisible ? "ACCESSORY 숨기기" : "ACCESSORY 표시하기"}
                  </button>
                </li>
              </ul>
            </section>

            <section className="ar-comparison" aria-labelledby="ar-comparison-title">
              <div className="ar-comparison-header">
                <div>
                  <p className="ar-experience-eyebrow">COMPARE THE LOOK</p>
                  <h2 id="ar-comparison-title">다른 제품도 착용해보세요</h2>
                  <p>미리보기만 바뀌며 Journey의 선택은 유지됩니다.</p>
                </div>
                <button type="button" disabled={isOriginalPreview} onClick={restoreOriginalSelection}>원래 추천으로 돌아가기</button>
              </div>

              <div className="ar-comparison-tabs" role="tablist" aria-label="AR 제품 카테고리">
                {AR_COMPARISON_CATEGORIES.map((category) => (
                  <button
                    id={`ar-tab-${category.toLowerCase()}`}
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === category}
                    aria-controls="ar-comparison-panel"
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div id="ar-comparison-panel" className="ar-comparison-grid" role="tabpanel" aria-labelledby={`ar-tab-${activeCategory.toLowerCase()}`}>
                {comparisonOptions[activeCategory].map((option) => {
                  const isActive = previewSelection[activeCategory] === option.product.id;
                  return (
                    <button
                      className={`ar-comparison-card${isActive ? " is-active" : ""}`}
                      key={option.product.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => previewProduct(activeCategory, option.product.id)}
                    >
                      <span className="ar-comparison-media"><img src={option.product.imageUrl} alt="" /></span>
                      <span className="ar-comparison-copy">
                        <span className="ar-comparison-badges">
                          {option.isAiPick && <strong>AI Pick</strong>}
                          {isActive && <em>현재 착용</em>}
                        </span>
                        <span>{option.product.name}</span>
                        <small>{option.product.color} · {option.product.material ?? "소재 정보 없음"}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        {capturePreviewUrl && (
          <section className="ar-capture-backdrop" role="dialog" aria-modal="true" aria-labelledby="ar-capture-title">
            <div className="ar-capture-preview">
              <div className="ar-capture-copy">
                <p className="ar-experience-eyebrow">AR CAPTURE</p>
                <h2 id="ar-capture-title">촬영 미리보기</h2>
                <p>현재 선택한 APPAREL, BAG, ACCESSORY가 함께 저장됩니다.</p>
              </div>
              <img src={capturePreviewUrl} alt="현재 AR 착용 화면 촬영 미리보기" />
              <div className="ar-capture-actions">
                <button type="button" onClick={clearCapturedPhoto}>다시 찍기</button>
                <a href={capturePreviewUrl} download="mcm-journey-ar.png">이미지 저장</a>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
