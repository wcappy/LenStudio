<script lang="ts">
  import type { EffectType } from '../../lib/types/index.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  const effects: { value: EffectType; label: string; icon: string; desc: string }[] = [
    { value: 'flip', label: 'Flip', icon: '⇄', desc: 'Switch between two images as you tilt' },
    { value: 'animation', label: 'Animation', icon: '▶', desc: 'Play through a sequence of frames' },
    { value: 'depth3d', label: '3D Depth', icon: '◇', desc: 'Parallax layers create a 3D illusion' },
    { value: 'zoom', label: 'Zoom', icon: '⊕', desc: 'Magnify into the image on tilt' },
    { value: 'morph', label: 'Morph', icon: '∞', desc: 'Smoothly blend between two images' },
  ];

  const section = $derived(layoutStore.selectedSection);
</script>

<section class="effect-section">
  <span class="section-label">Effect</span>
  {#if section}
    <div class="effect-list">
      {#each effects as effect}
        <button
          class="effect-option"
          class:active={section.effectType === effect.value}
          onclick={() => layoutStore.setSectionEffect(section.id, effect.value)}
        >
          <span class="effect-icon">{effect.icon}</span>
          <div class="effect-text">
            <span class="effect-label">{effect.label}</span>
            <span class="effect-desc">{effect.desc}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .effect-section {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .effect-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .effect-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    transition: background 0.15s, color 0.15s;
    text-align: left;
    min-height: 44px;
  }

  .effect-option:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .effect-option.active {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .effect-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    font-family: system-ui, -apple-system, sans-serif;
    flex-shrink: 0;
  }

  .effect-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .effect-desc {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 400;
    line-height: 1.3;
  }

  .effect-option.active .effect-desc {
    opacity: 0.7;
  }
</style>
