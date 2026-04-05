<script lang="ts">
  import { projectState } from './lib/stores/project.svelte.js';
  import Header from './components/layout/Header.svelte';
  import MainArea from './components/layout/MainArea.svelte';
  import StatusBar from './components/layout/StatusBar.svelte';
  import MobileTabs from './components/layout/MobileTabs.svelte';
  import SectionSelector from './components/layout/SectionSelector.svelte';
  import ImageList from './components/upload/ImageList.svelte';
  import EffectPicker from './components/settings/EffectPicker.svelte';
  import PrintSettings from './components/settings/PrintSettings.svelte';
  import BorderSettings from './components/settings/BorderSettings.svelte';
  import EffectSettings from './components/settings/EffectSettings.svelte';
  import PreviewCanvas from './components/preview/PreviewCanvas.svelte';
  import NewProjectModal from './components/layout/NewProjectModal.svelte';
  import { layoutStore } from './lib/stores/layout.svelte.js';
  import { hasAutoSave, loadAutoSave } from './lib/stores/persistence.js';

  let showNewProject = $state(false);
  let restored = false;

  // Auto-save: trigger on any tree/settings change
  $effect(() => {
    // Track reactive deps
    const _root = layoutStore.root;
    const _lpi = projectState.lpi;
    const _dpi = projectState.dpi;
    const _w = projectState.outputWidthInches;
    const _h = projectState.outputHeightInches;
    const _border = projectState.border;

    if (restored) {
      layoutStore.triggerAutoSave({
        lpi: projectState.lpi,
        dpi: projectState.dpi,
        outputWidthInches: projectState.outputWidthInches,
        outputHeightInches: projectState.outputHeightInches,
        border: projectState.border,
      });
    }
  });

  // Restore auto-save on startup (runs once)
  hasAutoSave().then(async (has) => {
    if (has) {
      const result = await loadAutoSave();
      if (result) {
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
      }
    }
    restored = true;
  });

  // Listen for system theme changes
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (projectState.themeMode === 'system') {
        document.documentElement.setAttribute(
          'data-theme',
          mq.matches ? 'dark' : 'light'
        );
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  // Global drop handler
  function handleGlobalDrop(e: DragEvent) {
    e.preventDefault();
  }

  function handleGlobalDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      layoutStore.undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      layoutStore.redo();
    }
  }
</script>

<svelte:window ondrop={handleGlobalDrop} ondragover={handleGlobalDragOver} onkeydown={handleKeydown} />

<Header bind:showNewProject />

{#if showNewProject}
  <div class="workspace">
    <div class="new-project-inline">
      <NewProjectModal open={true} onclose={() => showNewProject = false} inline />
    </div>
  </div>
{:else}
  <div class="workspace">
    <!-- Left panel: Structure + Images -->
    <aside class="panel panel-left">
      <SectionSelector />
      <ImageList />
      <PrintSettings />
    </aside>

    <!-- Main preview area -->
    <MainArea>
      <PreviewCanvas />
    </MainArea>

    <!-- Right panel: Effects -->
    <aside class="panel panel-right">
      <EffectPicker />
      <EffectSettings />
      <BorderSettings />
    </aside>
  </div>
{/if}

<!-- Mobile: tabbed drawer (hidden on desktop) -->
<MobileTabs />

<StatusBar />

<style>
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .new-project-inline {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
  }

  .panel {
    background: var(--surface);
    border-color: var(--border);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .panel-left {
    width: 240px;
    border-right: 1px solid var(--border);
  }

  .panel-right {
    width: 240px;
    border-left: 1px solid var(--border);
  }

  /* Compact sidebars for narrow desktop / landscape / tablet */
  @media (max-width: 900px) {
    .panel-left,
    .panel-right {
      width: 180px;
    }
  }

  /* Mobile: single column */
  @media (max-width: 640px) {
    .workspace {
      flex-direction: column;
    }

    .panel {
      display: none;
    }

    .workspace :global(.main-area) {
      flex: 1;
      min-height: 0;
    }
  }
</style>
