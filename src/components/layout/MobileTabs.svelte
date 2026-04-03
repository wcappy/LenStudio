<script lang="ts">
  import ImageList from '../upload/ImageList.svelte';
  import EffectPicker from '../settings/EffectPicker.svelte';
  import PrintSettings from '../settings/PrintSettings.svelte';
  import BorderSettings from '../settings/BorderSettings.svelte';
  import EffectSettings from '../settings/EffectSettings.svelte';
  import ExportModal from '../export/ExportModal.svelte';
  import { layoutStore } from '../../lib/stores/layout.svelte.js';

  let showExport = $state(false);

  type Tab = 'images' | 'effect' | 'settings' | 'export';
  let activeTab = $state<Tab>('images');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'images', label: 'Images' },
    { id: 'effect', label: 'Effect' },
    { id: 'settings', label: 'Settings' },
    { id: 'export', label: 'Export' },
  ];
</script>

<div class="mobile-tabs">
  <div class="tab-bar">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="tab-content">
    {#if activeTab === 'images'}
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

<style>
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 768px) {
    .mobile-tabs {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: 10px 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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
