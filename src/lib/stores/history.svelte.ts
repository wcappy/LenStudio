import type { LayoutNode, ImageFrame } from '../types/index.js';
import { getLeaves } from '../utils/layout-tree.js';

const MAX_HISTORY = 50;

interface Snapshot {
  root: LayoutNode;
  selectedId: string | null;
}

/** Deep-clone a layout tree, preserving File/ImageBitmap references in frames */
function cloneTree(node: LayoutNode): LayoutNode {
  if (node.type === 'leaf') {
    return {
      ...node,
      frames: node.frames.map(f => ({ ...f, transform: f.transform ? { ...f.transform } : undefined })),
    };
  }
  return {
    ...node,
    children: [cloneTree(node.children[0]), cloneTree(node.children[1])] as [LayoutNode, LayoutNode],
  };
}

class HistoryStore {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  canUndo = $state(false);
  canRedo = $state(false);

  push(root: LayoutNode, selectedId: string | null) {
    this.undoStack.push({ root: cloneTree(root), selectedId });
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
    this.canUndo = this.undoStack.length > 0;
    this.canRedo = false;
  }

  undo(currentRoot: LayoutNode, currentSelectedId: string | null): Snapshot | null {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return null;
    this.redoStack.push({ root: cloneTree(currentRoot), selectedId: currentSelectedId });
    this.canUndo = this.undoStack.length > 0;
    this.canRedo = true;
    return snapshot;
  }

  redo(currentRoot: LayoutNode, currentSelectedId: string | null): Snapshot | null {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return null;
    this.undoStack.push({ root: cloneTree(currentRoot), selectedId: currentSelectedId });
    this.canUndo = true;
    this.canRedo = this.redoStack.length > 0;
    return snapshot;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.canUndo = false;
    this.canRedo = false;
  }
}

export const historyStore = new HistoryStore();
