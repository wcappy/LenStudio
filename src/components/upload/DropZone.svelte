<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  const section = $derived(layoutStore.selectedSection);
  const canAdd = $derived(section ? layoutStore.canAddFrames(section.id) : false);
  const remaining = $derived(section ? layoutStore.remainingSlots(section.id) : 0);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files.length && section) {
      layoutStore.addFrames(section.id, e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length && section) {
      layoutStore.addFrames(section.id, input.files);
      input.value = '';
    }
  }

  function openFilePicker() {
    fileInput.click();
  }
</script>

{#if !section || section.frames.length === 0}
  <div
    class="dropzone"
    class:dragging={isDragging}
    role="button"
    tabindex="0"
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    onclick={openFilePicker}
    onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
  >
    <div class="dropzone-content">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p class="dropzone-text">Drop images here or click to upload</p>
      <p class="dropzone-hint">JPEG, PNG, WebP &bull; 2–12 images</p>
    </div>
  </div>
{:else}
  <button class="add-more btn-ghost" onclick={openFilePicker} disabled={!canAdd}>
    + Add More ({remaining} remaining)
  </button>
{/if}

<input
  bind:this={fileInput}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  hidden
  onchange={handleFileSelect}
/>

<style>
  .dropzone {
    border: 2px dashed var(--border);
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .dropzone:hover, .dropzone.dragging {
    border-color: var(--accent);
    background: var(--accent-subtle);
  }

  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }

  .dropzone-text {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .dropzone-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  .add-more {
    width: 100%;
  }
</style>
