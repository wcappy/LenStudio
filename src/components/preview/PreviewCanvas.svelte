<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { PreviewRenderer } from '../../lib/preview/PreviewRenderer.js';
  import type { DividerInfo, ImageTransform } from '../../lib/types/index.js';

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let renderer: PreviewRenderer | null = null;
  let viewAngle = $state(0.5);
  let showOverlay = $state(true);
  let showHolo = $state(false);
  let isFullscreen = $state(false);

  // Layout mode drag state
  let dragging: DividerInfo | null = $state(null);
  // Image mode drag state
  let imageDragging = $state(false);
  let lastDragPos: { x: number; y: number } | null = null;
  // Pinch-to-zoom state
  let lastPinchDist: number | null = null;

  let canvasCursor = $state('default');

  const hasSplits = $derived(layoutStore.sectionCount > 1);

  // Current frame for image mode
  const currentFrame = $derived.by(() => {
    const section = layoutStore.selectedSection;
    if (!section || section.frames.length === 0) return null;
    const n = section.frames.length;
    const idx = Math.round(viewAngle * (n - 1));
    return section.frames[Math.min(idx, n - 1)] ?? null;
  });

  const currentScale = $derived(
    currentFrame?.transform?.scale ?? 1
  );

  $effect(() => {
    if (canvas && !renderer) {
      renderer = new PreviewRenderer(canvas);
    }
    return () => {
      renderer?.destroy();
      renderer = null;
    };
  });

  $effect(() => {
    if (renderer) {
      renderer.setTree(layoutStore.root, layoutStore.sections, layoutStore.selectedId);
      renderer.render(viewAngle);
    }
  });

  $effect(() => {
    if (renderer) {
      renderer.setLayoutMode(layoutStore.layoutMode && hasSplits);
      renderer.setImageMode(layoutStore.imageMode);
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

  // --- Layout mode drag ---
  function applyLayoutDrag(pos: { x: number; y: number }) {
    if (!dragging || !renderer) return;
    const splitRects = renderer.getSplitRects();
    const bounds = splitRects.get(dragging.splitId);
    if (!bounds) return;

    if (dragging.direction === 'vertical') {
      layoutStore.updateSplitRatio(dragging.splitId, (pos.x - bounds.x) / bounds.w);
    } else {
      layoutStore.updateSplitRatio(dragging.splitId, (pos.y - bounds.y) / bounds.h);
    }
  }

  // --- Image mode pan ---
  function applyImagePan(pos: { x: number; y: number }) {
    if (!lastDragPos || !currentFrame || !layoutStore.selectedSection) return;
    const section = layoutStore.selectedSection;
    const cellRect = renderer?.getCells().get(section.id);
    if (!cellRect) return;

    const dx = pos.x - lastDragPos.x;
    const dy = pos.y - lastDragPos.y;
    lastDragPos = pos;

    const t = currentFrame.transform ?? { scale: 1, panX: 0, panY: 0 };
    const panX = Math.max(-1, Math.min(1, t.panX + (dx / cellRect.w) * 2));
    const panY = Math.max(-1, Math.min(1, t.panY + (dy / cellRect.h) * 2));

    layoutStore.setFrameTransform(section.id, currentFrame.id, {
      scale: t.scale,
      panX,
      panY,
    });
  }

  // --- Mouse handlers ---
  function handleMouseMove(e: MouseEvent) {
    if (!renderer) return;

    // Image mode: drag to pan
    if (layoutStore.imageMode && imageDragging) {
      applyImagePan(canvasCoords(e));
      return;
    }

    // Layout mode: divider hover/drag
    if (layoutStore.layoutMode && hasSplits) {
      const pos = canvasCoords(e);
      if (dragging) {
        applyLayoutDrag(pos);
        return;
      }
      const hit = hitTestDivider(pos.x, pos.y);
      renderer.setHoveredDivider(hit?.splitId ?? null);
      canvasCursor = hit
        ? (hit.direction === 'vertical' ? 'col-resize' : 'row-resize')
        : 'default';
      renderer.render(viewAngle);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const pos = canvasCoords(e);

    // Image mode: start pan drag
    if (layoutStore.imageMode) {
      const cellId = hitTestCell(pos.x, pos.y);
      if (cellId) {
        layoutStore.selectSection(cellId);
      }
      if (currentFrame) {
        e.preventDefault();
        imageDragging = true;
        lastDragPos = pos;
        canvasCursor = 'grabbing';
      }
      return;
    }

    // Layout mode
    if (layoutStore.layoutMode && hasSplits) {
      const divHit = hitTestDivider(pos.x, pos.y);
      if (divHit) {
        e.preventDefault();
        dragging = divHit;
        return;
      }
      const cellId = hitTestCell(pos.x, pos.y);
      if (cellId) layoutStore.selectSection(cellId);
    }
  }

  function handleMouseUp() {
    dragging = null;
    if (imageDragging) {
      imageDragging = false;
      lastDragPos = null;
      canvasCursor = layoutStore.imageMode ? 'grab' : 'default';
    }
  }

  function handleWheel(e: WheelEvent) {
    if (!layoutStore.imageMode || !currentFrame || !layoutStore.selectedSection) return;
    e.preventDefault();

    const section = layoutStore.selectedSection;
    const t = currentFrame.transform ?? { scale: 1, panX: 0, panY: 0 };
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const scale = Math.max(0.5, Math.min(3, t.scale + delta));

    layoutStore.setFrameTransform(section.id, currentFrame.id, {
      ...t,
      scale,
    });
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
  function pinchDistance(e: TouchEvent): number {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(e: TouchEvent) {
    if (layoutStore.imageMode) {
      if (e.touches.length === 2) {
        // Start pinch-to-zoom
        e.preventDefault();
        lastPinchDist = pinchDistance(e);
        imageDragging = false;
        lastDragPos = null;
        return;
      }
      if (e.touches.length === 1) {
        const pos = canvasCoords(e.touches[0]);
        const cellId = hitTestCell(pos.x, pos.y);
        if (cellId) layoutStore.selectSection(cellId);
        if (currentFrame) {
          e.preventDefault();
          imageDragging = true;
          lastDragPos = pos;
        }
        return;
      }
    }

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
    if (layoutStore.imageMode) {
      // Pinch-to-zoom
      if (e.touches.length === 2 && lastPinchDist !== null && currentFrame && layoutStore.selectedSection) {
        e.preventDefault();
        const dist = pinchDistance(e);
        const delta = (dist - lastPinchDist) / 150;
        lastPinchDist = dist;

        const section = layoutStore.selectedSection;
        const t = currentFrame.transform ?? { scale: 1, panX: 0, panY: 0 };
        const scale = Math.max(0.5, Math.min(3, t.scale + delta));
        layoutStore.setFrameTransform(section.id, currentFrame.id, { ...t, scale });
        return;
      }

      // Single-finger pan
      if (imageDragging && e.touches.length === 1) {
        e.preventDefault();
        applyImagePan(canvasCoords(e.touches[0]));
        return;
      }
    }

    if (dragging && e.touches.length === 1) {
      e.preventDefault();
      applyLayoutDrag(canvasCoords(e.touches[0]));
    }
  }

  function handleTouchEnd() {
    dragging = null;
    imageDragging = false;
    lastDragPos = null;
    lastPinchDist = null;
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

  // Update cursor when mode changes
  $effect(() => {
    if (layoutStore.imageMode) {
      canvasCursor = 'grab';
    } else if (!layoutStore.layoutMode) {
      canvasCursor = 'default';
    }
  });
</script>

<svelte:window onresize={handleResize} onmouseup={handleMouseUp} />

<div class="preview-wrapper" class:fullscreen={isFullscreen} bind:this={wrapper}>
  <div class="preview-container" bind:this={container}>
    <canvas
      bind:this={canvas}
      class="preview-canvas"
      class:layout-mode={layoutStore.layoutMode}
      class:image-mode={layoutStore.imageMode}
      style="cursor: {canvasCursor};"
      width="400"
      height="600"
      onmousemove={handleMouseMove}
      onmousedown={handleMouseDown}
      ondblclick={handleDblClick}
      onwheel={handleWheel}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    ></canvas>
  </div>

  {#if layoutStore.layoutMode}
    <div class="mode-toolbar">
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
      <button class="toolbar-btn" onclick={() => layoutStore.resetRatios()} title="Reset all splits to equal">
        Reset
      </button>
      <button class="toolbar-btn done" onclick={() => layoutStore.toggleLayoutMode()}>
        Done
      </button>
    </div>
  {/if}

  {#if layoutStore.imageMode}
    <div class="mode-toolbar image">
      <span class="toolbar-info">
        {#if currentFrame}
          Frame {(currentFrame.order ?? 0) + 1} &mdash; {Math.round(currentScale * 100)}%
        {:else}
          No frame selected
        {/if}
      </span>
      <div class="toolbar-spacer"></div>
      <button
        class="toolbar-btn"
        onclick={() => layoutStore.selectedId && layoutStore.resetFrameTransforms(layoutStore.selectedId)}
        disabled={!layoutStore.selectedId}
        title="Reset all frame transforms in this section"
      >
        Reset
      </button>
      <button class="toolbar-btn done" onclick={() => layoutStore.toggleImageMode()}>
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
    touch-action: none;
  }

  .preview-canvas.layout-mode {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .preview-canvas.image-mode {
    border-color: #51cf66;
    box-shadow: 0 0 0 1px #51cf66;
  }

  /* --- Mode toolbars --- */
  .mode-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 6px;
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
  }

  .mode-toolbar.image {
    border-color: #51cf66;
  }

  .toolbar-info {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
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

  .mode-toolbar.image .toolbar-btn.done {
    background: #51cf66;
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

  @media (max-width: 768px) {
    .preview-wrapper {
      padding: 8px;
      gap: 4px;
    }

    .mode-toolbar {
      padding: 4px 8px;
    }

    .toolbar-btn {
      padding: 4px 6px;
      font-size: 10px;
    }

    .preview-controls {
      padding: 6px 10px;
      gap: 8px;
    }
  }
</style>
