import type { ImageFrame, ImageTransform, BorderConfig, LayoutLeaf, LayoutNode, CellRect, DividerInfo } from '../types/index.js';
import { computeTreeLayout } from '../utils/layout-tree.js';
import { normalizeFrames, buildCSSFilter } from '../engine/image-utils.js';
import { applyEffect } from '../engine/effects/apply-effect.js';

export class PreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlayEnabled = false;
  private holoEnabled = false;
  private outputWidthPx = 1200;
  private printStripWidth = 5;

  // Tree-based layout
  private root: LayoutNode = { type: 'leaf', id: '', effectType: 'flip', frames: [] };
  private sections: LayoutLeaf[] = [];
  private selectedSectionId: string | null = null;
  private borderConfig: BorderConfig = { enabled: false, widthPx: 4, color: '#000000' };

  // Modes
  private layoutMode = false;
  private imageMode = false;
  private anaglyphMode = false;
  private hoveredDivider: string | null = null; // splitId
  private dragTargetId: string | null = null;

  // Cached geometry from last render
  private lastCells: Map<string, CellRect> = new Map();
  private lastDividers: DividerInfo[] = [];
  private lastSplitRects: Map<string, CellRect> = new Map();

  // Cached effect-processed bitmaps per section
  private processedCache: Map<string, ImageBitmap[]> = new Map();
  private processingIds: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setTree(root: LayoutNode, sections: LayoutLeaf[], selectedId: string | null) {
    this.root = root;
    this.sections = sections;
    this.selectedSectionId = selectedId;
  }

  setOverlay(enabled: boolean, outputWidthPx: number, stripWidth: number) {
    this.overlayEnabled = enabled;
    this.outputWidthPx = outputWidthPx;
    this.printStripWidth = stripWidth;
  }

  setBorder(config: BorderConfig) {
    this.borderConfig = config;
  }

  setLayoutMode(enabled: boolean) {
    this.layoutMode = enabled;
  }

  setImageMode(enabled: boolean) {
    this.imageMode = enabled;
  }

  setAnaglyphMode(enabled: boolean) {
    this.anaglyphMode = enabled;
  }

  setHoveredDivider(splitId: string | null) {
    this.hoveredDivider = splitId;
  }

  getCells(): Map<string, CellRect> {
    return this.lastCells;
  }

  getDividers(): DividerInfo[] {
    return this.lastDividers;
  }

  getSplitRects(): Map<string, CellRect> {
    return this.lastSplitRects;
  }

  setHolographic(enabled: boolean) {
    this.holoEnabled = enabled;
  }

  setDragTarget(cellId: string | null) {
    this.dragTargetId = cellId;
  }

  render(viewAngle: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Fill background — use border color if outer edge borders are enabled
    const showOuterBorder = this.borderConfig.enabled && (this.borderConfig.outerEdge ?? false);
    ctx.fillStyle = showOuterBorder ? this.borderConfig.color : '#111113';
    ctx.fillRect(0, 0, w, h);

    if (this.sections.length === 0) {
      ctx.fillStyle = '#71717a';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload images to preview', w / 2, h / 2);
      return;
    }

    // Compute scaled border
    const hasSplits = this.sections.length > 1;
    const outerEdge = this.borderConfig.outerEdge ?? false;
    const borderEnabled = this.borderConfig.enabled && (hasSplits || outerEdge);
    const scale = w / this.outputWidthPx;
    const scaledBorder = borderEnabled ? this.borderConfig.widthPx * scale : 0;
    const outerInset = this.borderConfig.enabled && outerEdge ? this.borderConfig.widthPx * scale : 0;

    // Compute layout from tree
    const { cells, dividers, splitRects } = computeTreeLayout(
      this.root,
      outerInset, outerInset,
      w - outerInset * 2, h - outerInset * 2,
      scaledBorder
    );
    this.lastCells = cells;
    this.lastDividers = dividers;
    this.lastSplitRects = splitRects;

    // Render each section in its computed rect
    for (const section of this.sections) {
      const rect = cells.get(section.id);
      if (!rect) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();

      if (section.frames.length === 0) {
        ctx.fillStyle = '#111113';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = '#71717a';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', rect.x + rect.w / 2, rect.y + rect.h / 2);
      } else {
        this.renderSectionFrames(section.frames, viewAngle, rect.x, rect.y, rect.w, rect.h, section.id);
      }

      ctx.restore();
    }

    // Draw borders / grid lines
    if (hasSplits) {
      this.renderDividers(dividers, scaledBorder);
    }

    // Selected section highlight
    if (this.selectedSectionId) {
      const selRect = cells.get(this.selectedSectionId);
      if (selRect) {
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(selRect.x + 1, selRect.y + 1, selRect.w - 2, selRect.h - 2);
        ctx.restore();
      }
    }

    // Drag target highlight
    if (this.dragTargetId) {
      const dragRect = cells.get(this.dragTargetId);
      if (dragRect) {
        ctx.save();
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fillRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(dragRect.x + 1, dragRect.y + 1, dragRect.w - 2, dragRect.h - 2);
        ctx.setLineDash([]);
        // Drop hint text
        ctx.fillStyle = '#6366f1';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Drop images here', dragRect.x + dragRect.w / 2, dragRect.y + dragRect.h / 2);
        ctx.restore();
      }
    }

    // Layout mode handles
    if (this.layoutMode && hasSplits) {
      this.renderLayoutHandles(dividers);
    }

    if (this.overlayEnabled) {
      this.renderOverlay(viewAngle);
    }

    if (this.holoEnabled) {
      this.renderHolographic(viewAngle);
    }
  }

  /** Pre-process effect frames for a section and cache as ImageBitmaps */
  async processSection(section: LayoutLeaf, targetW: number, targetH: number): Promise<void> {
    if (this.processingIds.has(section.id)) return;
    this.processingIds.add(section.id);

    try {
      const normalized = normalizeFrames(section.frames, targetW, targetH);
      const processed = applyEffect(normalized, section.effectType, section.effectParams);

      const bitmaps = await Promise.all(
        processed.map(imgData => {
          const c = new OffscreenCanvas(imgData.width, imgData.height);
          const ctx2 = c.getContext('2d')!;
          ctx2.putImageData(imgData, 0, 0);
          return createImageBitmap(c);
        })
      );

      // Clean up old bitmaps
      this.processedCache.get(section.id)?.forEach(b => b.close());
      this.processedCache.set(section.id, bitmaps);
    } finally {
      this.processingIds.delete(section.id);
    }
  }

  clearProcessedCache(sectionId?: string) {
    if (sectionId) {
      this.processedCache.get(sectionId)?.forEach(b => b.close());
      this.processedCache.delete(sectionId);
    } else {
      for (const bitmaps of this.processedCache.values()) {
        bitmaps.forEach(b => b.close());
      }
      this.processedCache.clear();
    }
  }

  private renderSectionFrames(
    frames: ImageFrame[], viewAngle: number,
    x: number, y: number, w: number, h: number,
    sectionId?: string
  ) {
    const { ctx } = this;

    // Use cached processed bitmaps if available (for non-identity effects)
    const cached = sectionId ? this.processedCache.get(sectionId) : undefined;
    if (cached && cached.length > 0) {
      const n = cached.length;
      const pos = viewAngle * (n - 1);
      const idx = Math.floor(pos);
      const blend = pos - idx;

      const bmpA = cached[Math.min(idx, n - 1)];
      const bmpB = cached[Math.min(idx + 1, n - 1)];

      ctx.globalAlpha = 1;
      ctx.drawImage(bmpA, x, y, w, h);

      if (blend > 0.01 && bmpB !== bmpA) {
        ctx.globalAlpha = blend;
        ctx.drawImage(bmpB, x, y, w, h);
        ctx.globalAlpha = 1;
      }
      return;
    }

    // Anaglyph mode: composite left/right as red/cyan
    if (this.anaglyphMode && frames.length >= 2) {
      const left = frames[0];
      const right = frames[1];
      if (!left.bitmap || !right.bitmap) return;

      // Draw left frame, extract, draw right frame, extract, composite
      const tmpCanvas = new OffscreenCanvas(Math.round(w), Math.round(h));
      const tmpCtx = tmpCanvas.getContext('2d')!;

      // Left eye
      const srcL = this.computeSourceRect(left.bitmap, w, h, left.transform);
      tmpCtx.clearRect(0, 0, w, h);
      tmpCtx.drawImage(left.bitmap, srcL.sx, srcL.sy, srcL.sw, srcL.sh, 0, 0, w, h);
      const leftData = tmpCtx.getImageData(0, 0, Math.round(w), Math.round(h));

      // Right eye
      const srcR = this.computeSourceRect(right.bitmap, w, h, right.transform);
      tmpCtx.clearRect(0, 0, w, h);
      tmpCtx.drawImage(right.bitmap, srcR.sx, srcR.sy, srcR.sw, srcR.sh, 0, 0, w, h);
      const rightData = tmpCtx.getImageData(0, 0, Math.round(w), Math.round(h));

      // Composite: red from left, cyan from right
      const out = leftData;
      for (let i = 0; i < out.data.length; i += 4) {
        const lum = out.data[i] * 0.299 + out.data[i + 1] * 0.587 + out.data[i + 2] * 0.114;
        out.data[i] = Math.round(lum);         // Red from left
        out.data[i + 1] = rightData.data[i + 1]; // Green from right
        out.data[i + 2] = rightData.data[i + 2]; // Blue from right
      }
      tmpCtx.putImageData(out, 0, 0);
      ctx.drawImage(tmpCanvas, x, y);
      return;
    }

    // Fallback: raw frame blending (for flip/animation or before processing completes)
    const n = frames.length;
    const pos = viewAngle * (n - 1);
    const idx = Math.floor(pos);
    const blend = pos - idx;

    const frameA = frames[Math.min(idx, n - 1)];
    const frameB = frames[Math.min(idx + 1, n - 1)];

    if (!frameA.bitmap) return;

    const srcA = this.computeSourceRect(frameA.bitmap, w, h, frameA.transform);
    ctx.globalAlpha = 1;
    this.drawWithTransform(ctx, frameA.bitmap, srcA, x, y, w, h, frameA.transform);

    if (blend > 0.01 && frameB.bitmap && frameA.id !== frameB.id) {
      const srcB = this.computeSourceRect(frameB.bitmap, w, h, frameB.transform);
      ctx.globalAlpha = blend;
      this.drawWithTransform(ctx, frameB.bitmap, srcB, x, y, w, h, frameB.transform);
      ctx.globalAlpha = 1;
    }
  }

  private drawWithTransform(
    ctx: CanvasRenderingContext2D,
    bitmap: ImageBitmap,
    src: { sx: number; sy: number; sw: number; sh: number },
    x: number, y: number, w: number, h: number,
    transform?: ImageTransform
  ) {
    const flipH = transform?.flipH ?? false;
    const flipV = transform?.flipV ?? false;
    const rotation = transform?.rotation ?? 0;
    const brightness = transform?.brightness ?? 0;
    const contrast = transform?.contrast ?? 0;
    const saturation = transform?.saturation ?? 0;
    const hasFilter = brightness !== 0 || contrast !== 0 || saturation !== 0;

    if (hasFilter) ctx.filter = buildCSSFilter(brightness, contrast, saturation);

    if (flipH || flipV || rotation) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      if (rotation) ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(bitmap, src.sx, src.sy, src.sw, src.sh, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(bitmap, src.sx, src.sy, src.sw, src.sh, x, y, w, h);
    }

    if (hasFilter) ctx.filter = 'none';
  }

  private computeSourceRect(
    bitmap: ImageBitmap, cellW: number, cellH: number,
    transform?: ImageTransform
  ): { sx: number; sy: number; sw: number; sh: number } {
    const bw = bitmap.width;
    const bh = bitmap.height;
    const srcAspect = bw / bh;
    const dstAspect = cellW / cellH;

    // Cover-fit: find the source rect that fills the cell
    let sw: number, sh: number;
    if (srcAspect > dstAspect) {
      sh = bh;
      sw = bh * dstAspect;
    } else {
      sw = bw;
      sh = bw / dstAspect;
    }

    // Apply scale (higher scale = zoom in = smaller source rect)
    const scale = transform?.scale ?? 1;
    sw /= scale;
    sh /= scale;

    // Center, then apply pan offset
    let sx = (bw - sw) / 2;
    let sy = (bh - sh) / 2;

    const panX = transform?.panX ?? 0;
    const panY = transform?.panY ?? 0;
    sx += panX * (bw - sw) / 2;
    sy += panY * (bh - sh) / 2;

    // Clamp to bitmap bounds
    sx = Math.max(0, Math.min(sx, bw - sw));
    sy = Math.max(0, Math.min(sy, bh - sh));
    sw = Math.min(sw, bw - sx);
    sh = Math.min(sh, bh - sy);

    return { sx, sy, sw, sh };
  }

  private renderDividers(dividers: DividerInfo[], scaledBorder: number) {
    const { ctx } = this;
    const borderEnabled = this.borderConfig.enabled && scaledBorder > 0;

    if (borderEnabled) {
      ctx.save();
      ctx.fillStyle = this.borderConfig.color;
      for (const d of dividers) {
        ctx.fillRect(d.x, d.y, d.w, d.h);
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of dividers) {
        if (d.direction === 'vertical') {
          const x = Math.round(d.x) + 0.5;
          ctx.moveTo(x, d.y);
          ctx.lineTo(x, d.y + d.h);
        } else {
          const y = Math.round(d.y) + 0.5;
          ctx.moveTo(d.x, y);
          ctx.lineTo(d.x + d.w, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderLayoutHandles(dividers: DividerInfo[]) {
    const { ctx } = this;

    for (const d of dividers) {
      const isHovered = this.hoveredDivider === d.splitId;

      ctx.save();
      if (d.direction === 'vertical') {
        const cx = d.x + d.w / 2;
        // Highlight zone
        ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)';
        const zoneW = Math.max(d.w, 8);
        ctx.fillRect(cx - zoneW / 2, d.y, zoneW, d.h);

        // Grab handle pill
        const handleH = Math.min(32, d.h * 0.4);
        const handleW = 6;
        ctx.fillStyle = isHovered ? '#6366f1' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.roundRect(cx - handleW / 2, d.y + d.h / 2 - handleH / 2, handleW, handleH, 3);
        ctx.fill();
      } else {
        const cy = d.y + d.h / 2;
        ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)';
        const zoneH = Math.max(d.h, 8);
        ctx.fillRect(d.x, cy - zoneH / 2, d.w, zoneH);

        const handleW = Math.min(32, d.w * 0.4);
        const handleH = 6;
        ctx.fillStyle = isHovered ? '#6366f1' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.roundRect(d.x + d.w / 2 - handleW / 2, cy - handleH / 2, handleW, handleH, 3);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderOverlay(viewAngle: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const scale = w / this.outputWidthPx;
    const stripPx = this.printStripWidth * scale;
    if (stripPx < 1.5) return;

    const numStrips = Math.ceil(w / stripPx);

    ctx.save();
    for (let i = 0; i < numStrips; i++) {
      const x = i * stripPx;
      const grad = ctx.createLinearGradient(x, 0, x + stripPx, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
      grad.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, stripPx, h);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < numStrips; i++) {
      const x = Math.round(i * stripPx) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const sheenX = viewAngle * w * 1.5 - w * 0.25;
    const sheenGrad = ctx.createLinearGradient(sheenX, 0, sheenX + w * 0.4, h);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    sheenGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.03)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private renderHolographic(viewAngle: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const phase = viewAngle * 360;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.08;
    const grad = ctx.createLinearGradient(w * (viewAngle - 0.3), 0, w * (viewAngle + 0.7), h);
    const hues = [0, 45, 90, 135, 180, 225, 270, 315, 360];
    for (let i = 0; i < hues.length; i++) {
      grad.addColorStop(i / (hues.length - 1), `hsl(${(phase + hues[i]) % 360}, 100%, 60%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.04;
    const bandH = h / 12;
    for (let y = 0; y < h; y += bandH) {
      ctx.fillStyle = `hsl(${(phase + (y / h) * 360) % 360}, 80%, 60%)`;
      ctx.fillRect(0, y, w, bandH * 0.6);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sparkleCount = Math.floor((w * h) / 8000);
    const seed = Math.floor(viewAngle * 20);
    for (let i = 0; i < sparkleCount; i++) {
      const px = (i * 7919 + seed * 104729) % w;
      const py = (i * 6271 + seed * 15731) % h;
      if ((i * 3 + seed) % 5 !== 0) continue;
      ctx.globalAlpha = Math.max(0, 0.15 + 0.1 * Math.sin(i * 0.7 + phase * 0.02));
      ctx.fillStyle = `hsl(${(phase + i * 37) % 360}, 100%, 80%)`;
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'color-dodge';
    ctx.globalAlpha = 0.03;
    const sheenGrad = ctx.createRadialGradient(w * viewAngle, h * 0.4, 0, w * viewAngle, h * 0.4, w * 0.6);
    const sheenHue = (phase + 180) % 360;
    sheenGrad.addColorStop(0, `hsl(${sheenHue}, 100%, 70%)`);
    sheenGrad.addColorStop(0.5, `hsl(${(sheenHue + 60) % 360}, 80%, 60%)`);
    sheenGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy() {
    this.clearProcessedCache();
    this.sections = [];
  }
}
