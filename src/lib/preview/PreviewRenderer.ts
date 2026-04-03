import type { ImageFrame, BorderConfig } from '../types/index.js';
import type { LayoutSection } from '../types/layout.js';

export class PreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frames: ImageFrame[] = [];
  private overlayEnabled = false;
  private holoEnabled = false;
  private outputWidthPx = 1200;
  private printStripWidth = 5;

  // Section-aware state
  private sections: LayoutSection[] = [];
  private cols = 1;
  private rows = 1;
  private selectedSectionId: string | null = null;
  private borderConfig: BorderConfig = { enabled: false, widthPx: 4, color: '#000000' };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setFrames(frames: ImageFrame[]) {
    this.frames = frames;
  }

  setSections(sections: LayoutSection[], cols: number, rows: number, selectedId: string | null) {
    this.sections = sections;
    this.cols = cols;
    this.rows = rows;
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

  setHolographic(enabled: boolean) {
    this.holoEnabled = enabled;
  }

  render(viewAngle: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    if (this.sections.length === 0) {
      ctx.fillStyle = '#8892a4';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload images to preview', w / 2, h / 2);
      return;
    }

    // Calculate border size in preview pixels
    const borderEnabled = this.borderConfig.enabled && (this.cols > 1 || this.rows > 1);
    const scale = w / this.outputWidthPx;
    const scaledBorder = borderEnabled ? this.borderConfig.widthPx * scale : 0;

    const totalBorderW = scaledBorder * (this.cols - 1);
    const totalBorderH = scaledBorder * (this.rows - 1);
    const cellW = (w - totalBorderW) / this.cols;
    const cellH = (h - totalBorderH) / this.rows;

    // Render each section in its grid cell
    for (const section of this.sections) {
      const x = section.col * (cellW + scaledBorder);
      const y = section.row * (cellH + scaledBorder);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellW, cellH);
      ctx.clip();

      if (section.frames.length === 0) {
        // Empty section placeholder
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.fillStyle = '#8892a4';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', x + cellW / 2, y + cellH / 2);
      } else {
        // Render frames with blending
        this.renderSectionFrames(section.frames, viewAngle, x, y, cellW, cellH);
      }

      ctx.restore();
    }

    // Draw grid lines / borders between sections
    if (this.cols > 1 || this.rows > 1) {
      this.renderGridLines(cellW, cellH, scaledBorder);
    }

    // Lenticular overlay spans full canvas (one lens sheet)
    if (this.overlayEnabled) {
      this.renderOverlay(viewAngle);
    }

    // Holographic overlay spans full canvas
    if (this.holoEnabled) {
      this.renderHolographic(viewAngle);
    }
  }

  private renderSectionFrames(
    frames: ImageFrame[],
    viewAngle: number,
    x: number, y: number,
    w: number, h: number
  ) {
    const { ctx } = this;
    const n = frames.length;

    const pos = viewAngle * (n - 1);
    const idx = Math.floor(pos);
    const blend = pos - idx;

    const frameA = frames[Math.min(idx, n - 1)];
    const frameB = frames[Math.min(idx + 1, n - 1)];

    if (!frameA.bitmap) return;

    ctx.globalAlpha = 1;
    ctx.drawImage(frameA.bitmap, x, y, w, h);

    if (blend > 0.01 && frameB.bitmap && frameA.id !== frameB.id) {
      ctx.globalAlpha = blend;
      ctx.drawImage(frameB.bitmap, x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private renderGridLines(cellW: number, cellH: number, scaledBorder: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const borderEnabled = this.borderConfig.enabled && scaledBorder > 0;

    if (borderEnabled) {
      // Draw filled border rectangles
      ctx.save();
      ctx.fillStyle = this.borderConfig.color;
      for (let c = 1; c < this.cols; c++) {
        const x = c * (cellW + scaledBorder) - scaledBorder;
        ctx.fillRect(x, 0, scaledBorder, h);
      }
      for (let r = 1; r < this.rows; r++) {
        const y = r * (cellH + scaledBorder) - scaledBorder;
        ctx.fillRect(0, y, w, scaledBorder);
      }
      ctx.restore();
    } else {
      // Default thin hairline dividers
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 1; c < this.cols; c++) {
        const x = Math.round(c * cellW) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let r = 1; r < this.rows; r++) {
        const y = Math.round(r * cellH) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Selected section highlight
    if (this.selectedSectionId) {
      const sel = this.sections.find(s => s.id === this.selectedSectionId);
      if (sel) {
        const sx = sel.col * (cellW + scaledBorder);
        const sy = sel.row * (cellH + scaledBorder);
        ctx.save();
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, cellW - 2, cellH - 2);
        ctx.restore();
      }
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
      const edgeAlpha = 0.12;
      grad.addColorStop(0, `rgba(0, 0, 0, ${edgeAlpha})`);
      grad.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, `rgba(0, 0, 0, ${edgeAlpha})`);
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
    this.frames = [];
    this.sections = [];
  }
}
