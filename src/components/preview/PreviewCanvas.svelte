<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { PreviewRenderer } from '../../lib/preview/PreviewRenderer.js';
  import type { DividerInfo } from '../../lib/types/index.js';

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let renderer: PreviewRenderer | null = null;
  let viewAngle = $state(0.5);
  let showOverlay = $state(true);
  let showHolo = $state(false);
  let isFullscreen = $state(false);

  // Drag state
  let dragging: DividerInfo | null = $state(null);
  let canvasCursor = $state('default');

  const hasSplits = $derived(layoutStore.sectionCount > 1);

  $effect(() => {
    if (canvas && !renderer) {
      renderer = new PreviewRenderer(canvas);
    }
    return () => {
      renderer?.destroy();
      renderer = null;
    };
  });

  // Pass tree + sections to renderer
  $effect(() => {
    if (renderer) {
      renderer.setTree(layoutStore.root, layoutStore.sections, layoutStore.selectedId);
      renderer.render(viewAngle);
    }
  });

  // Sync layout mode
  $effect(() => {
    if (renderer) {
      renderer.setLayoutMode(layoutStore.layoutMode && hasSplits);
      renderer.render(viewAngle);
    }
  });

  $effect(() => {
    projectState.outputWidthInches;
    projectState.outputHeightInches;
    projectState.dpi;
    projectState.lpi;
    handleResize();
  });

  $effect(() => {
    if (renderer) {
      renderer.setOverlay(showOverlay, projectState.outputWidthPx, projectState.stripWidth);
      renderer.setHolographic(showHolo);
      renderer.render(viewAngle);
    }
  });

  $effect(() => {
    if (renderer) {
      renderer.setBorder(projectState.border);
      renderer.render(viewAngle);
    }
  });

  $effect(() => {
    const handler = () => {
      isFullscreen = !!document.fullscreenElement;
      setTimeout(handleResize, 50);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  });

  function handleResize() {
    if (!container || !renderer) return;
    const rect = container.getBoundingClientRect();
    const aspectRatio = projectState.outputWidthInches / projectState.outputHeightInches;
    let w = rect.width;
    let h = w / aspectRatio;
    if (h > rect.height) {
      h = rect.height;
      w = h * aspectRatio;
    }
    renderer.resize(Math.floor(w), Math.floor(h));
    renderer.render(viewAngle);
  }

  // --- Hit-testing ---
  const HIT_ZONE = 12;

  function canvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function hitTestDivider(cx: number, cy: number): DividerInfo | null {
    const dividers = renderer?.getDividers() ?? [];
    for (const d of dividers) {
      if (d.direction === 'vertical') {
        const mid = d.x + d.w / 2;
        if (Math.abs(cx - mid) < HIT_ZONE && cy >= d.y && cy <= d.y + d.h) return d;
      } else {
        const mid = d.y + d.h / 2;
        if (Math.abs(cy - mid) < HIT_ZONE && cx >= d.x && cx <= d.x + d.w) return d;
      }
    }
    return null;
  }

  function hitTestCell(cx: number, cy: number): string | null {
    const cells = renderer?.getCells() ?? new Map();
    for (const [id, rect] of cells) {
      if (cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h) {
        return id;
      }
    }
    return null;
  }

  function applyDrag(pos: { x: number; y: number }) {
    if (!dragging || !renderer) return;

    // Look up the bounding rect of the split node being dragged
    const splitRects = renderer.getSplitRects();
    const bounds = splitRects.get(dragging.splitId);
    if (!bounds) return;

    if (dragging.direction === 'vertical') {
      const ratio = (pos.x - bounds.x) / bounds.w;
      layoutStore.updateSplitRatio(dragging.splitId, ratio);
    } else {
      const ratio = (pos.y - bounds.y) / bounds.h;
      layoutStore.updateSplitRatio(dragging.splitId, ratio);
    }
  }

  // --- Mouse handlers ---
  function handleMouseMove(e: MouseEvent) {
    if (!renderer || !layoutStore.layoutMode || !hasSplits) return;

    const pos = canvasCoords(e);

    if (dragging) {
      applyDrag(pos);
      return;
    }

    const hit = hitTestDivider(pos.x, pos.y);
    renderer.setHoveredDivider(hit?.splitId ?? null);
    canvasCursor = hit
      ? (hit.direction === 'vertical' ? 'col-resize' : 'row-resize')
      : 'default';
    renderer.render(viewAngle);
  }

  function handleMouseDown(e: MouseEvent) {
    if (!layoutStore.layoutMode || !hasSplits) return;
    const pos = canvasCoords(e);

    const divHit = hitTestDivider(pos.x, pos.y);
    if (divHit) {
      e.preventDefault();
      dragging = divHit;
      return;
    }

    // Click on cell to select it
    const cellId = hitTestCell(pos.x, pos.y);
    if (cellId) {
      layoutStore.selectSection(cellId);
    }
  }

  function handleMouseUp() {
    dragging = null;
  }

  function handleDblClick(e: MouseEvent) {
    if (!layoutStore.layoutMode || !hasSplits) return;
    const pos = canvasCoords(e);
    const hit = hitTestDivider(pos.x, pos.y);
    if (hit) {
      layoutStore.updateSplitRatio(hit.splitId, 0.5);
    }
  }

  // --- Touch handlers ---
  function handleTouchStart(e: TouchEvent) {
    if (!layoutStore.layoutMode || !hasSplits || e.touches.length !== 1) return;
    const pos = canvasCoords(e.touches[0]);
    const hit = hitTestDivider(pos.x, pos.y);
    if (hit) {
      e.preventDefault();
      dragging = hit;
      return;
    }
    const cellId = hitTestCell(pos.x, pos.y);
    if (cellId) layoutStore.selectSection(cellId);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!dragging || e.touches.length !== 1) return;
    e.preventDefault();
    applyDrag(canvasCoords(e.touches[0]));
  }

  function handleTouchEnd() {
    dragging = null;
  }

  function handleScrub(e: Event) {
    viewAngle = parseFloat((e.target as HTMLInputElement).value);
    renderer?.render(viewAngle);
  }

  async function toggleFullscreen() {
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      await wrapper.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }
</script>

<svelte:window onresize={handleResize} onmouseup={handleMouseUp} />

<div class="preview-wrapper" class:fullscreen={isFullscreen} bind:this={wrapper}>
  <div class="preview-container" bind:this={container}>
    <canvas
      bind:this={canvas}
      class="preview-canvas"
      class:layout-mode={layoutStore.layoutMode}
      style="cursor: {canvasCursor};"
      width="400"
      height="600"
      onmousemove={handleMouseMove}
      onmousedown={handleMouseDown}
      ondblclick={handleDblClick}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    ></canvas>
  </div>

  {#if layoutStore.layoutMode}
    <div class="layout-toolbar">
      <button
        class="toolbar-btn"
        onclick={() => layoutStore.selectedId && layoutStore.splitSection(layoutStore.selectedId, 'vertical')}
        disabled={!layoutStore.selectedId}
        title="Split selected cell left / right"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="1" width="18" height="18" rx="1" />
          <line x1="10" y1="1" x2="10" y2="19" />
        </svg>
        Split ↔
      </button>
      <button
        class="toolbar-btn"
        onclick={() => layoutStore.selectedId && layoutStore.splitSection(layoutStore.selectedId, 'horizontal')}
        disabled={!layoutStore.selectedId}
        title="Split selected cell top / bottom"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="1" width="18" height="18" rx="1" />
          <line x1="1" y1="10" x2="19" y2="10" />
        </svg>
        Split ↕
      </button>
      <button
        class="toolbar-btn danger"
        onclick={() => layoutStore.selectedId && layoutStore.removeSection(layoutStore.selectedId)}
        disabled={!layoutStore.canRemoveSelected}
        title="Remove selected cell"
      >
        ✕ Remove
      </button>
      <div class="toolbar-spacer"></div>
      <button
        class="toolbar-btn"
        onclick={() => layoutStore.resetRatios()}
        title="Reset all splits to equal"
      >
        Reset
      </button>
      <button
        class="toolbar-btn done"
        onclick={() => layoutStore.toggleLayoutMode()}
      >
        Done
      </button>
    </div>
  {/if}

  <div class="preview-controls">
    <input
      class="scrub-bar"
      type="range"
      min="0"
      max="1"
      step="0.002"
      value={viewAngle}
      oninput={handleScrub}
      title="Scrub through animation"
    />

    <div class="control-buttons">
      <button
        class="btn-icon overlay-toggle"
        class:active={showOverlay}
        onclick={() => (showOverlay = !showOverlay)}
        title={showOverlay ? 'Hide lens overlay' : 'Show lens overlay'}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
          {#if showOverlay}
            <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
            <circle cx="10" cy="10" r="3" />
          {:else}
            <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
            <circle cx="10" cy="10" r="3" />
            <line x1="3" y1="17" x2="17" y2="3" />
          {/if}
        </svg>
      </button>

      <button
        class="btn-icon holo-toggle"
        class:active={showHolo}
        onclick={() => (showHolo = !showHolo)}
        title={showHolo ? 'Hide holographic overlay' : 'Show holographic overlay'}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke-width="1.5">
          <defs>
            <linearGradient id="holo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ff6b6b" />
              <stop offset="33%" stop-color="#51cf66" />
              <stop offset="66%" stop-color="#339af0" />
              <stop offset="100%" stop-color="#cc5de8" />
            </linearGradient>
          </defs>
          <polygon points="10,1 12.5,7.5 19,7.5 13.5,12 15.5,19 10,14.5 4.5,19 6.5,12 1,7.5 7.5,7.5"
            stroke={showHolo ? 'url(#holo-grad)' : 'currentColor'}
            fill={showHolo ? 'url(#holo-grad)' : 'none'}
            fill-opacity={showHolo ? 0.3 : 0}
          />
        </svg>
      </button>

      <button
        class="btn-icon fullscreen-toggle"
        onclick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
          {#if isFullscreen}
            <polyline points="6,1 1,1 1,6" />
            <polyline points="14,1 19,1 19,6" />
            <polyline points="6,19 1,19 1,14" />
            <polyline points="14,19 19,19 19,14" />
          {:else}
            <polyline points="1,6 1,1 6,1" />
            <polyline points="14,1 19,1 19,6" />
            <polyline points="1,14 1,19 6,19" />
            <polyline points="19,14 19,19 14,19" />
          {/if}
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .preview-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    gap: 8px;
    overflow: hidden;
  }

  .preview-wrapper.fullscreen {
    background: var(--bg, #0e0e1a);
    padding: 24px;
  }

  .preview-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    width: 100%;
    position: relative;
  }

  .preview-canvas {
    border: 1px solid var(--secondary);
    border-radius: 4px;
    max-width: 100%;
    max-height: 100%;
  }

  .preview-canvas.layout-mode {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  /* --- Layout toolbar --- */
  .layout-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 5px;
    color: var(--text-secondary);
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text);
  }

  .toolbar-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .toolbar-btn.danger:hover:not(:disabled) {
    background: rgba(233, 69, 96, 0.12);
    color: var(--accent);
  }

  .toolbar-btn.done {
    background: var(--accent);
    color: #fff;
  }

  .toolbar-btn.done:hover {
    opacity: 0.9;
  }

  .toolbar-spacer {
    flex: 1;
  }

  /* --- Controls --- */
  .preview-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: var(--surface);
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
  }

  .scrub-bar {
    flex: 1;
    cursor: pointer;
    accent-color: var(--accent);
    height: 6px;
  }

  .control-buttons {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .overlay-toggle,
  .holo-toggle,
  .fullscreen-toggle {
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .overlay-toggle.active,
  .holo-toggle.active {
    color: var(--accent);
  }

  .fullscreen-toggle:hover {
    color: var(--text);
  }
</style>
