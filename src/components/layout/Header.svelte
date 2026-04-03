<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import ExportModal from '../export/ExportModal.svelte';

  let { showNewProject = $bindable(false) }: { showNewProject: boolean } = $props();
  let showExport = $state(false);

  const themeIcons: Record<string, string> = {
    system: '◐',
    light: '☀',
    dark: '☾',
  };
</script>

<header class="header">
  <div class="header-left">
    <svg class="logo" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="6" y1="3" x2="6" y2="21" />
      <line x1="10" y1="3" x2="10" y2="21" />
      <line x1="14" y1="3" x2="14" y2="21" />
      <line x1="18" y1="3" x2="18" y2="21" />
    </svg>
    <h1 class="title">Lenticular Studio</h1>
  </div>

  <div class="header-right">
    <button class="btn-ghost new-btn" onclick={() => (showNewProject = true)}>
      + New
    </button>
    <button
      class="btn-icon theme-toggle"
      onclick={() => {
        projectState.cycleTheme();
        document.documentElement.setAttribute('data-theme', projectState.resolvedTheme);
      }}
      title="Theme: {projectState.themeMode}"
      aria-label="Toggle theme, current: {projectState.themeMode}"
    >
      {themeIcons[projectState.themeMode]}
    </button>
    <button
      class="btn-primary"
      onclick={() => (showExport = true)}
      disabled={!layoutStore.isAllReady || projectState.isProcessing}
    >
      {#if projectState.isProcessing}
        {projectState.processProgress}%
      {:else}
        Export
      {/if}
    </button>
  </div>
</header>

<ExportModal bind:open={showExport} />

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 16px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    z-index: 10;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    color: var(--text);
  }

  .title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .new-btn {
    font-weight: 600;
    font-size: 13px;
  }

  .theme-toggle {
    font-size: 16px;
  }

  @media (max-width: 768px) {
    .title {
      font-size: 14px;
    }
  }
</style>
