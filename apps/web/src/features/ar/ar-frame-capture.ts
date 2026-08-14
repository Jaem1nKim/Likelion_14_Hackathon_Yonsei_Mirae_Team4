export type CoverRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function calculateCoverRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverRect | null {
  if (
    sourceWidth <= 0
    || sourceHeight <= 0
    || targetWidth <= 0
    || targetHeight <= 0
  ) return null;

  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

export function drawArCaptureFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  overlay: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
) {
  const videoRect = calculateCoverRect(
    video.videoWidth,
    video.videoHeight,
    targetWidth,
    targetHeight,
  );
  if (!videoRect) throw new Error("AR_CAPTURE_FRAME_UNAVAILABLE");

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.save();
  context.translate(targetWidth, 0);
  context.scale(-1, 1);
  context.drawImage(
    video,
    videoRect.x,
    videoRect.y,
    videoRect.width,
    videoRect.height,
  );
  context.restore();
  context.drawImage(overlay, 0, 0, targetWidth, targetHeight);
}

export async function captureArFrame(
  video: HTMLVideoElement,
  overlay: HTMLCanvasElement,
) {
  if (overlay.width <= 0 || overlay.height <= 0) {
    throw new Error("AR_CAPTURE_FRAME_UNAVAILABLE");
  }

  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = overlay.width;
  captureCanvas.height = overlay.height;
  const context = captureCanvas.getContext("2d");
  if (!context) throw new Error("AR_CAPTURE_CANVAS_UNAVAILABLE");

  drawArCaptureFrame(
    context,
    video,
    overlay,
    captureCanvas.width,
    captureCanvas.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    captureCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("AR_CAPTURE_ENCODING_FAILED"));
    }, "image/png");
  });
}
