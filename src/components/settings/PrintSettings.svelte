<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { unitLabel, unitStep, unitMax } from '../../lib/stores/project.svelte.js';
  import type { MeasurementUnit } from '../../lib/stores/project.svelte.js';
  import { LPI_OPTIONS, DPI_OPTIONS } from '../../lib/types/index.js';
  import type { LPI, DPI } from '../../lib/types/index.js';

  const units: MeasurementUnit[] = ['mm', 'cm', 'in'];
</script>

<section class="print-section">
  <span class="section-label">Print Settings</span>

  <div class="settings-grid">
    <div class="field">
      <label for="lpi-select">LPI</label>
      <select
        id="lpi-select"
        value={projectState.lpi}
        onchange={(e) => (projectState.lpi = Number((e.target as HTMLSelectElement).value) as LPI)}
      >
        {#each LPI_OPTIONS as lpi}
          <option value={lpi}>{lpi}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="dpi-select">DPI</label>
      <select
        id="dpi-select"
        value={projectState.dpi}
        onchange={(e) => (projectState.dpi = Number((e.target as HTMLSelectElement).value) as DPI)}
      >
        {#each DPI_OPTIONS as dpi}
          <option value={dpi}>{dpi}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="width-input">Width ({unitLabel(projectState.unit)})</label>
      <input
        id="width-input"
        type="number"
        min="1"
        max={unitMax(projectState.unit)}
        step={unitStep(projectState.unit)}
        value={projectState.displayWidth}
        onchange={(e) => projectState.setWidthFromDisplay(Number((e.target as HTMLInputElement).value))}
      />
    </div>

    <div class="field">
      <label for="height-input">Height ({unitLabel(projectState.unit)})</label>
      <input
        id="height-input"
        type="number"
        min="1"
        max={unitMax(projectState.unit)}
        step={unitStep(projectState.unit)}
        value={projectState.displayHeight}
        onchange={(e) => projectState.setHeightFromDisplay(Number((e.target as HTMLInputElement).value))}
      />
    </div>
  </div>

  <div class="unit-row">
    <span class="unit-label">Units</span>
    <div class="unit-toggle">
      {#each units as u}
        <button
          class="unit-btn"
          class:active={projectState.unit === u}
          onclick={() => projectState.setUnit(u)}
        >
          {u}
        </button>
      {/each}
    </div>
  </div>

  <p class="output-summary">
    {projectState.outputWidthPx} &times; {projectState.outputHeightPx} px &bull;
    {projectState.stripWidth} px/lenticule
  </p>
</section>

<style>
  .print-section {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 4px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .unit-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }

  .unit-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .unit-toggle {
    display: flex;
    gap: 2px;
    background: var(--surface-hover);
    border-radius: 6px;
    padding: 2px;
  }

  .unit-btn {
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    transition: background 0.12s, color 0.12s;
    min-height: 32px;
  }

  .unit-btn.active {
    background: var(--bg);
    color: var(--text);
    box-shadow: 0 1px 2px var(--shadow);
  }

  .output-summary {
    margin-top: 10px;
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
