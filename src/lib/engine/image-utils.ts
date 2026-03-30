import type { ImageFrame, NormalizedFrame } from '../types/index.js';

/**
 * Normalize all frames to the same dimensions by scaling to fit
 * the target output size while preserving aspect ratio (center-crop).
 */
export function normalizeFrames(
  frames: ImageFrame[],
  targetWidth: number,
  targetHeight: number
): NormalizedFrame[] {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d')!;

  return frames.map((frame) => {
    if (!frame.bitmap) {
      throw new Error(`Frame ${frame.id} has no bitmap`);
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Cover-fit: scale to fill, then center-crop
    const srcAspect = frame.bitmap.width / frame.bitmap.height;
    const dstAspect = targetWidth / targetHeight;

    let sx = 0, sy = 0, sw = frame.bitmap.width, sh = frame.bitmap.height;

    if (srcAspect > dstAspect) {
      // Source is wider: crop sides
      sw = frame.bitmap.height * dstAspect;
      sx = (frame.bitmap.width - sw) / 2;
    } else {
      // Source is taller: crop top/bottom
      sh = frame.bitmap.width / dstAspect;
      sy = (frame.bitmap.height - sh) / 2;
    }

    ctx.drawImage(frame.bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

    return {
      imageData: ctx.getImageData(0, 0, targetWidth, targetHeight),
      order: frame.order,
    };
  });
}
