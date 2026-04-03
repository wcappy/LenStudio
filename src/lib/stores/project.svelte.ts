import type { LPI, DPI, BorderConfig } from '../types/index.js';

export type ThemeMode = 'system' | 'light' | 'dark';
export type MeasurementUnit = 'mm' | 'cm' | 'in';

const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;

/** Convert inches to the given display unit */
export function inchesToUnit(inches: number, unit: MeasurementUnit): number {
  switch (unit) {
    case 'mm': return +(inches * MM_PER_INCH).toFixed(1);
    case 'cm': return +(inches * CM_PER_INCH).toFixed(2);
    case 'in': return +inches.toFixed(2);
  }
}

/** Convert from the given display unit back to inches */
export function unitToInches(value: number, unit: MeasurementUnit): number {
  switch (unit) {
    case 'mm': return value / MM_PER_INCH;
    case 'cm': return value / CM_PER_INCH;
    case 'in': return value;
  }
}

/** Unit label for display */
export function unitLabel(unit: MeasurementUnit): string {
  return unit;
}

/** Step size for number inputs in each unit */
export function unitStep(unit: MeasurementUnit): number {
  switch (unit) {
    case 'mm': return 1;
    case 'cm': return 0.1;
    case 'in': return 0.1;
  }
}

/** Max dimension in display unit (approx 36 inches) */
export function unitMax(unit: MeasurementUnit): number {
  switch (unit) {
    case 'mm': return 914;
    case 'cm': return 91.4;
    case 'in': return 36;
  }
}

function loadPref<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v !== null ? (v as unknown as T) : fallback;
}

function savePref(key: string, value: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

class ProjectState {
  lpi = $state<LPI>(60);
  dpi = $state<DPI>(300);
  outputWidthInches = $state(4);
  outputHeightInches = $state(6);
  themeMode = $state<ThemeMode>(loadPref('theme', 'system') as ThemeMode);
  unit = $state<MeasurementUnit>(loadPref('unit', 'mm') as MeasurementUnit);
  border = $state<BorderConfig>({ enabled: false, widthPx: 4, color: '#000000' });
  isProcessing = $state(false);
  processProgress = $state(0);

  outputWidthPx = $derived(Math.round(this.outputWidthInches * this.dpi));
  outputHeightPx = $derived(Math.round(this.outputHeightInches * this.dpi));
  stripWidth = $derived(Math.round(this.dpi / this.lpi));
  maxFrames = $derived(Math.round(this.dpi / this.lpi));

  /** Current dimensions in the user's chosen display unit */
  displayWidth = $derived(inchesToUnit(this.outputWidthInches, this.unit));
  displayHeight = $derived(inchesToUnit(this.outputHeightInches, this.unit));

  resolvedTheme = $derived.by(() => {
    if (this.themeMode !== 'system') return this.themeMode;
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  setTheme(mode: ThemeMode) {
    this.themeMode = mode;
    savePref('theme', mode);
  }

  cycleTheme() {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const idx = modes.indexOf(this.themeMode);
    this.setTheme(modes[(idx + 1) % modes.length]);
  }

  setUnit(u: MeasurementUnit) {
    this.unit = u;
    savePref('unit', u);
  }

  /** Set width from a value in the current display unit */
  setWidthFromDisplay(value: number) {
    this.outputWidthInches = unitToInches(value, this.unit);
  }

  /** Set height from a value in the current display unit */
  setHeightFromDisplay(value: number) {
    this.outputHeightInches = unitToInches(value, this.unit);
  }

  setBorder(config: Partial<BorderConfig>) {
    this.border = { ...this.border, ...config };
  }
}

export const projectState = new ProjectState();
