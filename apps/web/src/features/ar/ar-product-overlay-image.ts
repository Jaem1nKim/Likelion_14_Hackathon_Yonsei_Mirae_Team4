const COLLECTION_ASSET_PREFIX = "/assets/products/mcm-collection/";
const BACKGROUND_START = 224;
const BACKGROUND_END = 250;
const NEUTRAL_CHANNEL_TOLERANCE = 22;

export type PixelBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function isCollectionProductAssetPath(path: string) {
  return path.startsWith(COLLECTION_ASSET_PREFIX);
}

export function removeNeutralBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): PixelBounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const alpha = pixels[index + 3] ?? 0;
      const minimum = Math.min(red, green, blue);
      const maximum = Math.max(red, green, blue);
      const isNeutral = maximum - minimum <= NEUTRAL_CHANNEL_TOLERANCE;

      if (isNeutral && minimum >= BACKGROUND_START) {
        const retainedAlpha = minimum >= BACKGROUND_END
          ? 0
          : Math.round(alpha * (BACKGROUND_END - minimum) / (BACKGROUND_END - BACKGROUND_START));
        pixels[index + 3] = retainedAlpha;
      }

      if ((pixels[index + 3] ?? 0) > 20) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return right >= left && bottom >= top ? { left, top, right, bottom } : null;
}

function loadDataImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("AR_ASSET_PROCESSING_FAILED")), {
      once: true,
    });
    image.src = source;
  });
}

export async function prepareCollectionProductOverlay(
  image: HTMLImageElement,
): Promise<HTMLImageElement> {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return image;

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return image;
  sourceContext.drawImage(image, 0, 0);

  const imageData = sourceContext.getImageData(0, 0, width, height);
  const bounds = removeNeutralBackground(imageData.data, width, height);
  if (!bounds) return image;
  sourceContext.putImageData(imageData, 0, 0);

  const contentWidth = bounds.right - bounds.left + 1;
  const contentHeight = bounds.bottom - bounds.top + 1;
  const padding = Math.max(2, Math.round(Math.max(contentWidth, contentHeight) * 0.025));
  const sourceX = Math.max(0, bounds.left - padding);
  const sourceY = Math.max(0, bounds.top - padding);
  const croppedWidth = Math.min(width - sourceX, contentWidth + padding * 2);
  const croppedHeight = Math.min(height - sourceY, contentHeight + padding * 2);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = croppedWidth;
  outputCanvas.height = croppedHeight;
  outputCanvas.getContext("2d")?.drawImage(
    sourceCanvas,
    sourceX,
    sourceY,
    croppedWidth,
    croppedHeight,
    0,
    0,
    croppedWidth,
    croppedHeight,
  );

  return loadDataImage(outputCanvas.toDataURL("image/webp", 0.92));
}

export function imageAspectRatio(image: HTMLImageElement | null, fallback: number) {
  return image && image.naturalWidth > 0 && image.naturalHeight > 0
    ? image.naturalWidth / image.naturalHeight
    : fallback;
}
