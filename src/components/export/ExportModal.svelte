<script lang="ts">
  import { projectState, inchesToUnit, unitLabel } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { runExport, EXPORT_FORMATS } from '../../lib/engine/run-export.js';
  import type { ExportFormat } from '../../lib/engine/run-export.js';
  import { exportOverlayPng } from '../../lib/engine/export-overlay.js';
  import { exportAnaglyphPng } from '../../lib/engine/export-anaglyph.js';
  import { normalizeFrames } from '../../lib/engine/image-utils.js';
  import { formatFileSize, downloadBlob } from '../../lib/utils/file-helpers.js';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let selectedFormat = $state<ExportFormat>('tiff');
  let includeOverlay = $state(false);
  let includeAnaglyph = $state(false);
  let includeBarrier = $state(false);

  const hasEnoughForAnaglyph = $derived(
    layoutStore.sections.some(s => s.frames.length >= 2)
  );

  const totalFrames = $derived(
    layoutStore.sections.reduce((sum, s) => Math.max(sum, s.frames.length), 0)
  );

  const outputW = $derived(projectState.outputWidthPx);
  const outputH = $derived(projectState.outputHeightPx);
  const dispW = $derived(projectState.displayWidth);
  const dispH = $derived(projectState.displayHeight);
  const unit = $derived(unitLabel(projectState.unit));

  // Rough file size estimate
  const estimatedSize = $derived.by(() => {
    const pixels = outputW * outputH;
    switch (selectedFormat) {
      case 'tiff': return pixels * 4 + 200;    // RGBA uncompressed + header
      case 'bmp':  return pixels * 4 + 150;    // BGRA uncompressed + header
      case 'png':  return pixels * 2;           // ~50% compression estimate
      case 'pdf':  return pixels * 3 + 500;     // RGB uncompressed + PDF overhead
    }
  });

  async function handleExport() {
    const wantOverlay = includeOverlay && totalFrames > 1;
    const wantBarrier = includeBarrier && totalFrames > 1;
    const wantAnaglyph = includeAnaglyph && hasEnoughForAnaglyph;
    const lpi = projectState.lpi;
    const dpi = projectState.dpi;
    const w = projectState.outputWidthPx;
    const h = projectState.outputHeightPx;
    const frames = totalFrames;
    // Capture section data for anaglyph before closing
    const anaglyphSection = wantAnaglyph
      ? layoutStore.sections.find(s => s.frames.length >= 2)
      : null;
    open = false;
    await runExport(selectedFormat);
    if (wantOverlay) {
      const blob = await exportOverlayPng(w, h, lpi, dpi, frames);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `tilt-overlay-${ts}.png`);
    }
    if (wantBarrier) {
      const blob = await exportOverlayPng(w, h, lpi, dpi, frames);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `tilt-barrier-${ts}.png`);
    }
    if (wantAnaglyph && anaglyphSection) {
      const normalized = normalizeFrames(anaglyphSection.frames.slice(0, 2), w, h);
      const sorted = [...normalized].sort((a, b) => a.order - b.order);
      const blob = await exportAnaglyphPng(sorted[0].imageData, sorted[1].imageData);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `tilt-anaglyph-${ts}.png`);
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus a11y_no_noninteractive_tabindex -->
  <div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Export" tabindex="-1">
    <div class="modal">
      <div class="modal-header">
        <h2>Export Image</h2>
        <button class="btn-icon" onclick={() => (open = false)} title="Close">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Output summary -->
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Size</span>
            <span class="summary-value">{dispW} &times; {dispH} {unit}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Resolution</span>
            <span class="summary-value">{outputW} &times; {outputH} px @ {projectState.dpi} DPI</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Interlacing</span>
            <span class="summary-value">{projectState.lpi} LPI &bull; {projectState.stripWidth} px/lenticule &bull; {layoutStore.sectionCount} section{layoutStore.sectionCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <!-- Format selector -->
        <div class="formats">
          <span class="section-label">Format</span>
          <div class="format-list">
            {#each EXPORT_FORMATS as fmt}
              <button
                class="format-option"
                class:active={selectedFormat === fmt.id}
                onclick={() => (selectedFormat = fmt.id)}
              >
                <div class="format-top">
                  <span class="format-name">
                    {fmt.label}
                    {#if fmt.recommended}
                      <span class="badge">Recommended</span>
                    {/if}
                  </span>
                  <span class="format-ext">{fmt.ext}</span>
                </div>
                <p class="format-desc">{fmt.description}</p>
              </button>
            {/each}
          </div>
        </div>

        <!-- Estimated file size -->
        <div class="estimate">
          <span class="estimate-label">Estimated file size</span>
          <span class="estimate-value">~{formatFileSize(estimatedSize)}</span>
        </div>

        <!-- Extra outputs -->
        <div class="extras">
          <span class="section-label">Extras</span>
          <label class="overlay-option">
            <input type="checkbox" bind:checked={includeOverlay} />
            <div class="overlay-text">
              <span class="overlay-label">Scanimation overlay</span>
              <span class="overlay-desc">Striped overlay PNG — print on transparency, slide across to animate</span>
            </div>
          </label>
          <label class="overlay-option">
            <input type="checkbox" bind:checked={includeBarrier} />
            <div class="overlay-text">
              <span class="overlay-label">Parallax barrier mask</span>
              <span class="overlay-desc">Slit mask PNG — mount at fixed distance for glasses-free 3D viewing</span>
            </div>
          </label>
          <label class="overlay-option" class:disabled={!hasEnoughForAnaglyph}>
            <input type="checkbox" bind:checked={includeAnaglyph} disabled={!hasEnoughForAnaglyph} />
            <div class="overlay-text">
              <span class="overlay-label">Anaglyph 3D (red/cyan)</span>
              <span class="overlay-desc">{hasEnoughForAnaglyph ? 'Combines first 2 frames into a red/cyan 3D image — viewable with 3D glasses' : 'Needs at least 2 frames'}</span>
            </div>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => (open = false)}>Cancel</button>
        <button
          class="btn-primary"
          onclick={handleExport}
          disabled={!layoutStore.isAllReady || projectState.isProcessing}
        >
          {#if projectState.isProcessing}
            Exporting... {projectState.processProgress}%
          {:else}
            Export as {EXPORT_FORMATS.find(f => f.id === selectedFormat)?.label}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .modal {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 24px 48px -12px var(--shadow);
    width: 480px;
    max-width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }

  .summary {
    background: var(--surface);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .summary-label {
    color: var(--text-muted);
  }

  .summary-value {
    color: var(--text);
    font-weight: 500;
    font-family: 'Space Grotesk', monospace;
  }

  .formats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .format-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .format-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 2px solid var(--border);
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
  }

  .format-option:hover {
    border-color: var(--border-light);
    background: var(--surface);
  }

  .format-option.active {
    border-color: var(--accent);
    background: var(--accent-subtle);
  }

  .format-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .format-name {
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-muted);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .format-ext {
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'Space Grotesk', monospace;
  }

  .format-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
    margin: 0;
  }

  .format-option.active .format-desc {
    color: var(--text-secondary);
  }

  .estimate {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding: 8px 0;
  }

  .estimate-label {
    color: var(--text-muted);
  }

  .estimate-value {
    color: var(--text-secondary);
    font-family: 'Space Grotesk', monospace;
    font-weight: 500;
  }

  .overlay-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .overlay-option:hover:not(.disabled) {
    background: var(--surface-hover);
  }

  .overlay-option.disabled {
    opacity: 0.5;
    cursor: default;
  }

  .extras {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .overlay-option input[type="checkbox"] {
    margin-top: 2px;
    accent-color: var(--accent);
  }

  .overlay-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .overlay-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
  }

  .overlay-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid var(--border);
  }
</style>
