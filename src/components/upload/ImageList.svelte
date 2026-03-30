<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import ImageCard from './ImageCard.svelte';
  import DropZone from './DropZone.svelte';

  const section = $derived(layoutStore.selectedSection);
</script>

<section class="image-section">
  <div class="section-header">
    <span class="section-label">Images</span>
    {#if section && section.frames.length > 0}
      <span class="count-badge">{section.frames.length}/12</span>
    {/if}
  </div>

  {#if section}
    {#if section.frames.length > 0}
      <div class="image-grid" role="list">
        {#each section.frames as frame, i (frame.id)}
          <ImageCard {frame} index={i} sectionId={section.id} />
        {/each}
      </div>
      <p class="hint">Drag to reorder</p>
    {/if}
  {/if}

  <DropZone />
</section>

<style>
  .image-section {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .count-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(233, 69, 96, 0.1);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  .hint {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
</style>
