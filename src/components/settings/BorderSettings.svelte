<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
</script>

<section class="border-section">
  <span class="section-label">Borders</span>

  <label class="toggle-row">
    <input
      type="checkbox"
      checked={projectState.border.enabled}
      onchange={(e) => projectState.setBorder({ enabled: (e.target as HTMLInputElement).checked })}
    />
    <span class="toggle-label">Show cell borders</span>
  </label>

  {#if projectState.border.enabled}
    <div class="settings-grid">
      <div class="field">
        <label for="border-width">Width (px)</label>
        <input
          id="border-width"
          type="range"
          min="1"
          max="20"
          step="1"
          value={projectState.border.widthPx}
          oninput={(e) => projectState.setBorder({ widthPx: Number((e.target as HTMLInputElement).value) })}
        />
        <span class="range-value">{projectState.border.widthPx}px</span>
      </div>

      <div class="field">
        <label for="border-color">Color</label>
        <input
          id="border-color"
          type="color"
          value={projectState.border.color}
          oninput={(e) => projectState.setBorder({ color: (e.target as HTMLInputElement).value })}
        />
      </div>
    </div>
  {/if}
</section>

<style>
  .border-section {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    cursor: pointer;
  }

  .toggle-row input[type="checkbox"] {
    accent-color: var(--accent);
    width: 14px;
    height: 14px;
  }

  .toggle-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
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

  .field input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
    height: 6px;
  }

  .field input[type="color"] {
    width: 100%;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    background: none;
    padding: 2px;
  }

  .range-value {
    font-size: 11px;
    color: var(--text-muted);
    text-align: right;
  }
</style>
