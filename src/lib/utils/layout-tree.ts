import type {
  LayoutNode, LayoutLeaf, LayoutSplit, SplitDirection,
  CellRect, DividerInfo, EffectType
} from '../types/index.js';

/** Create a new empty leaf */
export function createLeaf(effectType: EffectType = 'flip'): LayoutLeaf {
  return {
    type: 'leaf',
    id: crypto.randomUUID(),
    effectType,
    frames: [],
  };
}

/** Build a tree from a cols×rows preset */
export function presetToTree(cols: number, rows: number): LayoutNode {
  if (cols === 1 && rows === 1) return createLeaf();

  if (rows > 1) {
    return {
      type: 'split',
      id: crypto.randomUUID(),
      direction: 'horizontal',
      ratio: 1 / rows,
      children: [
        presetToTree(cols, 1),
        rows === 2 ? presetToTree(cols, 1) : presetToTree(cols, rows - 1),
      ],
    };
  }

  // cols > 1
  return {
    type: 'split',
    id: crypto.randomUUID(),
    direction: 'vertical',
    ratio: 1 / cols,
    children: [
      createLeaf(),
      cols === 2 ? createLeaf() : presetToTree(cols - 1, 1),
    ],
  };
}

/** Collect all leaves (sections) from the tree */
export function getLeaves(node: LayoutNode): LayoutLeaf[] {
  if (node.type === 'leaf') return [node];
  return [...getLeaves(node.children[0]), ...getLeaves(node.children[1])];
}

/** Find a leaf by id */
export function findLeaf(node: LayoutNode, id: string): LayoutLeaf | null {
  if (node.type === 'leaf') return node.id === id ? node : null;
  return findLeaf(node.children[0], id) ?? findLeaf(node.children[1], id);
}

/** Find a split by id */
export function findSplit(node: LayoutNode, id: string): LayoutSplit | null {
  if (node.type === 'leaf') return null;
  if (node.id === id) return node;
  return findSplit(node.children[0], id) ?? findSplit(node.children[1], id);
}

/** Count total leaves */
export function leafCount(node: LayoutNode): number {
  if (node.type === 'leaf') return 1;
  return leafCount(node.children[0]) + leafCount(node.children[1]);
}

/** Split a leaf into two, returning a new tree */
export function splitLeaf(
  root: LayoutNode,
  leafId: string,
  direction: SplitDirection
): LayoutNode {
  return mapNode(root, node => {
    if (node.type !== 'leaf' || node.id !== leafId) return node;
    const newSplit: LayoutSplit = {
      type: 'split',
      id: crypto.randomUUID(),
      direction,
      ratio: 0.5,
      children: [
        { ...node, id: crypto.randomUUID() },
        createLeaf(node.effectType),
      ],
    };
    return newSplit;
  });
}

/** Remove a leaf, promoting its sibling to take the parent split's place */
export function removeLeaf(root: LayoutNode, leafId: string): LayoutNode {
  if (root.type === 'leaf') return root; // can't remove the only leaf

  return mapNode(root, node => {
    if (node.type !== 'split') return node;
    const [a, b] = node.children;

    if (a.type === 'leaf' && a.id === leafId) return b;
    if (b.type === 'leaf' && b.id === leafId) return a;

    return node;
  });
}

/** Update a split's ratio */
export function updateSplitRatio(
  root: LayoutNode,
  splitId: string,
  newRatio: number
): LayoutNode {
  const clamped = Math.max(0.1, Math.min(0.9, newRatio));
  return mapNode(root, node => {
    if (node.type === 'split' && node.id === splitId) {
      return { ...node, ratio: clamped };
    }
    return node;
  });
}

/** Update a leaf's property (effectType, frames, etc.) */
export function updateLeaf(
  root: LayoutNode,
  leafId: string,
  updater: (leaf: LayoutLeaf) => LayoutLeaf
): LayoutNode {
  return mapNode(root, node => {
    if (node.type === 'leaf' && node.id === leafId) return updater(node);
    return node;
  });
}

/** Compute cell rects, dividers, and split bounding rects from the tree */
export function computeTreeLayout(
  node: LayoutNode,
  x: number, y: number, w: number, h: number,
  borderPx: number
): { cells: Map<string, CellRect>; dividers: DividerInfo[]; splitRects: Map<string, CellRect> } {
  const cells = new Map<string, CellRect>();
  const dividers: DividerInfo[] = [];
  const splitRects = new Map<string, CellRect>();
  walkTree(node, x, y, w, h, borderPx, cells, dividers, splitRects);
  return { cells, dividers, splitRects };
}

function walkTree(
  node: LayoutNode,
  x: number, y: number, w: number, h: number,
  borderPx: number,
  cells: Map<string, CellRect>,
  dividers: DividerInfo[],
  splitRects: Map<string, CellRect>
) {
  if (node.type === 'leaf') {
    cells.set(node.id, { x, y, w, h });
    return;
  }

  // Store the bounding rect this split controls
  splitRects.set(node.id, { x, y, w, h });

  if (node.direction === 'vertical') {
    const availW = w - borderPx;
    const leftW = availW * node.ratio;
    const rightW = availW - leftW;

    walkTree(node.children[0], x, y, leftW, h, borderPx, cells, dividers, splitRects);
    dividers.push({
      splitId: node.id,
      direction: 'vertical',
      x: x + leftW, y, w: borderPx, h,
    });
    walkTree(node.children[1], x + leftW + borderPx, y, rightW, h, borderPx, cells, dividers, splitRects);
  } else {
    const availH = h - borderPx;
    const topH = availH * node.ratio;
    const bottomH = availH - topH;

    walkTree(node.children[0], x, y, w, topH, borderPx, cells, dividers, splitRects);
    dividers.push({
      splitId: node.id,
      direction: 'horizontal',
      x, y: y + topH, w, h: borderPx,
    });
    walkTree(node.children[1], x, y + topH + borderPx, w, bottomH, borderPx, cells, dividers, splitRects);
  }
}

/** Deep-map over nodes, bottom-up */
function mapNode(
  node: LayoutNode,
  fn: (n: LayoutNode) => LayoutNode
): LayoutNode {
  if (node.type === 'leaf') return fn(node);
  const mapped: LayoutSplit = {
    ...node,
    children: [
      mapNode(node.children[0], fn) as LayoutNode,
      mapNode(node.children[1], fn) as LayoutNode,
    ] as [LayoutNode, LayoutNode],
  };
  return fn(mapped);
}

/** Reset all splits to 0.5 ratio */
export function resetAllRatios(node: LayoutNode): LayoutNode {
  return mapNode(node, n => {
    if (n.type === 'split') return { ...n, ratio: 0.5 };
    return n;
  });
}
