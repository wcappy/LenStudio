import type { ImageFrame, ImageTransform, NormalizedFrame } from '../types/index.js';

/**
 * Normalize all frames to the same dimensions by scaling to fit
 * the target output size while preserving aspect ratio (center-crop).
 * Applies per-frame ImageTransform (scale, pan) if present.
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

    const { sx, sy, sw, sh } = computeSourceRect(
      frame.bitmap.width, frame.bitmap.height,
      targetWidth, targetHeight,
      frame.transform
    );

    const flipH = frame.transform?.flipH ?? false;
    const flipV = frame.transform?.flipV ?? false;
    const rotation = frame.transform?.rotation ?? 0;
    const hasFlipOrRotate = flipH || flipV || rotation !== 0;

    if (hasFlipOrRotate) {
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      if (rotation) ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.translate(-targetWidth / 2, -targetHeight / 2);
    }

    ctx.drawImage(frame.bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

    if (hasFlipOrRotate) {
      ctx.restore();
    }

    return {
      imageData: ctx.getImageData(0, 0, targetWidth, targetHeight),
      order: frame.order,
    };
  });
}

function computeSourceRect(
  bw: number, bh: number,
  cellW: number, cellH: number,
  transform?: ImageTransform
): { sx: number; sy: number; sw: number; sh: number } {
  const srcAspect = bw / bh;
  const dstAspect = cellW / cellH;

  let sw: number, sh: number;
  if (srcAspect > dstAspect) {
    sh = bh;
    sw = bh * dstAspect;
  } else {
    sw = bw;
    sh = bw / dstAspect;
  }

  const scale = transform?.scale ?? 1;
  sw /= scale;
  sh /= scale;

  let sx = (bw - sw) / 2;
  let sy = (bh - sh) / 2;

  const panX = transform?.panX ?? 0;
  const panY = transform?.panY ?? 0;
  sx += panX * (bw - sw) / 2;
  sy += panY * (bh - sh) / 2;

  sx = Math.max(0, Math.min(sx, bw - sw));
  sy = Math.max(0, Math.min(sy, bh - sh));
  sw = Math.min(sw, bw - sx);
  sh = Math.min(sh, bh - sy);

  return { sx, sy, sw, sh };
}
