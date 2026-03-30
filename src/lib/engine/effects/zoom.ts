/**
 * Zoom effect.
 * Generates N intermediate frames by progressively cropping and scaling
 * between a wide view and a zoomed-in view.
 */
export function processZoom(
  source: ImageData,
  numFrames: number,
  zoomFactor: number,
  centerX: number = 0.5,
  centerY: number = 0.5
): ImageData[] {
  const { width, height } = source;
  const frames: ImageData[] = [];

  // Create a temporary canvas for resampling
  const srcCanvas = new OffscreenCanvas(width, height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(source, 0, 0);

  for (let i = 0; i < numFrames; i++) {
    const t = numFrames > 1 ? i / (numFrames - 1) : 0;
    // Interpolate zoom from 1x to zoomFactor
    const currentZoom = 1 + t * (zoomFactor - 1);

    const cropW = width / currentZoom;
    const cropH = height / currentZoom;
    const cropX = (width - cropW) * centerX;
    const cropY = (height - cropH) * centerY;

    const outCanvas = new OffscreenCanvas(width, height);
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, width, height);

    frames.push(outCtx.getImageData(0, 0, width, height));
  }

  return frames;
}
