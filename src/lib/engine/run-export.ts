import { projectState } from '../stores/project.svelte.js';
import { layoutStore } from '../stores/layout.svelte.js';
import { computeTreeLayout } from '../utils/layout-tree.js';
import { normalizeFrames } from './image-utils.js';
import { interlaceFrames } from './interlace.js';
import { applyEffect } from './effects/apply-effect.js';
import { exportPng } from './export.js';
import { exportTiff } from './export-tiff.js';
import { exportBmp } from './export-bmp.js';
import { exportPdf } from './export-pdf.js';
import { downloadBlob } from '../utils/file-helpers.js';

export type ExportFormat = 'tiff' | 'png' | 'bmp' | 'pdf';

export interface ExportFormatInfo {
  id: ExportFormat;
  label: string;
  ext: string;
  description: string;
  recommended?: boolean;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  {
    id: 'tiff',
    label: 'TIFF',
    ext: '.tiff',
    description: 'Lossless, industry standard for print. DPI metadata always respected.',
    recommended: true,
  },
  {
    id: 'png',
    label: 'PNG',
    ext: '.png',
    description: 'Lossless, widely supported. Some RIP software may ignore DPI metadata.',
  },
  {
    id: 'pdf',
    label: 'PDF',
    ext: '.pdf',
    description: 'Print-ready document at exact physical dimensions. Universal compatibility.',
  },
  {
    id: 'bmp',
    label: 'BMP',
    ext: '.bmp',
    description: 'Uncompressed bitmap with DPI. Large files, maximum compatibility.',
  },
];

export async function runExport(format: ExportFormat): Promise<void> {
  if (!layoutStore.isAllReady) {
    alert('Some sections need more images before exporting.');
    return;
  }

  const { outputWidthPx, outputHeightPx, lpi, dpi } = projectState;
  const { sections, root } = layoutStore;

  try {
    projectState.isProcessing = true;
    projectState.processProgress = 0;

    const outputCanvas = new OffscreenCanvas(outputWidthPx, outputHeightPx);
    const outputCtx = outputCanvas.getContext('2d')!;

    // Border-aware tree layout
    const { border } = projectState;
    const hasSplits = sections.length > 1;
    const borderPx = border.enabled && hasSplits ? border.widthPx : 0;
    const { cells } = computeTreeLayout(root, 0, 0, outputWidthPx, outputHeightPx, borderPx);

    // Fill background with border color
    if (borderPx > 0) {
      outputCtx.fillStyle = border.color;
      outputCtx.fillRect(0, 0, outputWidthPx, outputHeightPx);
    }

    const totalSections = sections.length;

    for (let i = 0; i < totalSections; i++) {
      const section = sections[i];
      const rect = cells.get(section.id);
      if (!rect) continue;

      const baseProgress = Math.round((i / totalSections) * 90);
      projectState.processProgress = baseProgress;

      const sectionW = Math.floor(rect.w);
      const sectionH = Math.floor(rect.h);

      const normalized = normalizeFrames(section.frames, sectionW, sectionH);
      const frameData = applyEffect(normalized, section.effectType, section.effectParams);

      const interlaced = interlaceFrames(frameData, lpi, dpi, (pct) => {
        projectState.processProgress = baseProgress + Math.round((pct / totalSections) * 0.9);
      });

      const x = Math.round(rect.x);
      const y = Math.round(rect.y);

      const tempCanvas = new OffscreenCanvas(interlaced.width, interlaced.height);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(interlaced, 0, 0);
      outputCtx.drawImage(tempCanvas, x, y, sectionW, sectionH);
    }

    projectState.processProgress = 90;
    const finalImageData = outputCtx.getImageData(0, 0, outputWidthPx, outputHeightPx);

    let blob: Blob;
    const info = EXPORT_FORMATS.find(f => f.id === format)!;

    switch (format) {
      case 'tiff':
        blob = exportTiff(finalImageData, dpi);
        break;
      case 'png':
        blob = await exportPng(finalImageData, dpi);
        break;
      case 'bmp':
        blob = exportBmp(finalImageData, dpi);
        break;
      case 'pdf':
        blob = await exportPdf(finalImageData, dpi);
        break;
    }

    projectState.processProgress = 100;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    downloadBlob(blob, `lenticular-${timestamp}${info.ext}`);
  } catch (err) {
    console.error('Export failed:', err);
    alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    projectState.isProcessing = false;
    projectState.processProgress = 0;
  }
}
