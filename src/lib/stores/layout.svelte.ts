import type { LayoutPreset, LayoutSection, EffectType, ImageFrame } from '../types/index.js';
import { LAYOUT_PRESETS } from '../types/index.js';

const MAX_FRAMES_PER_SECTION = 12;
const MIN_FRAMES_PER_SECTION = 2;

function buildSections(preset: LayoutPreset): LayoutSection[] {
  const sections: LayoutSection[] = [];
  for (let r = 0; r < preset.rows; r++) {
    for (let c = 0; c < preset.cols; c++) {
      sections.push({
        id: crypto.randomUUID(),
        row: r,
        col: c,
        effectType: 'flip',
        frames: [],
      });
    }
  }
  return sections;
}

class LayoutStore {
  preset = $state<LayoutPreset>(LAYOUT_PRESETS[0]); // Full (1x1)
  sections = $state<LayoutSection[]>(buildSections(LAYOUT_PRESETS[0]));
  selectedId = $state<string | null>(null);

  sectionCount = $derived(this.preset.cols * this.preset.rows);

  selectedSection = $derived.by(() => {
    if (!this.selectedId) return this.sections[0] ?? null;
    return this.sections.find(s => s.id === this.selectedId) ?? this.sections[0] ?? null;
  });

  isAllReady = $derived(
    this.sections.length > 0 && this.sections.every(s => s.frames.length >= MIN_FRAMES_PER_SECTION)
  );

  constructor() {
    // Auto-select first section
    if (this.sections.length > 0) {
      this.selectedId = this.sections[0].id;
    }
  }

  setPreset(preset: LayoutPreset) {
    // Clean up old frames
    for (const section of this.sections) {
      for (const frame of section.frames) {
        URL.revokeObjectURL(frame.objectUrl);
        frame.bitmap?.close();
      }
    }
    this.preset = preset;
    this.sections = buildSections(preset);
    this.selectedId = this.sections[0]?.id ?? null;
  }

  selectSection(id: string) {
    this.selectedId = id;
  }

  async addFrames(sectionId: string, files: FileList | File[]) {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );

    const slotsAvailable = MAX_FRAMES_PER_SECTION - section.frames.length;
    const toAdd = imageFiles.slice(0, slotsAvailable);

    const newFrames: ImageFrame[] = [];
    for (const file of toAdd) {
      const objectUrl = URL.createObjectURL(file);
      const bitmap = await createImageBitmap(file);
      newFrames.push({
        id: crypto.randomUUID(),
        file,
        objectUrl,
        bitmap,
        order: section.frames.length + newFrames.length,
        width: bitmap.width,
        height: bitmap.height,
      });
    }

    // Trigger reactivity by replacing the sections array
    this.sections = this.sections.map(s =>
      s.id === sectionId
        ? { ...s, frames: [...s.frames, ...newFrames] }
        : s
    );
  }

  removeFrame(sectionId: string, frameId: string) {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;

    const frame = section.frames.find(f => f.id === frameId);
    if (frame) {
      URL.revokeObjectURL(frame.objectUrl);
      frame.bitmap?.close();
    }

    this.sections = this.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            frames: s.frames
              .filter(f => f.id !== frameId)
              .map((f, i) => ({ ...f, order: i })),
          }
        : s
    );
  }

  reorderFrame(sectionId: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    this.sections = this.sections.map(s => {
      if (s.id !== sectionId) return s;
      const updated = [...s.frames];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...s, frames: updated.map((f, i) => ({ ...f, order: i })) };
    });
  }

  setSectionEffect(sectionId: string, effectType: EffectType) {
    this.sections = this.sections.map(s =>
      s.id === sectionId ? { ...s, effectType } : s
    );
  }

  isSectionReady(sectionId: string): boolean {
    const section = this.sections.find(s => s.id === sectionId);
    return !!section && section.frames.length >= MIN_FRAMES_PER_SECTION;
  }

  canAddFrames(sectionId: string): boolean {
    const section = this.sections.find(s => s.id === sectionId);
    return !!section && section.frames.length < MAX_FRAMES_PER_SECTION;
  }

  remainingSlots(sectionId: string): number {
    const section = this.sections.find(s => s.id === sectionId);
    return section ? MAX_FRAMES_PER_SECTION - section.frames.length : 0;
  }

  customCols = $state(2);
  customRows = $state(2);

  setCustomGrid(cols: number, rows: number) {
    const clampedCols = Math.max(1, Math.min(cols, 6));
    const clampedRows = Math.max(1, Math.min(rows, 6));
    this.customCols = clampedCols;
    this.customRows = clampedRows;

    const customPreset: LayoutPreset = {
      id: 'custom',
      label: `${clampedCols} \u00d7 ${clampedRows}`,
      cols: clampedCols,
      rows: clampedRows,
    };
    this.setPreset(customPreset);
  }

  clearAll() {
    for (const section of this.sections) {
      for (const frame of section.frames) {
        URL.revokeObjectURL(frame.objectUrl);
        frame.bitmap?.close();
      }
    }
    this.sections = this.sections.map(s => ({ ...s, frames: [] }));
  }
}

export const layoutStore = new LayoutStore();
