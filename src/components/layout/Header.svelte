<script lang="ts">
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { exportProjectFile, importProjectFile, saveProject, listProjects, loadProject, deleteProject } from '../../lib/stores/persistence.js';
  import ExportModal from '../export/ExportModal.svelte';

  let { showNewProject = $bindable(false) }: { showNewProject: boolean } = $props();
  let showExport = $state(false);
  let loadInput: HTMLInputElement;

  async function handleSaveFile() {
    const blob = await exportProjectFile(
      layoutStore.projectName,
      layoutStore.root,
      layoutStore.preset,
      {
        lpi: projectState.lpi,
        dpi: projectState.dpi,
        outputWidthInches: projectState.outputWidthInches,
        outputHeightInches: projectState.outputHeightInches,
        border: projectState.border,
      }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layoutStore.projectName.replace(/\s+/g, '-').toLowerCase()}.tilt.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLoadFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await importProjectFile(file);
      layoutStore.loadFromProject(
        result.root,
        result.data.preset as any,
        result.data.name
      );
      projectState.lpi = result.data.settings.lpi;
      projectState.dpi = result.data.settings.dpi;
      projectState.outputWidthInches = result.data.settings.outputWidthInches;
      projectState.outputHeightInches = result.data.settings.outputHeightInches;
      if (result.data.settings.border) projectState.border = result.data.settings.border;
    } catch (err) {
      console.error('Failed to load project:', err);
    }
    input.value = '';
  }

  const themeIcons: Record<string, string> = {
    system: '◐',
    light: '☀',
    dark: '☾',
  };

  const exportDisabledReason = $derived.by(() => {
    if (projectState.isProcessing) return 'Export in progress...';
    if (layoutStore.sections.length === 0) return 'No sections to export';
    const empty = layoutStore.sections.filter(s => s.frames.length === 0);
    if (empty.length > 0) return `${empty.length} section${empty.length > 1 ? 's need' : ' needs'} images`;
    if (!layoutStore.isAllReady) return 'Some sections need more images';
    return '';
  });
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
    <h1 class="title">Tilt</h1>
  </div>

  {#if exportDisabledReason}
    <span class="header-status">{exportDisabledReason}</span>
  {/if}

  <input
    bind:this={loadInput}
    type="file"
    accept=".json,.tilt.json"
    hidden
    onchange={handleLoadFile}
  />

  <div class="header-right">
    <button class="btn-ghost save-btn" onclick={handleSaveFile} title="Save project file">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 1h8l3 3v9a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" />
        <path d="M5 1v4h5V1" />
        <rect x="4" y="9" width="7" height="4" rx="0.5" />
      </svg>
    </button>
    <button class="btn-ghost save-btn" onclick={() => loadInput.click()} title="Open project file">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M1 8v5a2 2 0 002 2h10a2 2 0 002-2V8" />
        <polyline points="4 4 8 1 12 4" />
        <line x1="8" y1="1" x2="8" y2="10" />
      </svg>
    </button>
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
    <div class="export-wrapper">
      <button
        class="btn-primary"
        onclick={() => (showExport = true)}
        disabled={!layoutStore.isAllReady || projectState.isProcessing}
        title={exportDisabledReason || 'Export project'}
      >
        {#if projectState.isProcessing}
          {projectState.processProgress}%
        {:else}
          Export
        {/if}
      </button>
    </div>
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

  .save-btn {
    padding: 6px;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .save-btn:hover {
    color: var(--text);
  }

  .new-btn {
    font-weight: 600;
    font-size: 13px;
  }

  .theme-toggle {
    font-size: 16px;
  }

  .header-status {
    font-size: 12px;
    color: var(--danger);
    white-space: nowrap;
    opacity: 0.8;
  }

  @media (max-width: 640px) {
    .header {
      height: 40px;
      padding: 0 10px;
    }

    .title {
      font-size: 14px;
    }

    .new-btn {
      display: none;
    }

    .header-status {
      display: none;
    }
  }
</style>
