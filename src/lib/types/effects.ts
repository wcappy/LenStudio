import type { EffectType } from './settings.js';

export interface EffectConfig {
  type: EffectType;
  params: EffectParams;
}

export type EffectParams =
  | FlipParams
  | AnimationParams
  | Depth3dParams
  | ZoomParams
  | MorphParams;

export interface FlipParams {
  type: 'flip';
}

export interface AnimationParams {
  type: 'animation';
  fps: number;
}

export interface Depth3dParams {
  type: 'depth3d';
  maxDisplacement: number;
  depthMap: ImageData | null;
}

export interface ZoomParams {
  type: 'zoom';
  zoomFactor: number;
  centerX: number;
  centerY: number;
}

export interface MorphParams {
  type: 'morph';
  controlPoints: { srcX: number; srcY: number; dstX: number; dstY: number }[];
  gridSize: number;
}
