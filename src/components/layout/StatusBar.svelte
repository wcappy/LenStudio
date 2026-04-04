<script lang="ts">
  import { projectState, unitLabel } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  declare const __APP_VERSION__: string;
  const version = __APP_VERSION__;
</script>

<footer class="status-bar">
  <span class="status-left">
    {layoutStore.preset.label} layout &bull;
    {layoutStore.sectionCount} section{layoutStore.sectionCount !== 1 ? 's' : ''} &bull;
    {projectState.lpi} LPI &bull;
    {projectState.dpi} DPI
  </span>
  <span class="status-right">
    {projectState.displayWidth} &times; {projectState.displayHeight} {unitLabel(projectState.unit)} &bull;
    {projectState.outputWidthPx} &times; {projectState.outputHeightPx} px
    &bull; v{version}
  </span>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 16px;
    background: var(--bg);
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .status-bar {
      display: none;
    }
  }
</style>
