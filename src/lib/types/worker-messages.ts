import type { EffectType } from './settings.js';

export type WorkerRequest =
  | { type: 'interlace'; frames: ArrayBuffer[]; config: InterlaceConfig }
  | { type: 'cancel' };

export type WorkerResponse =
  | { type: 'progress'; percent: number }
  | { type: 'complete'; result: ArrayBuffer; width: number; height: number }
  | { type: 'error'; message: string };

export interface InterlaceConfig {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  lpi: number;
  dpi: number;
  effectType: EffectType;
  effectParams: Record<string, unknown>;
}
