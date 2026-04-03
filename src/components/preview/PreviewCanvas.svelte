<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { PreviewRenderer } from '../../lib/preview/PreviewRenderer.js';
  import { mouseToAngle } from '../../lib/preview/tilt-detector.js';

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let renderer: PreviewRenderer | null = null;
  let viewAngle = $state(0.5);
  let showOverlay = $state(true);
  let showHolo = $state(false);
  let isFullscreen = $state(false);

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
      renderer.setSections(
        layoutStore.sections,
        layoutStore.preset.cols,
        layoutStore.preset.rows,
        layoutStore.selectedId
      );
      renderer.render(viewAngle);
    }
  });

  // Re-fit canvas when print dimensions or DPI/LPI change
  $effect(() => {
    projectState.outputWidthInches;
    projectState.outputHeightInches;
    projectState.dpi;
    projectState.lpi;
    handleResize();
  });

  // Update overlay settings when they change
  $effect(() => {
    if (renderer) {
      renderer.setOverlay(showOverlay, projectState.outputWidthPx, projectState.stripWidth);
      renderer.setHolographic(showHolo);
      renderer.render(viewAngle);
    }
  });

  // Update border config when it changes
  $effect(() => {
    if (renderer) {
      renderer.setBorder(projectState.border);
      renderer.render(viewAngle);
    }
  });

  // Listen for fullscreen changes (e.g. user presses Escape)
  $effect(() => {
    const handler = () => {
      isFullscreen = !!document.fullscreenElement;
      // Re-fit after fullscreen transition
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

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    viewAngle = mouseToAngle(e.clientX, rect.left, rect.width);
    renderer?.render(viewAngle);
  }

  function handleScrub(e: Event) {
    const input = e.target as HTMLInputElement;
    viewAngle = parseFloat(input.value);
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

<svelte:window onresize={handleResize} />

<div class="preview-wrapper" class:fullscreen={isFullscreen} bind:this={wrapper}>
  <div class="preview-container" bind:this={container}>
    <canvas
      bind:this={canvas}
      class="preview-canvas"
      width="400"
      height="600"
      onmousemove={handleMouseMove}
    ></canvas>
  </div>

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
  }

  .preview-canvas {
    border: 1px solid var(--secondary);
    border-radius: 4px;
    max-width: 100%;
    max-height: 100%;
    cursor: ew-resize;
  }

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
