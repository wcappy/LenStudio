<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  let fileInput: HTMLInputElement;
  const section = $derived(layoutStore.selectedSection);

  function openFilePicker() {
    fileInput.click();
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length && section) {
      layoutStore.addFrames(section.id, input.files);
      input.value = '';
    }
  }
</script>

<div class="mobile-strip">
  {#if section && section.frames.length > 0}
    <div class="strip-scroll">
      {#each section.frames as frame, i (frame.id)}
        <div class="strip-thumb">
          <img src={frame.objectUrl} alt="Frame {i + 1}" />
          <span class="strip-badge">{i + 1}</span>
        </div>
      {/each}
      {#if section && layoutStore.canAddFrames(section.id)}
        <button class="strip-add" onclick={openFilePicker}>+</button>
      {/if}
    </div>
    <p class="strip-hint">Long-press to reorder</p>
  {:else}
    <button class="strip-upload" onclick={openFilePicker}>
      Upload Images (2–12)
    </button>
  {/if}
</div>

<input
  bind:this={fileInput}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  hidden
  onchange={handleFileSelect}
/>

<style>
  .mobile-strip {
    display: none;
    padding: 8px 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  @media (max-width: 768px) {
    .mobile-strip {
      display: block;
    }
  }

  .strip-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .strip-thumb {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid var(--border);
    flex-shrink: 0;
  }

  .strip-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .strip-badge {
    position: absolute;
    bottom: 1px;
    left: 1px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 9px;
    padding: 0 4px;
    border-radius: 3px;
  }

  .strip-add {
    width: 64px;
    height: 64px;
    border: 2px dashed var(--border);
    border-radius: 6px;
    font-size: 24px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    background: none;
  }

  .strip-hint {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .strip-upload {
    width: 100%;
    padding: 12px;
    border: 2px dashed var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    background: none;
  }
</style>
