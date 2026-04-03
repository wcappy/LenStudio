export type LPI = 40 | 50 | 60 | 75 | 100;
export type DPI = 150 | 300 | 600;
export type EffectType = 'none' | 'flip' | 'animation' | 'depth3d' | 'zoom' | 'morph';
export type ExportFormat = 'png' | 'tiff';

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
