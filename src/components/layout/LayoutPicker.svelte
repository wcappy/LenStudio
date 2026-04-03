<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { LAYOUT_PRESETS } from '../../lib/types/index.js';
  import type { LayoutPreset } from '../../lib/types/index.js';

  let showWarning = $state(false);
  let pendingPreset = $state<LayoutPreset | null>(null);
  let showCustom = $state(false);
  let customCols = $state(layoutStore.customCols);
  let customRows = $state(layoutStore.customRows);

  const hasImages = $derived(layoutStore.sections.some(s => s.frames.length > 0));
  const isCustomActive = $derived(layoutStore.preset.id === 'custom');

  function handlePresetClick(preset: LayoutPreset) {
    if (preset.id === layoutStore.preset.id) return;
    if (hasImages) {
      pendingPreset = preset;
      showWarning = true;
    } else {
      layoutStore.setPreset(preset);
    }
  }

  function confirmChange() {
    if (pendingPreset) {
      layoutStore.setPreset(pendingPreset);
    }
    showWarning = false;
    pendingPreset = null;
  }

  function cancelChange() {
    showWarning = false;
    pendingPreset = null;
  }

  function handleCustomClick() {
    showCustom = !showCustom;
    if (showCustom && !isCustomActive) {
      applyCustomGrid();
    }
  }

  function applyCustomGrid() {
    const preset: LayoutPreset = {
      id: 'custom',
      label: `${customCols} \u00d7 ${customRows}`,
      cols: customCols,
      rows: customRows,
    };
    if (hasImages) {
      pendingPreset = preset;
      showWarning = true;
    } else {
      layoutStore.setCustomGrid(customCols, customRows);
    }
  }
</script>

<section class="layout-section">
  <div class="section-header">
    <span class="section-label">Layout</span>
    <button
      class="edit-layout-btn"
      class:active={layoutStore.layoutMode}
      onclick={() => layoutStore.toggleLayoutMode()}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="1" y="1" width="14" height="14" rx="1" />
        <line x1="1" y1="8" x2="15" y2="8" />
        <line x1="8" y1="1" x2="8" y2="15" />
      </svg>
      {layoutStore.layoutMode ? 'Editing' : 'Edit Layout'}
    </button>
  </div>

  <div class="preset-grid">
    {#each LAYOUT_PRESETS as preset}
      <button
        class="preset-btn"
        class:active={layoutStore.preset.id === preset.id}
        onclick={() => handlePresetClick(preset)}
        title={preset.label}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="20" height="20" rx="1" />
          {#if preset.cols > 1}
            {#each Array(preset.cols - 1) as _, c}
              <line
                x1={2 + ((c + 1) * 20) / preset.cols}
                y1="2"
                x2={2 + ((c + 1) * 20) / preset.cols}
                y2="22"
              />
            {/each}
          {/if}
          {#if preset.rows > 1}
            {#each Array(preset.rows - 1) as _, r}
              <line
                x1="2"
                y1={2 + ((r + 1) * 20) / preset.rows}
                x2="22"
                y2={2 + ((r + 1) * 20) / preset.rows}
              />
            {/each}
          {/if}
        </svg>
        <span class="preset-label">{preset.label}</span>
      </button>
    {/each}

    <button
      class="preset-btn"
      class:active={isCustomActive}
      onclick={handleCustomClick}
      title="Custom grid"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="2" width="20" height="20" rx="1" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <circle cx="18" cy="18" r="4" fill="var(--bg, #1a1a2e)" stroke="currentColor" />
        <line x1="16" y1="18" x2="20" y2="18" stroke-width="1.5" />
        <line x1="18" y1="16" x2="18" y2="20" stroke-width="1.5" />
      </svg>
      <span class="preset-label">Custom</span>
    </button>
  </div>

  {#if showCustom || isCustomActive}
    <div class="custom-grid-inputs">
      <div class="custom-field">
        <label for="custom-cols">Cols</label>
        <input
          id="custom-cols"
          type="number"
          min="1"
          max="6"
          bind:value={customCols}
          onchange={applyCustomGrid}
        />
      </div>
      <span class="custom-x">&times;</span>
      <div class="custom-field">
        <label for="custom-rows">Rows</label>
        <input
          id="custom-rows"
          type="number"
          min="1"
          max="6"
          bind:value={customRows}
          onchange={applyCustomGrid}
        />
      </div>
    </div>
  {/if}

  {#if showWarning}
    <div class="warning">
      <p class="warning-text">Changing layout will clear all images from every section.</p>
      <div class="warning-actions">
        <button class="btn-ghost warning-btn" onclick={cancelChange}>Cancel</button>
        <button class="btn-primary warning-btn" onclick={confirmChange}>Change Layout</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .layout-section {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .edit-layout-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 5px;
    color: var(--text-muted);
    border: 1px solid var(--border);
    transition: all 0.15s;
  }

  .edit-layout-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .edit-layout-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin-top: 4px;
  }

  .preset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    border-radius: 6px;
    transition: background 0.12s;
  }

  .preset-btn:hover {
    background: var(--surface-hover);
  }

  .preset-btn.active {
    background: rgba(233, 69, 96, 0.1);
    color: var(--accent);
  }

  .preset-label {
    font-size: 10px;
    color: var(--text-muted);
  }

  .preset-btn.active .preset-label {
    color: var(--accent);
  }

  .custom-grid-inputs {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 8px;
    justify-content: center;
  }

  .custom-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  .custom-field label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .custom-field input {
    width: 100%;
    text-align: center;
    padding: 4px 6px;
    font-size: 13px;
  }

  .custom-x {
    font-size: 14px;
    color: var(--text-muted);
    padding-bottom: 4px;
  }

  .warning {
    margin-top: 10px;
    padding: 10px 12px;
    background: rgba(233, 69, 96, 0.08);
    border: 1px solid rgba(233, 69, 96, 0.25);
    border-radius: 8px;
  }

  .warning-text {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .warning-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .warning-btn {
    padding: 4px 12px;
    font-size: 12px;
  }
</style>
