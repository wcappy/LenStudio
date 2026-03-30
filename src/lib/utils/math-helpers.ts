export function stripWidth(dpi: number, lpi: number): number {
  return Math.round(dpi / lpi);
}

export function outputPixels(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

export function numLenticules(widthPx: number, dpi: number, lpi: number): number {
  return Math.floor(widthPx / stripWidth(dpi, lpi));
}

export function subStripWidths(strip: number, frameCount: number): number[] {
  const base = Math.floor(strip / frameCount);
  const remainder = strip % frameCount;
  return Array.from({ length: frameCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function dpiToPixelsPerMeter(dpi: number): number {
  return Math.round(dpi * 39.3701);
}
