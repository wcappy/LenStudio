export type LPI = 40 | 50 | 60 | 75 | 100;
export type DPI = 150 | 300 | 600;
export type EffectType = 'none' | 'flip' | 'animation' | 'depth3d' | 'zoom' | 'morph';
export type ExportFormat = 'png' | 'tiff';
export type ProjectType = 'lenticular' | 'scanimation' | 'parallax' | 'anaglyph';

export interface ProjectTypeInfo {
  id: ProjectType;
  label: string;
  description: string;
  needsInterlacing: boolean;
  needsLpi: boolean;
  maxFrames: number;
  minFrames: number;
  recommendedFrames?: string;
}

export const PROJECT_TYPES: ProjectTypeInfo[] = [
  {
    id: 'lenticular',
    label: 'Lenticular',
    description: 'Tilt effect with lenticular lens sheet',
    needsInterlacing: true,
    needsLpi: true,
    maxFrames: 12,
    minFrames: 2,
  },
  {
    id: 'scanimation',
    label: 'Scanimation',
    description: 'Slide a striped overlay to animate',
    needsInterlacing: true,
    needsLpi: true,
    maxFrames: 8,
    minFrames: 2,
    recommendedFrames: '4-8 frames for smooth animation',
  },
  {
    id: 'parallax',
    label: 'Parallax Barrier',
    description: 'Glasses-free 3D with slit mask',
    needsInterlacing: true,
    needsLpi: true,
    maxFrames: 4,
    minFrames: 2,
    recommendedFrames: '2 frames (stereo pair)',
  },
  {
    id: 'anaglyph',
    label: 'Anaglyph 3D',
    description: 'Red/cyan 3D — viewable with 3D glasses',
    needsInterlacing: false,
    needsLpi: false,
    maxFrames: 2,
    minFrames: 2,
  },
];

export const LPI_OPTIONS: LPI[] = [40, 50, 60, 75, 100];
export const DPI_OPTIONS: DPI[] = [150, 300, 600];

export interface LenticularSettings {
  lpi: LPI;
  dpi: DPI;
  effectType: EffectType;
  outputWidthInches: number;
  outputHeightInches: number;
}

export interface ExportSettings {
  format: ExportFormat;
  quality: number;
  embedDpiMetadata: boolean;
}

export interface BorderConfig {
  enabled: boolean;
  widthPx: number;   // 0-20, border width in output pixels
  color: string;     // hex color e.g. '#000000'
  outerEdge?: boolean; // also apply border around outer edges
}
