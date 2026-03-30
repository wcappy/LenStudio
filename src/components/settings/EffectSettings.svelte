<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  const section = $derived(layoutStore.selectedSection);

  let transitionSpeed = $state(50);
  let maxDisplacement = $state(15);
  let zoomFactor = $state(2);
  let gridSize = $state(8);
</script>

<section class="effect-settings">
  <span class="section-label">Effect Settings</span>

  {#if section}
    {#if section.effectType === 'flip' || section.effectType === 'animation'}
      <div class="field">
        <div class="field-header">
          <label for="speed-slider">Transition Speed</label>
          <span class="field-value">{transitionSpeed}%</span>
        </div>
        <input id="speed-slider" type="range" min="10" max="100" bind:value={transitionSpeed} />
      </div>
    {/if}

    {#if section.effectType === 'depth3d'}
      <div class="field">
        <div class="field-header">
          <label for="displacement-slider">Max Displacement</label>
          <span class="field-value">{maxDisplacement}px</span>
        </div>
        <input id="displacement-slider" type="range" min="1" max="50" bind:value={maxDisplacement} />
      </div>
    {/if}

    {#if section.effectType === 'zoom'}
      <div class="field">
        <div class="field-header">
          <label for="zoom-slider">Zoom Factor</label>
          <span class="field-value">{zoomFactor}x</span>
        </div>
        <input id="zoom-slider" type="range" min="1" max="5" step="0.5" bind:value={zoomFactor} />
      </div>
    {/if}

    {#if section.effectType === 'morph'}
      <div class="field">
        <div class="field-header">
          <label for="grid-slider">Grid Size</label>
          <span class="field-value">{gridSize}</span>
        </div>
        <input id="grid-slider" type="range" min="4" max="16" bind:value={gridSize} />
      </div>
    {/if}
  {/if}
</section>

<style>
  .effect-settings {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .field {
    margin-top: 8px;
  }

  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .field-header label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .field-value {
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'Space Grotesk', monospace;
  }
</style>
