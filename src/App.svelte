<script lang="ts">
  import { projectState } from './lib/stores/project.svelte.js';
  import Header from './components/layout/Header.svelte';
  import Sidebar from './components/layout/Sidebar.svelte';
  import MainArea from './components/layout/MainArea.svelte';
  import StatusBar from './components/layout/StatusBar.svelte';
  import MobileImageStrip from './components/layout/MobileImageStrip.svelte';
  import MobileTabs from './components/layout/MobileTabs.svelte';
  import LayoutPicker from './components/layout/LayoutPicker.svelte';
  import SectionSelector from './components/layout/SectionSelector.svelte';
  import ImageList from './components/upload/ImageList.svelte';
  import EffectPicker from './components/settings/EffectPicker.svelte';
  import PrintSettings from './components/settings/PrintSettings.svelte';
  import EffectSettings from './components/settings/EffectSettings.svelte';
  import PreviewCanvas from './components/preview/PreviewCanvas.svelte';

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

<Header />

<div class="workspace">
  <!-- Desktop sidebar -->
  <Sidebar>
    <LayoutPicker />
    <SectionSelector />
    <ImageList />
    <EffectPicker />
    <PrintSettings />
    <EffectSettings />
  </Sidebar>

  <!-- Main preview area -->
  <MainArea>
    <PreviewCanvas />
  </MainArea>
</div>

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

  @media (max-width: 768px) {
    .workspace {
      flex-direction: column;
    }

    .workspace :global(.sidebar) {
      display: none;
    }

    .workspace :global(.main-area) {
      flex: none;
      height: 50vh;
    }
  }
</style>
