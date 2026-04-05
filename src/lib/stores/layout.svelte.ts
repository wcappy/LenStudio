import type {
  LayoutPreset, LayoutLeaf, LayoutNode, SplitDirection, ImageFrame, ImageTransform, EffectType,
  EffectParams
} from '../types/index.js';
import { LAYOUT_PRESETS } from '../types/index.js';
import {
  createLeaf, presetToTree, getLeaves, findLeaf,
  splitLeaf, removeLeaf, updateSplitRatio, updateLeaf,
  leafCount, resetAllRatios
} from '../utils/layout-tree.js';
import { historyStore } from './history.svelte.js';
import { autoSave, loadAutoSave, type ProjectData } from './persistence.js';

const MAX_FRAMES_PER_SECTION = 12;
const MIN_FRAMES_PER_SECTION = 2;

function defaultParamsForEffect(effectType: EffectType): EffectParams {
  switch (effectType) {
    case 'none': return { type: 'flip' };
    case 'flip': return { type: 'flip' };
    case 'animation': return { type: 'animation', fps: 12 };
    case 'depth3d': return { type: 'depth3d', maxDisplacement: 15, depthMapFrameId: null };
    case 'zoom': return { type: 'zoom', zoomFactor: 2, centerX: 0.5, centerY: 0.5 };
    case 'morph': return { type: 'morph', controlPoints: [], gridSize: 8 };
  }
}

function minFramesForEffect(effectType: EffectType): number {
  switch (effectType) {
    case 'none': return 1;
    case 'zoom': return 1;
    case 'depth3d': return 2;
    case 'morph': return 2;
    default: return 2;
  }
}

function maxFramesForEffect(effectType: EffectType): number {
  if (effectType === 'none') return 1;
  return MAX_FRAMES_PER_SECTION;
}

class LayoutStore {
  preset = $state<LayoutPreset>(LAYOUT_PRESETS[0]);
  root = $state<LayoutNode>(createLeaf());
  selectedId = $state<string | null>(null);
  layoutMode = $state(false);
  imageMode = $state(false);
  isLoadingFrames = $state(false);

  /** Flat list of all leaf sections (backward compat) */
  sections = $derived(getLeaves(this.root));

  sectionCount = $derived(leafCount(this.root));

  selectedSection = $derived.by(() => {
    if (!this.selectedId) return this.sections[0] ?? null;
    return this.sections.find(s => s.id === this.selectedId) ?? this.sections[0] ?? null;
  });

  isAllReady = $derived(
    this.sections.length > 0 && this.sections.every(s => s.frames.length >= minFramesForEffect(s.effectType))
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

  private saveHistory() {
    historyStore.push(this.root, this.selectedId);
  }

  undo() {
    const snapshot = historyStore.undo(this.root, this.selectedId);
    if (snapshot) {
      this.root = snapshot.root;
      this.selectedId = snapshot.selectedId;
    }
  }

  redo() {
    const snapshot = historyStore.redo(this.root, this.selectedId);
    if (snapshot) {
      this.root = snapshot.root;
      this.selectedId = snapshot.selectedId;
    }
  }

  setPreset(preset: LayoutPreset) {
    this.saveHistory();
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
    if (this.layoutMode) this.imageMode = false;
  }

  toggleImageMode() {
    this.imageMode = !this.imageMode;
    if (this.imageMode) this.layoutMode = false;
  }

  setFrameTransform(sectionId: string, frameId: string, transform: ImageTransform) {
    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      frames: leaf.frames.map(f =>
        f.id === frameId ? { ...f, transform } : f
      ),
    }));
  }

  resetFrameTransforms(sectionId: string) {
    this.saveHistory();
    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      frames: leaf.frames.map(f => {
        const { transform, ...rest } = f;
        return rest;
      }),
    }));
  }

  // --- Tree mutations ---

  splitSection(id: string, direction: SplitDirection) {
    this.saveHistory();
    const leavesBefore = new Set(getLeaves(this.root).map(l => l.id));
    this.root = splitLeaf(this.root, id, direction);
    const leavesAfter = getLeaves(this.root);
    // Select the first new child
    const newLeaf = leavesAfter.find(l => !leavesBefore.has(l.id));
    this.selectedId = newLeaf?.id ?? leavesAfter[0]?.id ?? null;
    this.preset = { id: 'custom', label: 'Custom', cols: 0, rows: 0 };
  }

  splitIntoQuarters(id: string) {
    this.saveHistory();
    const leavesBefore = new Set(getLeaves(this.root).map(l => l.id));
    this.root = splitLeaf(this.root, id, 'vertical');
    // Find the two new leaves from the vertical split
    const newLeafIds = getLeaves(this.root).filter(l => !leavesBefore.has(l.id)).map(l => l.id);
    // Split each horizontally
    for (const leafId of newLeafIds) {
      this.root = splitLeaf(this.root, leafId, 'horizontal');
    }
    const finalLeaves = getLeaves(this.root);
    this.selectedId = finalLeaves.find(l => !leavesBefore.has(l.id))?.id ?? finalLeaves[0]?.id ?? null;
    this.preset = { id: 'custom', label: 'Custom', cols: 0, rows: 0 };
  }

  removeSection(id: string) {
    if (leafCount(this.root) <= 1) return;
    this.saveHistory();

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

    this.isLoadingFrames = true;
    try {
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
    } finally {
      this.isLoadingFrames = false;
    }
  }

  removeFrame(sectionId: string, frameId: string) {
    this.saveHistory();
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
    this.saveHistory();
    this.root = updateLeaf(this.root, sectionId, leaf => {
      const updated = [...leaf.frames];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...leaf, frames: updated.map((f, i) => ({ ...f, order: i })) };
    });
  }

  setSectionEffect(sectionId: string, effectType: EffectType) {
    this.saveHistory();
    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      effectType,
      effectParams: defaultParamsForEffect(effectType),
    }));
  }

  setSectionEffectParams(sectionId: string, params: EffectParams) {
    this.root = updateLeaf(this.root, sectionId, leaf => ({
      ...leaf,
      effectParams: params,
    }));
  }

  isSectionReady(sectionId: string): boolean {
    const section = findLeaf(this.root, sectionId);
    return !!section && section.frames.length >= minFramesForEffect(section.effectType);
  }

  canAddFrames(sectionId: string): boolean {
    const section = findLeaf(this.root, sectionId);
    return !!section && section.frames.length < maxFramesForEffect(section.effectType);
  }

  remainingSlots(sectionId: string): number {
    const section = findLeaf(this.root, sectionId);
    return section ? maxFramesForEffect(section.effectType) - section.frames.length : 0;
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

  projectName = $state('Untitled');
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  triggerAutoSave(settings: ProjectData['settings']) {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      autoSave(this.root, this.preset, settings).catch(() => {});
    }, 2000);
  }

  async restoreAutoSave(): Promise<boolean> {
    const result = await loadAutoSave();
    if (!result) return false;
    this.root = result.root;
    this.preset = result.data.preset as LayoutPreset;
    this.projectName = result.data.name;
    const leaves = getLeaves(this.root);
    this.selectedId = leaves[0]?.id ?? null;
    historyStore.clear();
    return true;
  }

  loadFromProject(root: LayoutNode, preset: LayoutPreset, name: string) {
    this.cleanupFrames();
    this.root = root;
    this.preset = preset;
    this.projectName = name;
    const leaves = getLeaves(this.root);
    this.selectedId = leaves[0]?.id ?? null;
    historyStore.clear();
  }

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
