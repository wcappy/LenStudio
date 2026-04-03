<script lang="ts">
  import { projectState } from './lib/stores/project.svelte.js';
  import Header from './components/layout/Header.svelte';
  import MainArea from './components/layout/MainArea.svelte';
  import StatusBar from './components/layout/StatusBar.svelte';
  import MobileImageStrip from './components/layout/MobileImageStrip.svelte';
  import MobileTabs from './components/layout/MobileTabs.svelte';
  import SectionSelector from './components/layout/SectionSelector.svelte';
  import ImageList from './components/upload/ImageList.svelte';
  import EffectPicker from './components/settings/EffectPicker.svelte';
  import PrintSettings from './components/settings/PrintSettings.svelte';
  import BorderSettings from './components/settings/BorderSettings.svelte';
  import EffectSettings from './components/settings/EffectSettings.svelte';
  import PreviewCanvas from './components/preview/PreviewCanvas.svelte';
  import NewProjectModal from './components/layout/NewProjectModal.svelte';

  let showNewProject = $state(false);

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
</script>

<svelte:window ondrop={handleGlobalDrop} ondragover={handleGlobalDragOver} />

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

<!-- Mobile: image strip + tabbed controls (hidden on desktop) -->
<MobileImageStrip />
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

  @media (max-width: 768px) {
    .workspace {
      flex-direction: column;
    }

    .panel {
      display: none;
    }

    .workspace :global(.main-area) {
      flex: none;
      height: 50vh;
    }
  }
</style>
