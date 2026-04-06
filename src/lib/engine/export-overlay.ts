import { subStripWidths } from '../utils/math-helpers.js';

/**
 * Generate a scanimation stripe overlay image.
 *
 * The overlay has opaque black bars that block all frames except one,
 * and transparent slits that reveal the active frame's sub-strip.
 * When the overlay is slid across the interlaced image, it creates animation.
 */
export function generateOverlay(
  width: number,
  height: number,
  lpi: number,
  dpi: number,
  frameCount: number
): ImageData {
  const strip = Math.round(dpi / lpi);
  const numLens = Math.floor(width / strip);
  const outputWidth = numLens * strip;
  const widths = subStripWidths(strip, frameCount);

  // The slit width = width of one sub-strip (first frame's strip)
  const slitWidth = widths[0];

  const output = new ImageData(outputWidth, height);
  const data = output.data;

  for (let lens = 0; lens < numLens; lens++) {
    const lensStartX = lens * strip;

    for (let x = 0; x < strip; x++) {
      const px = lensStartX + x;
      if (px >= outputWidth) break;

      // First sub-strip = transparent slit, rest = opaque black
      const isTransparent = x < slitWidth;

      for (let y = 0; y < height; y++) {
        const idx = (y * outputWidth + px) * 4;
        if (isTransparent) {
          data[idx] = 255;     // white
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 0;   // transparent
        } else {
          data[idx] = 0;       // black
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255; // opaque
        }
      }
    }
  }

  return output;
}

/** Export overlay as PNG blob */
export async function exportOverlayPng(
  width: number,
  height: number,
  lpi: number,
  dpi: number,
  frameCount: number
): Promise<Blob> {
  const imageData = generateOverlay(width, height, lpi, dpi, frameCount);
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
