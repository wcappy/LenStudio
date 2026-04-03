<script lang="ts">
  import type { ImageFrame } from '../../lib/types/index.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  let { frame, index, sectionId }: { frame: ImageFrame; index: number; sectionId: string } = $props();

  let isDragging = $state(false);

  function handleDragStart(e: DragEvent) {
    isDragging = true;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', String(index));
  }

  function handleDragEnd() {
    isDragging = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer!.getData('text/plain'), 10);
    if (!isNaN(fromIndex)) {
      layoutStore.reorderFrame(sectionId, fromIndex, index);
    }
  }
</script>

<div
  class="image-card"
  class:dragging={isDragging}
  draggable="true"
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  role="listitem"
>
  <img src={frame.objectUrl} alt="Frame {index + 1}" class="thumbnail" />
  <span class="order-badge">{index + 1}</span>
  <button
    class="remove-btn"
    onclick={() => layoutStore.removeFrame(sectionId, frame.id)}
    title="Remove image"
  >×</button>
</div>

<style>
  .image-card {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid var(--border);
    cursor: grab;
    transition: border-color 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }

  .image-card:hover {
    border-color: var(--border-light);
  }

  .image-card.dragging {
    opacity: 0.4;
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .order-badge {
    position: absolute;
    bottom: 2px;
    left: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
  }

  .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .image-card:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    background: var(--danger);
  }
</style>
