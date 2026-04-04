<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { PreviewRenderer } from '../../lib/preview/PreviewRenderer.js';
  import { gammaToAngle } from '../../lib/preview/tilt-detector.js';
  import type { DividerInfo, ImageTransform } from '../../lib/types/index.js';

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let renderer: PreviewRenderer | null = null;
  let viewAngle = $state(0.5);
  let isFullscreen = $state(false);
  let gyroEnabled = $state(false);

  // Layout mode drag state
  let dragging: DividerInfo | null = $state(null);
  // Image mode drag state
  let imageDragging = $state(false);
  let lastDragPos: { x: number; y: number } | null = null;
  // Pinch-to-zoom state
  let lastPinchDist: number | null = null;

  let canvasCursor = $state('default');
  let dragTarget = $state<string | null>(null);
  let mobileFileInput: HTMLInputElement;
  let tapTargetCell: string | null = null;
  const isMobile = typeof window !== 'undefined' && 'ontouchstart' in window;

  const hasSplits = $derived(layoutStore.sectionCount > 1);
  const hasAnyImages = $derived(layoutStore.sections.some(s => s.frames.length > 0));

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
      renderer.setOverlay(projectState.showOverlay, projectState.outputWidthPx, projectState.stripWidth);
      renderer.setHolographic(projectState.showHolo);
      renderer.render(viewAngle);
    }
  });

  $effect(() => {
    if (renderer) {
      renderer.setBorder(projectState.border);
      renderer.render(viewAngle);
    }
  });

  // Debounced effect processing for non-identity effects
  let processTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (!renderer) return;

    // Track dependencies: sections' effectType, effectParams, and frames
    const deps = layoutStore.sections.map(s => ({
      id: s.id,
      effectType: s.effectType,
      effectParams: s.effectParams,
      frameCount: s.frames.length,
    }));

    // Debounce to avoid processing on every slider drag
    if (processTimer) clearTimeout(processTimer);
    processTimer = setTimeout(() => {
      const cells = renderer!.getCells();
      for (const s of layoutStore.sections) {
        if (s.frames.length === 0) continue;
        // Only process non-identity effects
        if (s.effectType === 'flip' || s.effectType === 'animation') {
          renderer!.clearProcessedCache(s.id);
          continue;
        }
        const rect = cells.get(s.id);
        if (rect) {
          renderer!.processSection(s, Math.floor(rect.w), Math.floor(rect.h)).then(() => {
            renderer!.render(viewAngle);
          });
        }
      }
    }, 300);

    return () => {
      if (processTimer) clearTimeout(processTimer);
    };
  });

  $effect(() => {
    const handler = () => {
      isFullscreen = !!document.fullscreenElement;
      setTimeout(handleResize, 50);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  });

  // Gyroscope tilt in fullscreen mode
  $effect(() => {
    if (!isFullscreen || !gyroEnabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      viewAngle = gammaToAngle(e.gamma);
      renderer?.render(viewAngle);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  });

  async function requestGyro() {
    // iOS 13+ requires permission
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      try {
        const perm = await DOE.requestPermission();
        if (perm !== 'granted') return;
      } catch {
        return;
      }
    }
    gyroEnabled = true;
  }

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

  // Mobile: tap cell to add images
  function handleCanvasTap(e: MouseEvent) {
    if (!isMobile || layoutStore.layoutMode || layoutStore.imageMode) return;
    const pos = canvasCoords(e);
    const cellId = hitTestCell(pos.x, pos.y);
    if (!cellId || !layoutStore.canAddFrames(cellId)) return;
    tapTargetCell = cellId;
    layoutStore.selectSection(cellId);
    mobileFileInput.click();
  }

  function handleMobileFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length && tapTargetCell) {
      layoutStore.addFrames(tapTargetCell, input.files);
      input.value = '';
    }
    tapTargetCell = null;
  }

  // --- Drag & drop handlers ---
  function isSectionFull(cellId: string): boolean {
    return !layoutStore.canAddFrames(cellId);
  }

  function handleCanvasDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cellId = hitTestCell(cx, cy);

    if (cellId && isSectionFull(cellId)) {
      e.dataTransfer.dropEffect = 'none';
      if (dragTarget !== null) {
        dragTarget = null;
        if (renderer) {
          renderer.setDragTarget(null);
          renderer.render(viewAngle);
        }
      }
      return;
    }

    e.dataTransfer.dropEffect = 'copy';

    if (cellId !== dragTarget) {
      dragTarget = cellId;
      if (renderer) {
        renderer.setDragTarget(cellId);
        renderer.render(viewAngle);
      }
    }
  }

  function handleCanvasDragLeave(e: DragEvent) {
    // Only clear if leaving the canvas entirely
    if (e.relatedTarget && canvas.contains(e.relatedTarget as Node)) return;
    dragTarget = null;
    if (renderer) {
      renderer.setDragTarget(null);
      renderer.render(viewAngle);
    }
  }

  function handleCanvasDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files?.length) return;

    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cellId = hitTestCell(cx, cy);

    if (cellId && !isSectionFull(cellId)) {
      layoutStore.selectSection(cellId);
      layoutStore.addFrames(cellId, files);
    }

    dragTarget = null;
    if (renderer) {
      renderer.setDragTarget(null);
      renderer.render(viewAngle);
    }
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
  <div class="workspace-toolbar" class:has-images={hasAnyImages}>
    <button
      class="workspace-btn"
      class:active={layoutStore.layoutMode}
      onclick={() => layoutStore.toggleLayoutMode()}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="1" y="1" width="14" height="14" rx="1" />
        <line x1="1" y1="8" x2="15" y2="8" />
        <line x1="8" y1="1" x2="8" y2="15" />
      </svg>
      {layoutStore.layoutMode ? 'Editing Layout' : 'Edit Layout'}
    </button>
    <button
      class="workspace-btn image"
      class:active={layoutStore.imageMode}
      onclick={() => layoutStore.toggleImageMode()}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="1" y="1" width="14" height="14" rx="1" />
        <polyline points="1 11 5 7 9 11" />
        <polyline points="8 9 11 6 15 10" />
        <circle cx="11" cy="4" r="1.5" />
      </svg>
      {layoutStore.imageMode ? 'Adjusting Images' : 'Adjust Images'}
    </button>
  </div>

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
      onclick={handleCanvasTap}
      ondragover={handleCanvasDragOver}
      ondragleave={handleCanvasDragLeave}
      ondrop={handleCanvasDrop}
    ></canvas>
    <input
      bind:this={mobileFileInput}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      hidden
      onchange={handleMobileFileSelect}
    />
    {#if layoutStore.isLoadingFrames}
      <div class="canvas-empty-hint">
        <div class="loading-spinner"></div>
        <p>Loading images...</p>
      </div>
    {:else if !hasAnyImages}
      <div class="canvas-empty-hint">
        <svg class="empty-icon" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
          <rect x="4" y="6" width="40" height="36" rx="4" />
          <line x1="12" y1="6" x2="12" y2="42" opacity="0.3" />
          <line x1="20" y1="6" x2="20" y2="42" opacity="0.3" />
          <line x1="28" y1="6" x2="28" y2="42" opacity="0.3" />
          <line x1="36" y1="6" x2="36" y2="42" opacity="0.3" />
        </svg>
        <p>Upload images to get started</p>
        <p class="canvas-empty-sub">Add 2-12 photos and tilt to see the lenticular effect</p>
        <p class="canvas-empty-sub desktop-hint">Drag images into the sidebar or click to upload</p>
        <p class="canvas-empty-sub mobile-hint">Tap here to add photos</p>
      </div>
    {/if}
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
        class="toolbar-btn"
        onclick={() => layoutStore.selectedId && layoutStore.splitIntoQuarters(layoutStore.selectedId)}
        disabled={!layoutStore.selectedId}
        title="Split selected cell into 4 quarters"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="1" width="18" height="18" rx="1" />
          <line x1="10" y1="1" x2="10" y2="19" />
          <line x1="1" y1="10" x2="19" y2="10" />
        </svg>
        Quarters
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
      <button
        class="toolbar-btn"
        onclick={() => {
          if (!layoutStore.selectedId || !currentFrame) return;
          const t = currentFrame.transform ?? { scale: 1, panX: 0, panY: 0 };
          layoutStore.setFrameTransform(layoutStore.selectedId, currentFrame.id, { ...t, flipH: !t.flipH });
        }}
        disabled={!currentFrame}
        title="Flip horizontal"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="1 4 5 8 1 12" />
          <polyline points="15 4 11 8 15 12" />
          <line x1="8" y1="2" x2="8" y2="14" stroke-dasharray="2 2" />
        </svg>
        Flip H
      </button>
      <button
        class="toolbar-btn"
        onclick={() => {
          if (!layoutStore.selectedId || !currentFrame) return;
          const t = currentFrame.transform ?? { scale: 1, panX: 0, panY: 0 };
          layoutStore.setFrameTransform(layoutStore.selectedId, currentFrame.id, { ...t, flipV: !t.flipV });
        }}
        disabled={!currentFrame}
        title="Flip vertical"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="4 1 8 5 12 1" />
          <polyline points="4 15 8 11 12 15" />
          <line x1="2" y1="8" x2="14" y2="8" stroke-dasharray="2 2" />
        </svg>
        Flip V
      </button>
      <button
        class="toolbar-btn"
        onclick={() => {
          if (!layoutStore.selectedId || !currentFrame) return;
          const t = currentFrame.transform ?? { scale: 1, panX: 0, panY: 0 };
          const r = ((t.rotation ?? 0) + 90) % 360;
          layoutStore.setFrameTransform(layoutStore.selectedId, currentFrame.id, { ...t, rotation: r });
        }}
        disabled={!currentFrame}
        title="Rotate 90° clockwise"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M13 7A5 5 0 1 0 8 12" />
          <polyline points="10 7 13 7 13 4" />
        </svg>
        Rotate
      </button>
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
        class="btn-icon gyro-toggle"
        class:active={gyroEnabled}
        onclick={() => gyroEnabled ? (gyroEnabled = false) : requestGyro()}
        title={gyroEnabled ? 'Disable tilt control' : 'Enable tilt control'}
        aria-label={gyroEnabled ? 'Disable tilt control' : 'Enable tilt control'}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="5" y="2" width="10" height="16" rx="2" />
          <circle cx="10" cy="14" r="1" />
          {#if gyroEnabled}
            <path d="M3 8 L5 10 L3 12" />
            <path d="M17 8 L15 10 L17 12" />
          {/if}
        </svg>
      </button>

      <button
        class="btn-icon fullscreen-toggle"
        onclick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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

  {#if isFullscreen && !gyroEnabled}
    <button class="gyro-prompt" onclick={requestGyro}>
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="5" y="2" width="10" height="16" rx="2" />
        <path d="M3 8 L5 10 L3 12" />
        <path d="M17 8 L15 10 L17 12" />
      </svg>
      Tilt phone to view effect
    </button>
  {/if}
</div>

<style>
  .preview-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 8px;
    overflow: hidden;
  }

  .workspace-toolbar {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .workspace-toolbar {
      display: none;
    }

    .workspace-toolbar.has-images {
      display: flex;
      width: 100%;
      justify-content: center;
    }

    .workspace-btn {
      flex: 1;
      justify-content: center;
      font-size: 11px;
      padding: 6px 8px;
    }
  }

  .workspace-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    color: var(--text-muted);
    border: 1px solid var(--border);
    transition: all 0.15s;
  }

  .workspace-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .workspace-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .workspace-btn.image:hover {
    border-color: var(--success);
    color: var(--success);
  }

  .workspace-btn.image.active {
    background: var(--success);
    border-color: var(--success);
    color: #fff;
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

  .canvas-empty-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .empty-icon {
    margin-bottom: 4px;
  }

  .loading-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .canvas-empty-hint p {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
  }

  .canvas-empty-sub {
    font-size: 12px;
    opacity: 0.7;
  }

  .mobile-hint {
    display: none;
  }

  @media (max-width: 640px) {
    .desktop-hint {
      display: none;
    }
    .mobile-hint {
      display: block;
    }
  }

  .preview-canvas {
    border: 1px solid var(--border);
    border-radius: 8px;
    max-width: 100%;
    max-height: 100%;
    touch-action: none;
  }

  .preview-canvas.layout-mode {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .preview-canvas.image-mode {
    border-color: var(--success);
    box-shadow: 0 0 0 1px var(--success);
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
    border-color: var(--success);
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
    background: var(--danger-muted);
    color: var(--accent);
  }

  .toolbar-btn.done {
    background: var(--accent);
    color: #fff;
  }

  .mode-toolbar.image .toolbar-btn.done {
    background: var(--success);
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
    border-radius: 10px;
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

  .fullscreen-toggle {
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .gyro-toggle {
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .gyro-toggle.active {
    color: var(--accent);
  }

  .fullscreen-toggle:hover,
  .gyro-toggle:hover {
    color: var(--text);
  }

  .gyro-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: var(--accent);
    color: #fff;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    animation: gyro-pulse 2s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes gyro-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Hide gyro prompt on desktop (no gyroscope) */
  @media (hover: hover) and (pointer: fine) {
    .gyro-prompt {
      display: none;
    }
    .gyro-toggle {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .preview-wrapper {
      padding: 8px;
      padding-bottom: 56px;
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

    .scrub-bar {
      height: 20px;
    }
  }
</style>
