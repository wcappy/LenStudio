<script lang="ts">
  import { projectState, inchesToUnit, unitToInches, unitLabel, unitStep, unitMax } from '../../lib/stores/project.svelte.js';
  import type { MeasurementUnit } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import type { LPI, DPI } from '../../lib/types/index.js';
  import { LPI_OPTIONS, DPI_OPTIONS } from '../../lib/types/index.js';

  let { open = $bindable(false) }: { open: boolean } = $props();

  interface SizePreset {
    label: string;
    /** Width in mm (canonical storage) */
    widthMm: number;
    /** Height in mm (canonical storage) */
    heightMm: number;
    category: string;
  }

  const presets: SizePreset[] = [
    // US Photo Sizes
    { label: 'Wallet',        widthMm: 64,   heightMm: 89,   category: 'US Photo' },
    { label: '4 × 6',         widthMm: 102,  heightMm: 152,  category: 'US Photo' },
    { label: '5 × 7',         widthMm: 127,  heightMm: 178,  category: 'US Photo' },
    { label: '8 × 10',        widthMm: 203,  heightMm: 254,  category: 'US Photo' },
    { label: '11 × 14',       widthMm: 279,  heightMm: 356,  category: 'US Photo' },
    { label: '16 × 20',       widthMm: 406,  heightMm: 508,  category: 'US Photo' },

    // US Paper Sizes
    { label: 'Letter',        widthMm: 216,  heightMm: 279,  category: 'US Paper' },
    { label: 'Legal',         widthMm: 216,  heightMm: 356,  category: 'US Paper' },
    { label: 'Tabloid',       widthMm: 279,  heightMm: 432,  category: 'US Paper' },
    { label: 'Half Letter',   widthMm: 140,  heightMm: 216,  category: 'US Paper' },

    // ISO Paper Sizes
    { label: 'A6',            widthMm: 105,  heightMm: 148,  category: 'ISO Paper' },
    { label: 'A5',            widthMm: 148,  heightMm: 210,  category: 'ISO Paper' },
    { label: 'A4',            widthMm: 210,  heightMm: 297,  category: 'ISO Paper' },
    { label: 'A3',            widthMm: 297,  heightMm: 420,  category: 'ISO Paper' },

    // Common Lenticular
    { label: 'Postcard',      widthMm: 102,  heightMm: 152,  category: 'Lenticular' },
    { label: 'Bookmark',      widthMm: 51,   heightMm: 152,  category: 'Lenticular' },
    { label: 'Business Card', widthMm: 89,   heightMm: 51,   category: 'Lenticular' },
    { label: 'Trading Card',  widthMm: 64,   heightMm: 89,   category: 'Lenticular' },
  ];

  const categories = [...new Set(presets.map(p => p.category))];

  let selectedPreset = $state<SizePreset | null>(null);
  let isCustom = $state(false);
  let selectedLpi = $state(projectState.lpi);
  let selectedDpi = $state(projectState.dpi);
  let orientation = $state<'portrait' | 'landscape'>('portrait');

  // Display-unit values for the dimension inputs
  let displayW = $state(inchesToUnit(projectState.outputWidthInches, projectState.unit));
  let displayH = $state(inchesToUnit(projectState.outputHeightInches, projectState.unit));

  // Convert mm to display unit
  function mmToDisplay(mm: number): number {
    const inches = mm / 25.4;
    return inchesToUnit(inches, projectState.unit);
  }

  function formatPresetDims(preset: SizePreset): string {
    const w = orientation === 'landscape'
      ? Math.max(preset.widthMm, preset.heightMm)
      : Math.min(preset.widthMm, preset.heightMm);
    const h = orientation === 'landscape'
      ? Math.min(preset.widthMm, preset.heightMm)
      : Math.max(preset.widthMm, preset.heightMm);
    return `${mmToDisplay(w)} × ${mmToDisplay(h)} ${unitLabel(projectState.unit)}`;
  }

  function selectPreset(preset: SizePreset) {
    selectedPreset = preset;
    isCustom = false;
    if (orientation === 'landscape') {
      displayW = mmToDisplay(Math.max(preset.widthMm, preset.heightMm));
      displayH = mmToDisplay(Math.min(preset.widthMm, preset.heightMm));
    } else {
      displayW = mmToDisplay(Math.min(preset.widthMm, preset.heightMm));
      displayH = mmToDisplay(Math.max(preset.widthMm, preset.heightMm));
    }
  }

  function toggleOrientation() {
    orientation = orientation === 'portrait' ? 'landscape' : 'portrait';
    const w = displayW;
    displayW = displayH;
    displayH = w;
  }

  function enableCustom() {
    isCustom = true;
    selectedPreset = null;
  }

  function handleCreate() {
    projectState.outputWidthInches = unitToInches(displayW, projectState.unit);
    projectState.outputHeightInches = unitToInches(displayH, projectState.unit);
    projectState.lpi = selectedLpi;
    projectState.dpi = selectedDpi;
    layoutStore.clearAll();
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  const widthInches = $derived(unitToInches(displayW, projectState.unit));
  const heightInches = $derived(unitToInches(displayH, projectState.unit));
  const outputW = $derived(Math.round(widthInches * selectedDpi));
  const outputH = $derived(Math.round(heightInches * selectedDpi));
  const strip = $derived(Math.round(selectedDpi / selectedLpi));

  const units: MeasurementUnit[] = ['mm', 'cm', 'in'];
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus a11y_no_noninteractive_tabindex -->
  <div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="New Project" tabindex="-1">
    <div class="modal">
      <div class="modal-header">
        <h2>New Project</h2>
        <button class="btn-icon" onclick={() => (open = false)} title="Close">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Size Presets -->
        <div class="presets-panel">
          <div class="orientation-toggle">
            <button
              class="orient-btn"
              class:active={orientation === 'portrait'}
              onclick={() => { if (orientation !== 'portrait') toggleOrientation(); }}
            >
              <svg viewBox="0 0 16 22" width="14" height="18"><rect x="1" y="1" width="14" height="20" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
              Portrait
            </button>
            <button
              class="orient-btn"
              class:active={orientation === 'landscape'}
              onclick={() => { if (orientation !== 'landscape') toggleOrientation(); }}
            >
              <svg viewBox="0 0 22 16" width="18" height="14"><rect x="1" y="1" width="20" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
              Landscape
            </button>
          </div>

          {#each categories as category}
            <div class="preset-group">
              <span class="group-label">{category}</span>
              <div class="preset-grid">
                {#each presets.filter(p => p.category === category) as preset}
                  <button
                    class="preset-btn"
                    class:active={selectedPreset === preset && !isCustom}
                    onclick={() => selectPreset(preset)}
                  >
                    <span class="preset-name">{preset.label}</span>
                    <span class="preset-dims">{formatPresetDims(preset)}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/each}

          <div class="preset-group">
            <span class="group-label">Custom</span>
            <button class="preset-btn" class:active={isCustom} onclick={enableCustom}>
              <span class="preset-name">Custom Size</span>
              <span class="preset-dims">Enter dimensions</span>
            </button>
          </div>
        </div>

        <!-- Settings Panel -->
        <div class="settings-panel">
          <div class="size-inputs">
            <div class="section-row">
              <span class="section-label">Dimensions</span>
              <div class="unit-toggle">
                {#each units as u}
                  <button
                    class="unit-btn"
                    class:active={projectState.unit === u}
                    onclick={() => {
                      // Convert current values to new unit
                      const wIn = unitToInches(displayW, projectState.unit);
                      const hIn = unitToInches(displayH, projectState.unit);
                      projectState.setUnit(u);
                      displayW = inchesToUnit(wIn, u);
                      displayH = inchesToUnit(hIn, u);
                    }}
                  >
                    {u}
                  </button>
                {/each}
              </div>
            </div>
            <div class="input-row">
              <div class="field">
                <label for="new-width">Width ({unitLabel(projectState.unit)})</label>
                <input
                  id="new-width"
                  type="number"
                  min="1"
                  max={unitMax(projectState.unit)}
                  step={unitStep(projectState.unit)}
                  bind:value={displayW}
                  onfocus={enableCustom}
                />
              </div>
              <span class="times">&times;</span>
              <div class="field">
                <label for="new-height">Height ({unitLabel(projectState.unit)})</label>
                <input
                  id="new-height"
                  type="number"
                  min="1"
                  max={unitMax(projectState.unit)}
                  step={unitStep(projectState.unit)}
                  bind:value={displayH}
                  onfocus={enableCustom}
                />
              </div>
            </div>
          </div>

          <div class="print-inputs">
            <span class="section-label">Print Settings</span>
            <div class="input-row">
              <div class="field">
                <label for="new-lpi">LPI</label>
                <select id="new-lpi" bind:value={selectedLpi}>
                  {#each LPI_OPTIONS as lpi}
                    <option value={lpi}>{lpi}</option>
                  {/each}
                </select>
              </div>
              <div class="field">
                <label for="new-dpi">DPI</label>
                <select id="new-dpi" bind:value={selectedDpi}>
                  {#each DPI_OPTIONS as dpi}
                    <option value={dpi}>{dpi}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <div class="output-preview">
            <div class="preview-box" style="aspect-ratio: {displayW} / {displayH};">
              <span class="preview-label">{displayW} &times; {displayH} {unitLabel(projectState.unit)}</span>
            </div>
            <div class="output-info">
              <p>{outputW} &times; {outputH} px</p>
              <p>{strip} px/lenticule &bull; {Math.floor(outputW / strip)} lenticules</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => (open = false)}>Cancel</button>
        <button class="btn-primary" onclick={handleCreate}>Create Project</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .modal {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 20px 60px var(--shadow);
    width: 680px;
    max-width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 16px;
    font-weight: 700;
  }

  .modal-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .presets-panel {
    width: 300px;
    min-width: 300px;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 12px;
  }

  .orientation-toggle {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    background: var(--surface);
    border-radius: 6px;
    padding: 3px;
  }

  .orient-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s;
  }

  .orient-btn.active {
    background: var(--bg);
    color: var(--text);
    box-shadow: 0 1px 3px var(--shadow);
  }

  .preset-group {
    margin-bottom: 12px;
  }

  .group-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 4px;
    padding: 0 4px;
  }

  .preset-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .preset-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    border-radius: 6px;
    text-align: left;
    transition: background 0.12s;
    width: 100%;
  }

  .preset-btn:hover {
    background: var(--surface-hover);
  }

  .preset-btn.active {
    background: rgba(233, 69, 96, 0.1);
    color: var(--accent);
  }

  .preset-name {
    font-size: 13px;
    font-weight: 500;
  }

  .preset-dims {
    font-size: 11px;
    color: var(--text-muted);
  }

  .preset-btn.active .preset-dims {
    color: var(--accent);
    opacity: 0.7;
  }

  .settings-panel {
    flex: 1;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }

  .section-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .unit-toggle {
    display: flex;
    gap: 2px;
    background: var(--surface);
    border-radius: 6px;
    padding: 2px;
  }

  .unit-btn {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    transition: background 0.12s, color 0.12s;
  }

  .unit-btn.active {
    background: var(--bg);
    color: var(--text);
    box-shadow: 0 1px 2px var(--shadow);
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 6px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .field label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .times {
    padding-bottom: 8px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .output-preview {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background: var(--surface);
    border-radius: 8px;
    margin-top: auto;
  }

  .preview-box {
    width: 80px;
    max-height: 100px;
    border: 2px solid var(--accent);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    flex-shrink: 0;
  }

  .preview-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
  }

  .output-info {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .output-info p {
    margin: 0;
    line-height: 1.6;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 600px) {
    .modal-body {
      flex-direction: column;
    }

    .presets-panel {
      width: 100%;
      min-width: unset;
      border-right: none;
      border-bottom: 1px solid var(--border);
      max-height: 40vh;
    }

    .modal {
      max-height: 95vh;
    }
  }
</style>
