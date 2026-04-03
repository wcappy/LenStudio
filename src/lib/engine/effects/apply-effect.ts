import type { EffectType, EffectParams, NormalizedFrame } from '../../types/index.js';
import { processFlip } from './flip.js';
import { processAnimation } from './animation.js';
import { processDepth3d } from './depth3d.js';
import { processZoom } from './zoom.js';
import { processMorph } from './morph.js';

/**
 * Apply the selected effect to normalized frames, returning
 * processed ImageData[] ready for interlacing.
 */
export function applyEffect(
  frames: NormalizedFrame[],
  effectType: EffectType,
  effectParams: EffectParams | undefined,
): ImageData[] {
  const sorted = [...frames].sort((a, b) => a.order - b.order);
  const imageDataList = sorted.map(f => f.imageData);

  if (imageDataList.length === 0) return [];

  switch (effectType) {
    case 'none':
      // Static image — just use the first frame
      return [imageDataList[0]];

    case 'flip':
      return processFlip(imageDataList);

    case 'animation':
      return processAnimation(imageDataList);

    case 'zoom': {
      const p = effectParams?.type === 'zoom' ? effectParams : undefined;
      const numFrames = Math.max(imageDataList.length, 6);
      return processZoom(
        imageDataList[0],
        numFrames,
        p?.zoomFactor ?? 2,
        p?.centerX ?? 0.5,
        p?.centerY ?? 0.5,
      );
    }

    case 'depth3d': {
      const p = effectParams?.type === 'depth3d' ? effectParams : undefined;
      if (imageDataList.length < 2) return imageDataList;
      return processDepth3d(
        imageDataList[0],
        imageDataList[1],
        Math.max(imageDataList.length, 6),
        p?.maxDisplacement ?? 15,
      );
    }

    case 'morph': {
      if (imageDataList.length < 2) return imageDataList;
      const numFrames = Math.max(imageDataList.length, 8);
      return processMorph(imageDataList[0], imageDataList[1], numFrames);
    }

    default:
      return imageDataList;
  }
}
