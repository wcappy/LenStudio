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

  const tabs: Tab[] = ['images', 'effect', 'settings', 'export'];

  const drawerOpen = $derived(activeTab !== null);

  function handleTabClick(id: Tab) {
    activeTab = activeTab === id ? null : id;
  }

  function closeDrawer() {
    activeTab = null;
  }

  // Swipe-to-dismiss
  let touchStartY = 0;
  function handleDrawerTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }
  function handleDrawerTouchEnd(e: TouchEvent) {
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy > 60) closeDrawer();
  }
</script>

<div class="mobile-tabs" class:open={drawerOpen}>
  {#if drawerOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="drawer-backdrop" onclick={closeDrawer}></div>
  {/if}

  <div
    class="drawer-panel"
    class:open={drawerOpen}
    ontouchstart={handleDrawerTouchStart}
    ontouchend={handleDrawerTouchEnd}
  >
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
        class:active={activeTab === tab}
        onclick={() => handleTabClick(tab)}
      >
        <span class="tab-icon">
          {#if tab === 'images'}
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="16" height="16" rx="2" />
              <polyline points="2 13 6 9 10 13" />
              <polyline points="9 11 13 7 18 12" />
              <circle cx="13" cy="6" r="1.5" />
            </svg>
          {:else if tab === 'effect'}
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z" />
            </svg>
          {:else if tab === 'settings'}
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="10" cy="10" r="3" />
              <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" />
            </svg>
          {:else if tab === 'export'}
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 10 L10 3 L14 10" />
              <line x1="10" y1="3" x2="10" y2="14" />
              <path d="M3 13v3a1 1 0 001 1h12a1 1 0 001-1v-3" />
            </svg>
          {/if}
        </span>
        <span class="tab-label">{tab[0].toUpperCase() + tab.slice(1)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 640px) {
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
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    transform: translateY(100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 45vh;
    overflow: hidden;
  }

  .drawer-panel.open {
    transform: translateY(0);
  }

  .drawer-handle-bar {
    display: flex;
    justify-content: center;
    padding: 8px 0 4px;
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
    gap: 2px;
    padding: 6px 4px 5px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .tab-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20px;
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
