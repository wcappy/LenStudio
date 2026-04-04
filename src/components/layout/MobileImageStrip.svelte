<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  let fileInput: HTMLInputElement;
  const section = $derived(layoutStore.selectedSection);
  const hasImages = $derived(section && section.frames.length > 0);

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

{#if hasImages}
  <div class="mobile-strip">
    <div class="strip-scroll">
      {#each section!.frames as frame, i (frame.id)}
        <div class="strip-thumb">
          <img src={frame.objectUrl} alt="Frame {i + 1}" />
          <span class="strip-badge">{i + 1}</span>
        </div>
      {/each}
      {#if section && layoutStore.canAddFrames(section.id)}
        <button class="strip-add" onclick={openFilePicker}>+</button>
      {/if}
    </div>
  </div>
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
  .mobile-strip {
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .strip-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
  }

  .strip-thumb {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 4px;
    overflow: hidden;
    border: 1.5px solid var(--border);
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
    font-size: 8px;
    padding: 0 3px;
    border-radius: 2px;
  }

  .strip-add {
    width: 48px;
    height: 48px;
    border: 1.5px dashed var(--border);
    border-radius: 4px;
    font-size: 18px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    background: none;
  }
</style>
