<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { projectState } from '../../lib/stores/project.svelte.js';

  const gridGap = $derived(
    projectState.border.enabled ? Math.max(2, Math.round(projectState.border.widthPx / 2)) : 3
  );
</script>

<section class="section-selector">
  <span class="section-label">Sections</span>
  <div
    class="grid"
    style="grid-template-columns: repeat({layoutStore.preset.cols}, 1fr); grid-template-rows: repeat({layoutStore.preset.rows}, 1fr); gap: {gridGap}px;"
  >
    {#each layoutStore.sections as section (section.id)}
      <button
        class="cell"
        class:selected={layoutStore.selectedId === section.id}
        class:has-frames={section.frames.length > 0}
        onclick={() => layoutStore.selectSection(section.id)}
        title="Row {section.row + 1}, Col {section.col + 1} — {section.effectType} ({section.frames.length} images)"
      >
        {#if section.frames.length > 0 && section.frames[0].objectUrl}
          <img src={section.frames[0].objectUrl} alt="" class="cell-thumb" />
          <span class="cell-badge">{section.frames.length}</span>
        {:else}
          <span class="cell-empty">+</span>
        {/if}
        <span class="cell-effect">{section.effectType}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .section-selector {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .grid {
    display: grid;
    margin-top: 8px;
    aspect-ratio: 4 / 6;
    max-height: 180px;
  }

  .cell {
    position: relative;
    border: 2px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s;
    cursor: pointer;
    min-height: 0;
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
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    padding: 0 4px;
    border-radius: 3px;
    z-index: 1;
  }

  .cell-empty {
    font-size: 18px;
    color: var(--text-muted);
  }

  .cell-effect {
    position: absolute;
    bottom: 2px;
    left: 2px;
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.5);
    padding: 0 3px;
    border-radius: 2px;
    z-index: 1;
  }

  .cell.selected .cell-effect {
    color: var(--accent);
  }
</style>
