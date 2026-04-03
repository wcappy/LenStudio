import type { EffectType } from './settings.js';
import type { ImageFrame } from './image.js';

// --- Layout tree types ---

export type SplitDirection = 'horizontal' | 'vertical';

/** A leaf node — one section that holds frames for a lenticular effect */
export interface LayoutLeaf {
  type: 'leaf';
  id: string;
  effectType: EffectType;
  frames: ImageFrame[];
}

/** A split node — divides space between two children */
export interface LayoutSplit {
  type: 'split';
  id: string;
  direction: SplitDirection; // 'vertical' = left|right, 'horizontal' = top|bottom
  ratio: number;            // 0-1, fraction of space given to first child
  children: [LayoutNode, LayoutNode];
}

export type LayoutNode = LayoutLeaf | LayoutSplit;

/** Rect describing a cell's position in pixels */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Describes a divider between two cells */
export interface DividerInfo {
  splitId: string;
  direction: SplitDirection;
  x: number;
  y: number;
  w: number;
  h: number;
}

// --- Backward compat ---

/** @deprecated Use LayoutLeaf instead */
export type LayoutSection = LayoutLeaf;

// --- Presets ---

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
