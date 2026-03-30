<script lang="ts">
  import type { EffectType } from '../../lib/types/index.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  const effects: { value: EffectType; label: string; icon: string }[] = [
    { value: 'flip', label: 'Flip', icon: '⇄' },
    { value: 'animation', label: 'Animation', icon: '▶' },
    { value: 'depth3d', label: '3D Depth', icon: '◇' },
    { value: 'zoom', label: 'Zoom', icon: '⊕' },
    { value: 'morph', label: 'Morph', icon: '∞' },
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
          <span class="effect-label">{effect.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .effect-section {
    padding: 16px;
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
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    transition: background 0.15s, color 0.15s;
    text-align: left;
  }

  .effect-option:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .effect-option.active {
    background: rgba(233, 69, 96, 0.1);
    color: var(--accent);
  }

  .effect-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
</style>
