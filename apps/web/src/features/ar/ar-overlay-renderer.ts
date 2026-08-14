import type { BagOverlayTransform } from "./bag-pose";

export type ArOverlayLayer = {
  image: HTMLImageElement | null;
  transform: BagOverlayTransform | null;
  visible: boolean;
};

export function drawArOverlayLayers(
  canvas: HTMLCanvasElement,
  layers: readonly ArOverlayLayer[],
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const layer of layers) {
    if (!layer.visible || !layer.image || !layer.transform) continue;
    context.save();
    context.translate(layer.transform.centerX, layer.transform.centerY);
    context.rotate(layer.transform.rotationRadians);
    context.drawImage(
      layer.image,
      -layer.transform.width / 2,
      -layer.transform.height / 2,
      layer.transform.width,
      layer.transform.height,
    );
    context.restore();
  }
}
