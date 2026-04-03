<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import type { EffectParams } from '../../lib/types/index.js';

  const section = $derived(layoutStore.selectedSection);
  const params = $derived(section?.effectParams);

  function updateParam(key: string, value: number) {
    if (!section || !params) return;
    layoutStore.setSectionEffectParams(section.id, { ...params, [key]: value } as EffectParams);
  }
</script>

<section class="effect-settings">
  <span class="section-label">Effect Settings</span>

  {#if section}
    {#if section.effectType === 'animation'}
      <div class="field">
        <div class="field-header">
          <label for="fps-slider">Frame Rate</label>
          <span class="field-value">{params?.type === 'animation' ? params.fps : 12} fps</span>
        </div>
        <input
          id="fps-slider"
          type="range"
          min="4"
          max="30"
          value={params?.type === 'animation' ? params.fps : 12}
          oninput={(e) => updateParam('fps', +(e.target as HTMLInputElement).value)}
        />
      </div>
    {/if}

    {#if section.effectType === 'depth3d'}
      <div class="field">
        <div class="field-header">
          <label for="displacement-slider">Max Displacement</label>
          <span class="field-value">{params?.type === 'depth3d' ? params.maxDisplacement : 15}px</span>
        </div>
        <input
          id="displacement-slider"
          type="range"
          min="1"
          max="50"
          value={params?.type === 'depth3d' ? params.maxDisplacement : 15}
          oninput={(e) => updateParam('maxDisplacement', +(e.target as HTMLInputElement).value)}
        />
      </div>
      <p class="effect-hint">First image = photo, second image = depth map</p>
    {/if}

    {#if section.effectType === 'zoom'}
      <div class="field">
        <div class="field-header">
          <label for="zoom-slider">Zoom Factor</label>
          <span class="field-value">{params?.type === 'zoom' ? params.zoomFactor : 2}x</span>
        </div>
        <input
          id="zoom-slider"
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={params?.type === 'zoom' ? params.zoomFactor : 2}
          oninput={(e) => updateParam('zoomFactor', +(e.target as HTMLInputElement).value)}
        />
      </div>
    {/if}

    {#if section.effectType === 'morph'}
      <div class="field">
        <div class="field-header">
          <label for="grid-slider">Grid Size</label>
          <span class="field-value">{params?.type === 'morph' ? params.gridSize : 8}</span>
        </div>
        <input
          id="grid-slider"
          type="range"
          min="4"
          max="16"
          value={params?.type === 'morph' ? params.gridSize : 8}
          oninput={(e) => updateParam('gridSize', +(e.target as HTMLInputElement).value)}
        />
      </div>
    {/if}

    {#if section.effectType === 'flip'}
      <p class="effect-hint">Upload 2+ images to flip between on tilt</p>
    {/if}
  {/if}
</section>

<style>
  .effect-settings {
    padding: 16px 20px;
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

  .effect-hint {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
  }
</style>
