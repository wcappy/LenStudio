import { projectState } from '../stores/project.svelte.js';
import { layoutStore } from '../stores/layout.svelte.js';
import { normalizeFrames } from './image-utils.js';
import { interlaceFrames } from './interlace.js';
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

/**
 * Run the full export pipeline with per-section interlacing.
 * Each section is interlaced independently, then composited onto the full output canvas.
 */
export async function runExport(format: ExportFormat): Promise<void> {
  if (!layoutStore.isAllReady) {
    alert('Each section needs at least 2 images before exporting.');
    return;
  }

  const { outputWidthPx, outputHeightPx, lpi, dpi } = projectState;
  const { sections, preset } = layoutStore;

  try {
    projectState.isProcessing = true;
    projectState.processProgress = 0;

    // Create full output canvas
    const outputCanvas = new OffscreenCanvas(outputWidthPx, outputHeightPx);
    const outputCtx = outputCanvas.getContext('2d')!;

    const sectionW = Math.floor(outputWidthPx / preset.cols);
    const sectionH = Math.floor(outputHeightPx / preset.rows);
    const totalSections = sections.length;

    for (let i = 0; i < totalSections; i++) {
      const section = sections[i];
      const baseProgress = Math.round((i / totalSections) * 90);
      projectState.processProgress = baseProgress;

      // Normalize this section's frames to section dimensions
      const normalized = normalizeFrames(section.frames, sectionW, sectionH);
      const frameData = normalized
        .sort((a, b) => a.order - b.order)
        .map(f => f.imageData);

      // Interlace this section
      const interlaced = interlaceFrames(frameData, lpi, dpi, (pct) => {
        projectState.processProgress = baseProgress + Math.round((pct / totalSections) * 0.9);
      });

      // Composite onto output canvas at section position
      const x = section.col * sectionW;
      const y = section.row * sectionH;

      const tempCanvas = new OffscreenCanvas(interlaced.width, interlaced.height);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(interlaced, 0, 0);
      outputCtx.drawImage(tempCanvas, x, y, sectionW, sectionH);
    }

    // Get final composited ImageData
    projectState.processProgress = 90;
    const finalImageData = outputCtx.getImageData(0, 0, outputWidthPx, outputHeightPx);

    // Encode in chosen format
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

    // Download
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
