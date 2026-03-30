import { subStripWidths } from '../utils/math-helpers.js';

/**
 * Core interlacing algorithm.
 *
 * For each lenticule (lens) across the output width:
 *   - The lenticule spans `stripWidth` pixels (= DPI / LPI)
 *   - Divide into N sub-strips (one per source frame)
 *   - Copy vertical pixel columns from each source frame
 *     into the output at the correct position
 */
export function interlaceFrames(
  frames: ImageData[],
  lpi: number,
  dpi: number,
  onProgress?: (percent: number) => void
): ImageData {
  const N = frames.length;
  if (N === 0) throw new Error('No frames to interlace');

  const strip = Math.round(dpi / lpi);
  const { width: W, height: H } = frames[0];
  const numLens = Math.floor(W / strip);
  const outputWidth = numLens * strip;

  const output = new ImageData(outputWidth, H);
  const outData = output.data;

  const widths = subStripWidths(strip, N);

  for (let lens = 0; lens < numLens; lens++) {
    const lensStartX = lens * strip;
    let subX = 0;

    for (let f = 0; f < N; f++) {
      const subWidth = widths[f];
      const srcData = frames[f].data;

      for (let col = 0; col < subWidth; col++) {
        const srcX = lensStartX + subX + col;
        if (srcX >= W) break;
        const dstX = lensStartX + subX + col;

        for (let y = 0; y < H; y++) {
          const srcIdx = (y * W + srcX) * 4;
          const dstIdx = (y * outputWidth + dstX) * 4;
          outData[dstIdx] = srcData[srcIdx];
          outData[dstIdx + 1] = srcData[srcIdx + 1];
          outData[dstIdx + 2] = srcData[srcIdx + 2];
          outData[dstIdx + 3] = srcData[srcIdx + 3];
        }
      }
      subX += subWidth;
    }

    if (onProgress && lens % 100 === 0) {
      onProgress(Math.round((lens / numLens) * 100));
    }
  }

  return output;
}
