<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { computeTreeLayout } from '../../lib/utils/layout-tree.js';

  // Compute miniature cell rects for the thumbnail grid
  const THUMB_W = 120;

  const thumbLayout = $derived.by(() => {
    const aspect = projectState.outputWidthInches / projectState.outputHeightInches;
    const w = THUMB_W;
    const h = w / aspect;
    const borderPx = projectState.border.enabled ? Math.max(1, projectState.border.widthPx / 10) : 1;
    const { cells } = computeTreeLayout(layoutStore.root, 0, 0, w, h, borderPx);
    return { cells, w, h };
  });
</script>

<section class="section-selector">
  <span class="section-label">Sections</span>
  <div
    class="grid-preview"
    style="width: {thumbLayout.w}px; height: {thumbLayout.h}px;"
  >
    {#each layoutStore.sections as section (section.id)}
      {@const rect = thumbLayout.cells.get(section.id)}
      {#if rect}
        <button
          class="cell"
          class:selected={layoutStore.selectedId === section.id}
          class:has-frames={section.frames.length > 0}
          onclick={() => layoutStore.selectSection(section.id)}
          title="{section.effectType} ({section.frames.length} images)"
          style="left: {rect.x}px; top: {rect.y}px; width: {rect.w}px; height: {rect.h}px;"
        >
          {#if section.frames.length > 0 && section.frames[0].objectUrl}
            <img src={section.frames[0].objectUrl} alt="" class="cell-thumb" />
            <span class="cell-badge">{section.frames.length}</span>
          {:else}
            <span class="cell-empty">+</span>
          {/if}
          <span class="cell-effect">{section.effectType}</span>
        </button>
      {/if}
    {/each}
  </div>
</section>

<style>
  .section-selector {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .grid-preview {
    position: relative;
    margin: 8px auto 0;
    max-width: 100%;
    overflow: hidden;
  }

  @media (max-width: 640px) {
    .grid-preview {
      max-width: 160px;
    }
  }

  .cell {
    position: absolute;
    border: 1.5px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s;
    cursor: pointer;
    box-sizing: border-box;
  }

  .cell:hover {
    border-color: var(--text-muted);
  }

  .cell.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .cell-thumb {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.7;
  }

  .cell.selected .cell-thumb {
    opacity: 1;
  }

  .cell-badge {
    position: absolute;
    top: 1px;
    right: 1px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 3px;
    border-radius: 2px;
    z-index: 1;
    line-height: 1.2;
  }

  .cell-empty {
    font-size: 14px;
    color: var(--text-muted);
  }

  .cell-effect {
    position: absolute;
    bottom: 1px;
    left: 1px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    color: #ccc;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 3px;
    border-radius: 2px;
    z-index: 1;
    line-height: 1.2;
  }

  .cell.selected .cell-effect {
    color: var(--accent);
  }
</style>
