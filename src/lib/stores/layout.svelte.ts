import type {
  LayoutPreset, LayoutLeaf, LayoutNode, SplitDirection, ImageFrame, EffectType
} from '../types/index.js';
import { LAYOUT_PRESETS } from '../types/index.js';
import {
  createLeaf, presetToTree, getLeaves, findLeaf,
  splitLeaf, removeLeaf, updateSplitRatio, updateLeaf,
  leafCount, resetAllRatios
} from '../utils/layout-tree.js';

const MAX_FRAMES_PER_SECTION = 12;
const MIN_FRAMES_PER_SECTION = 2;

class LayoutStore {
  preset = $state<LayoutPreset>(LAYOUT_PRESETS[0]);
  root = $state<LayoutNode>(createLeaf());
  selectedId = $state<string | null>(null);
  layoutMode = $state(false);

  /** Flat list of all leaf sections (backward compat) */
  sections = $derived(getLeaves(this.root));

  sectionCount = $derived(leafCount(this.root));

  selectedSection = $derived.by(() => {
    if (!this.selectedId) return this.sections[0] ?? null;
    return this.sections.find(s => s.id === this.selectedId) ?? this.sections[0] ?? null;
  });

  isAllReady = $derived(
    this.sections.length > 0 && this.sections.every(s => s.frames.length >= MIN_FRAMES_PER_SECTION)
  );

  canRemoveSelected = $derived(
    this.sectionCount > 1 && this.selectedId !== null
  );

  constructor() {
    const leaves = getLeaves(this.root);
    if (leaves.length > 0) {
      this.selectedId = leaves[0].id;
    }
  }

  setPreset(preset: LayoutPreset) {
    this.cleanupFrames();
    this.preset = preset;
    this.root = presetToTree(preset.cols, preset.rows);
    const leaves = getLeaves(this.root);
    this.selectedId = leaves[0]?.id ?? null;
  }

  selectSection(id: string) {
    this.selectedId = id;
  }

  toggleLayoutMode() {
    this.layoutMode = !this.layoutMode;
  }

  // --- Tree mutations ---

  splitSection(id: string, direction: SplitDirection) {
    this.root = splitLeaf(this.root, id, direction);
    // Select the first new child
    const leaves = getLeaves(this.root);
    // The split replaced the old leaf, so the old id is gone
    if (!leaves.find(l => l.id === this.selectedId)) {
      this.selectedId = leaves[0]?.id ?? null;
    }
    this.preset = { id: 'custom', label: 'Custom', cols: 0, rows: 0 };
  }

  removeSection(id: string) {
    if (leafCount(this.root) <= 1) return;

    // Clean up frames of the removed leaf
    const leaf = findLeaf(this.root, id);
    if (leaf) {
      for (const frame of leaf.frames) {
        URL.revokeObjectURL(frame.objectUrl);
        frame.bitmap?.close();
      }
    }

    this.root = removeLeaf(this.root, id);
    const leaves = getLeaves(this.root);
    if (!leaves.find(l => l.id === this.selectedId)) {
      this.selectedId = leaves[0]?.id ?? null;
    }
    this.preset = { id: 'custom', label: 'Custom', cols: 0, rows: 0 };
  }

  updateSplitRatio(splitId: string, ratio: number) {
    this.root = updateSplitRatio(this.root, splitId, ratio);
  }

  resetRatios() {
    this.root = resetAllRatios(this.root);
  }

  // --- Frame management ---

  async addFrames(sectionId: string, files: FileList | File[]) {
    const section = findLeaf(this.root, sectionId);
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

    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      frames: [...leaf.frames, ...newFrames],
    }));
  }

  removeFrame(sectionId: string, frameId: string) {
    const section = findLeaf(this.root, sectionId);
    if (!section) return;

    const frame = section.frames.find(f => f.id === frameId);
    if (frame) {
      URL.revokeObjectURL(frame.objectUrl);
      frame.bitmap?.close();
    }

    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      frames: leaf.frames
        .filter(f => f.id !== frameId)
        .map((f, i) => ({ ...f, order: i })),
    }));
  }

  reorderFrame(sectionId: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    this.root = updateLeaf(this.root, sectionId, leaf => {
      const updated = [...leaf.frames];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...leaf, frames: updated.map((f, i) => ({ ...f, order: i })) };
    });
  }

  setSectionEffect(sectionId: string, effectType: EffectType) {
    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      effectType,
    }));
  }

  isSectionReady(sectionId: string): boolean {
    const section = findLeaf(this.root, sectionId);
    return !!section && section.frames.length >= MIN_FRAMES_PER_SECTION;
  }

  canAddFrames(sectionId: string): boolean {
    const section = findLeaf(this.root, sectionId);
    return !!section && section.frames.length < MAX_FRAMES_PER_SECTION;
  }

  remainingSlots(sectionId: string): number {
    const section = findLeaf(this.root, sectionId);
    return section ? MAX_FRAMES_PER_SECTION - section.frames.length : 0;
  }

  clearAll() {
    this.cleanupFrames();
    this.root = updateLeaf(this.root, '', () => createLeaf()); // won't match
    // Instead, rebuild current tree with empty frames
    const rebuild = (node: LayoutNode): LayoutNode => {
      if (node.type === 'leaf') return { ...node, frames: [] };
      return { ...node, children: [rebuild(node.children[0]), rebuild(node.children[1])] as [LayoutNode, LayoutNode] };
    };
    this.root = rebuild(this.root);
  }

  private cleanupFrames() {
    for (const section of getLeaves(this.root)) {
      for (const frame of section.frames) {
        URL.revokeObjectURL(frame.objectUrl);
        frame.bitmap?.close();
      }
    }
  }

  // --- Custom grid (preset-based) ---

  customCols = $state(2);
  customRows = $state(2);

  setCustomGrid(cols: number, rows: number) {
    const clampedCols = Math.max(1, Math.min(cols, 6));
    const clampedRows = Math.max(1, Math.min(rows, 6));
    this.customCols = clampedCols;
    this.customRows = clampedRows;
    this.setPreset({
      id: 'custom',
      label: `${clampedCols} \u00d7 ${clampedRows}`,
      cols: clampedCols,
      rows: clampedRows,
    });
  }
}

export const layoutStore = new LayoutStore();
