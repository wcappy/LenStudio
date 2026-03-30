import type { EffectType } from './settings.js';
import type { ImageFrame } from './image.js';

export interface LayoutPreset {
  id: string;
  label: string;
  cols: number;
  rows: number;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: 'full',     label: 'Full',       cols: 1, rows: 1 },
  { id: 'split-h',  label: 'Split H',    cols: 2, rows: 1 },
  { id: 'split-v',  label: 'Split V',    cols: 1, rows: 2 },
  { id: '2x2',      label: 'Quarters',   cols: 2, rows: 2 },
  { id: 'thirds-h', label: 'Thirds H',   cols: 3, rows: 1 },
  { id: 'thirds-v', label: 'Thirds V',   cols: 1, rows: 3 },
  { id: '2x3',      label: '2 × 3',      cols: 2, rows: 3 },
  { id: '3x2',      label: '3 × 2',      cols: 3, rows: 2 },
  { id: '3x3',      label: '3 × 3',      cols: 3, rows: 3 },
];

export interface LayoutSection {
  id: string;
  row: number;
  col: number;
  effectType: EffectType;
  frames: ImageFrame[];
}
