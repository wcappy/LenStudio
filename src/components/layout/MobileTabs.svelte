<script lang="ts">
  import ImageList from '../upload/ImageList.svelte';
  import EffectPicker from '../settings/EffectPicker.svelte';
  import PrintSettings from '../settings/PrintSettings.svelte';
  import BorderSettings from '../settings/BorderSettings.svelte';
  import EffectSettings from '../settings/EffectSettings.svelte';
  import ExportModal from '../export/ExportModal.svelte';
  import MobileImageStrip from './MobileImageStrip.svelte';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  let showExport = $state(false);

  type Tab = 'images' | 'effect' | 'settings' | 'export';
  let activeTab = $state<Tab | null>(null);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'images', label: 'Images', icon: '🖼' },
    { id: 'effect', label: 'Effect', icon: '✦' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'export', label: 'Export', icon: '↗' },
  ];

  const drawerOpen = $derived(activeTab !== null);

  function handleTabClick(id: Tab) {
    activeTab = activeTab === id ? null : id;
  }

  function closeDrawer() {
    activeTab = null;
  }
</script>

<div class="mobile-tabs" class:open={drawerOpen}>
  {#if drawerOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="drawer-backdrop" onclick={closeDrawer}></div>
  {/if}

  <div class="drawer-panel" class:open={drawerOpen}>
    <div class="drawer-handle-bar">
      <div class="drawer-handle"></div>
    </div>
    <div class="drawer-content">
      {#if activeTab === 'images'}
        <MobileImageStrip />
        <ImageList />
      {:else if activeTab === 'effect'}
        <EffectPicker />
        <EffectSettings />
      {:else if activeTab === 'settings'}
        <PrintSettings />
        <BorderSettings />
      {:else if activeTab === 'export'}
        <div class="export-panel">
          <button
            class="btn-primary export-btn"
            onclick={() => (showExport = true)}
            disabled={!layoutStore.isAllReady}
          >
            Export Image
          </button>
          {#if !layoutStore.isAllReady}
            <p class="export-hint">Add images to all sections first</p>
          {/if}
        </div>
        <ExportModal bind:open={showExport} />
      {/if}
    </div>
  </div>

  <div class="tab-bar">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        onclick={() => handleTabClick(tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 768px) {
    .mobile-tabs {
      display: flex;
      flex-direction: column;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      pointer-events: none;
    }

    .mobile-tabs > * {
      pointer-events: auto;
    }
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: -1;
  }

  .drawer-panel {
    max-height: 0;
    overflow: hidden;
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    transition: max-height 0.25s ease;
  }

  .drawer-panel.open {
    max-height: 45vh;
  }

  .drawer-handle-bar {
    display: flex;
    justify-content: center;
    padding: 6px 0 2px;
  }

  .drawer-handle {
    width: 32px;
    height: 3px;
    border-radius: 3px;
    background: var(--text-muted);
    opacity: 0.4;
  }

  .drawer-content {
    overflow-y: auto;
    max-height: calc(45vh - 40px);
  }

  .tab-bar {
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .tab-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 6px 4px 5px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .tab-icon {
    font-size: 16px;
    line-height: 1;
  }

  .tab-label {
    font-size: 9px;
    line-height: 1;
  }

  .tab-btn.active {
    color: var(--accent);
  }

  .export-panel {
    padding: 24px 16px;
  }

  .export-btn {
    width: 100%;
    padding: 14px;
    font-size: 15px;
  }

  .export-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
  }
</style>
