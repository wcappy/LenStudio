import type { LayoutNode, LayoutLeaf, ImageFrame, ImageTransform, EffectType, EffectParams, LPI, DPI, BorderConfig } from '../types/index.js';
import { getLeaves } from '../utils/layout-tree.js';

const DB_NAME = 'tilt-studio';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_IMAGES = 'images';
const AUTOSAVE_KEY = '__autosave__';

// --- Serializable project format ---

export interface SerializedFrame {
  id: string;
  order: number;
  width: number;
  height: number;
  transform?: ImageTransform;
  /** Only used in .tilt.json file export — base64 encoded image */
  dataUrl?: string;
}

interface SerializedLeaf {
  type: 'leaf';
  id: string;
  effectType: EffectType;
  effectParams?: EffectParams;
  frames: SerializedFrame[];
}

interface SerializedSplit {
  type: 'split';
  id: string;
  direction: 'horizontal' | 'vertical';
  ratio: number;
  children: [SerializedNode, SerializedNode];
}

type SerializedNode = SerializedLeaf | SerializedSplit;

export interface ProjectData {
  version: 1;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: {
    lpi: LPI;
    dpi: DPI;
    outputWidthInches: number;
    outputHeightInches: number;
    border: BorderConfig;
  };
  preset: { id: string; label: string; cols: number; rows: number };
  tree: SerializedNode;
}

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
  sectionCount: number;
  frameCount: number;
  thumbnail?: string;
}

// --- IndexedDB helpers ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, value: any, key?: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const req = key !== undefined ? s.put(value, key) : s.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = s.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const req = s.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- Serialization ---

function serializeTree(node: LayoutNode): SerializedNode {
  if (node.type === 'leaf') {
    return {
      type: 'leaf',
      id: node.id,
      effectType: node.effectType,
      effectParams: node.effectParams,
      frames: node.frames.map(f => ({
        id: f.id,
        order: f.order,
        width: f.width,
        height: f.height,
        transform: f.transform,
      })),
    };
  }
  return {
    type: 'split',
    id: node.id,
    direction: node.direction,
    ratio: node.ratio,
    children: [serializeTree(node.children[0]), serializeTree(node.children[1])],
  };
}

function deserializeTree(node: SerializedNode, frameMap: Map<string, ImageFrame>): LayoutNode {
  if (node.type === 'leaf') {
    return {
      type: 'leaf',
      id: node.id,
      effectType: node.effectType,
      effectParams: node.effectParams,
      frames: node.frames.map(sf => {
        const restored = frameMap.get(sf.id);
        if (restored) return restored;
        // Frame without image data — create placeholder
        return {
          id: sf.id,
          file: new File([], 'missing'),
          objectUrl: '',
          bitmap: null,
          order: sf.order,
          width: sf.width,
          height: sf.height,
          transform: sf.transform,
        };
      }),
    };
  }
  return {
    type: 'split',
    id: node.id,
    direction: node.direction,
    ratio: node.ratio,
    children: [deserializeTree(node.children[0], frameMap), deserializeTree(node.children[1], frameMap)],
  };
}

function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

async function frameToBlob(frame: ImageFrame): Promise<Blob> {
  // Use the original file if available
  if (frame.file && frame.file.size > 0) return frame.file;
  // Fallback: draw bitmap to canvas
  if (frame.bitmap) {
    const canvas = new OffscreenCanvas(frame.bitmap.width, frame.bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(frame.bitmap, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Blob();
}

// --- Public API ---

export async function saveProject(
  projectId: string,
  name: string,
  root: LayoutNode,
  preset: { id: string; label: string; cols: number; rows: number },
  settings: ProjectData['settings']
): Promise<void> {
  const db = await openDB();
  const now = new Date().toISOString();

  const project: ProjectData & { id: string } = {
    id: projectId,
    version: 1,
    name,
    createdAt: now,
    updatedAt: now,
    settings,
    preset,
    tree: serializeTree(root),
  };

  // Check if existing project to preserve createdAt
  const existing = await idbGet<ProjectData & { id: string }>(db, STORE_PROJECTS, projectId);
  if (existing) project.createdAt = existing.createdAt;

  await idbPut(db, STORE_PROJECTS, project);

  // Save image blobs
  const leaves = getLeaves(root);
  for (const leaf of leaves) {
    for (const frame of leaf.frames) {
      const blob = await frameToBlob(frame);
      if (blob.size > 0) {
        await idbPut(db, STORE_IMAGES, blob, `${projectId}:${frame.id}`);
      }
    }
  }

  db.close();
}

export async function loadProject(projectId: string): Promise<{
  data: ProjectData;
  root: LayoutNode;
} | null> {
  const db = await openDB();
  const project = await idbGet<ProjectData & { id: string }>(db, STORE_PROJECTS, projectId);
  if (!project) { db.close(); return null; }

  // Restore frames from image store
  const frameMap = new Map<string, ImageFrame>();
  const allFrameIds = collectFrameIds(project.tree);

  for (const fid of allFrameIds) {
    const blob = await idbGet<Blob>(db, STORE_IMAGES, `${projectId}:${fid.id}`);
    if (blob && blob.size > 0) {
      const file = new File([blob], `frame-${fid.id}.png`, { type: blob.type || 'image/png' });
      const objectUrl = URL.createObjectURL(file);
      const bitmap = await createImageBitmap(file);
      frameMap.set(fid.id, {
        id: fid.id,
        file,
        objectUrl,
        bitmap,
        order: fid.order,
        width: bitmap.width,
        height: bitmap.height,
        transform: fid.transform,
      });
    }
  }

  const root = deserializeTree(project.tree, frameMap);
  db.close();
  return { data: project, root };
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const db = await openDB();
  const all = await idbGetAll<ProjectData & { id: string }>(db, STORE_PROJECTS);
  db.close();

  return all
    .filter(p => p.id !== AUTOSAVE_KEY)
    .map(p => {
      const leaves = collectLeaves(p.tree);
      return {
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        sectionCount: leaves.length,
        frameCount: leaves.reduce((sum, l) => sum + l.frames.length, 0),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await openDB();
  const project = await idbGet<ProjectData & { id: string }>(db, STORE_PROJECTS, projectId);
  if (project) {
    const frameIds = collectFrameIds(project.tree);
    for (const fid of frameIds) {
      await idbDelete(db, STORE_IMAGES, `${projectId}:${fid.id}`);
    }
    await idbDelete(db, STORE_PROJECTS, projectId);
  }
  db.close();
}

// --- Auto-save ---

export async function autoSave(
  root: LayoutNode,
  preset: { id: string; label: string; cols: number; rows: number },
  settings: ProjectData['settings']
): Promise<void> {
  await saveProject(AUTOSAVE_KEY, 'Auto-save', root, preset, settings);
}

export async function loadAutoSave(): Promise<{
  data: ProjectData;
  root: LayoutNode;
} | null> {
  return loadProject(AUTOSAVE_KEY);
}

export async function hasAutoSave(): Promise<boolean> {
  const db = await openDB();
  const project = await idbGet<ProjectData>(db, STORE_PROJECTS, AUTOSAVE_KEY);
  db.close();
  if (!project) return false;
  const leaves = collectLeaves(project.tree);
  return leaves.some(l => l.frames.length > 0);
}

// --- File export/import ---

export async function exportProjectFile(
  name: string,
  root: LayoutNode,
  preset: { id: string; label: string; cols: number; rows: number },
  settings: ProjectData['settings']
): Promise<Blob> {
  const tree = serializeTree(root);

  // Embed image data as base64
  const leaves = getLeaves(root);
  const dataUrls = new Map<string, string>();
  for (const leaf of leaves) {
    for (const frame of leaf.frames) {
      const blob = await frameToBlob(frame);
      if (blob.size > 0) {
        const buf = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        dataUrls.set(frame.id, `data:${blob.type || 'image/png'};base64,${base64}`);
      }
    }
  }

  // Inject dataUrls into serialized tree
  injectDataUrls(tree, dataUrls);

  const project: ProjectData = {
    version: 1,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings,
    preset,
    tree,
  };

  return new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
}

export async function importProjectFile(file: File): Promise<{
  data: ProjectData;
  root: LayoutNode;
}> {
  const text = await file.text();
  const project: ProjectData = JSON.parse(text);

  // Extract frames from embedded data URLs
  const frameMap = new Map<string, ImageFrame>();
  const allFrameIds = collectFrameIds(project.tree);

  for (const fid of allFrameIds) {
    if (fid.dataUrl) {
      const resp = await fetch(fid.dataUrl);
      const blob = await resp.blob();
      const f = new File([blob], `frame-${fid.id}.png`, { type: blob.type });
      const objectUrl = URL.createObjectURL(f);
      const bitmap = await createImageBitmap(f);
      frameMap.set(fid.id, {
        id: fid.id,
        file: f,
        objectUrl,
        bitmap,
        order: fid.order,
        width: bitmap.width,
        height: bitmap.height,
        transform: fid.transform,
      });
    }
  }

  const root = deserializeTree(project.tree, frameMap);
  return { data: project, root };
}

// --- Helpers ---

function collectFrameIds(node: SerializedNode): SerializedFrame[] {
  if (node.type === 'leaf') return node.frames;
  return [...collectFrameIds(node.children[0]), ...collectFrameIds(node.children[1])];
}

function collectLeaves(node: SerializedNode): SerializedLeaf[] {
  if (node.type === 'leaf') return [node];
  return [...collectLeaves(node.children[0]), ...collectLeaves(node.children[1])];
}

function injectDataUrls(node: SerializedNode, dataUrls: Map<string, string>): void {
  if (node.type === 'leaf') {
    for (const f of node.frames) {
      f.dataUrl = dataUrls.get(f.id);
    }
  } else {
    injectDataUrls(node.children[0], dataUrls);
    injectDataUrls(node.children[1], dataUrls);
  }
}
