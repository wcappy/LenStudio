<script lang="ts">
  import { layoutStore } from '../../lib/stores/layout.svelte.js';
  import { projectState } from '../../lib/stores/project.svelte.js';
  import { listProjects, loadProject, deleteProject, saveProject, type ProjectMeta } from '../../lib/stores/persistence.js';
  import type { LayoutPreset } from '../../lib/types/index.js';

  let { onopen, onnew }: { onopen: () => void; onnew: () => void } = $props();

  let projects = $state<ProjectMeta[]>([]);
  let loading = $state(true);
  let confirmDeleteId = $state<string | null>(null);

  async function refresh() {
    loading = true;
    projects = await listProjects();
    loading = false;
  }

  refresh();

  async function openProject(id: string) {
    const result = await loadProject(id);
    if (!result) return;
    layoutStore.loadFromProject(
      result.root,
      result.data.preset as LayoutPreset,
      result.data.name,
      id
    );
    projectState.lpi = result.data.settings.lpi;
    projectState.dpi = result.data.settings.dpi;
    projectState.outputWidthInches = result.data.settings.outputWidthInches;
    projectState.outputHeightInches = result.data.settings.outputHeightInches;
    if (result.data.settings.border) projectState.border = result.data.settings.border;
    onopen();
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    confirmDeleteId = null;
    await refresh();
  }

  let saving = $state(false);
  async function handleSaveCurrent() {
    saving = true;
    await saveProject(layoutStore.projectId, layoutStore.projectName, layoutStore.root, layoutStore.preset, {
      lpi: projectState.lpi,
      dpi: projectState.dpi,
      outputWidthInches: projectState.outputWidthInches,
      outputHeightInches: projectState.outputHeightInches,
      border: projectState.border,
    });
    await refresh();
    saving = false;
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  }
</script>

<div class="gallery">
  <div class="gallery-header">
    <h2 class="gallery-title">My Projects</h2>
    <div class="gallery-actions">
      <button class="btn-ghost save-current" onclick={handleSaveCurrent} disabled={saving}>
        {saving ? 'Saving...' : 'Save Current'}
      </button>
      <button class="btn-primary" onclick={onnew}>
        + New Project
      </button>
    </div>
  </div>

  {#if loading}
    <div class="gallery-empty">
      <div class="loading-spinner"></div>
      <p>Loading projects...</p>
    </div>
  {:else if projects.length === 0}
    <div class="gallery-empty">
      <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
        <rect x="6" y="6" width="36" height="36" rx="4" />
        <line x1="6" y1="20" x2="42" y2="20" />
        <line x1="20" y1="6" x2="20" y2="42" />
      </svg>
      <p>No saved projects yet</p>
      <p class="gallery-empty-sub">Create a new project or save your current work</p>
    </div>
  {:else}
    <div class="project-grid">
      {#each projects as project (project.id)}
        <div class="project-card">
          <button class="card-body" onclick={() => openProject(project.id)}>
            <div class="card-icon">
              <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
                <rect x="3" y="4" width="26" height="24" rx="3" />
                <line x1="9" y1="4" x2="9" y2="28" opacity="0.3" />
                <line x1="16" y1="4" x2="16" y2="28" opacity="0.3" />
                <line x1="23" y1="4" x2="23" y2="28" opacity="0.3" />
              </svg>
            </div>
            <span class="card-name">{project.name}</span>
            <span class="card-meta">
              {project.sectionCount} section{project.sectionCount !== 1 ? 's' : ''} &bull;
              {project.frameCount} frame{project.frameCount !== 1 ? 's' : ''}
            </span>
            <span class="card-date">{formatDate(project.updatedAt)}</span>
          </button>
          <div class="card-actions">
            {#if confirmDeleteId === project.id}
              <button class="card-action danger" onclick={() => handleDelete(project.id)}>Confirm</button>
              <button class="card-action" onclick={() => (confirmDeleteId = null)}>Cancel</button>
            {:else}
              <button class="card-action danger" onclick={() => (confirmDeleteId = project.id)} title="Delete project">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polyline points="3 4 4 14 12 14 13 4" />
                  <line x1="1" y1="4" x2="15" y2="4" />
                  <path d="M6 4V2h4v2" />
                </svg>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .gallery {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 32px;
    overflow-y: auto;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  .gallery-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .gallery-title {
    font-size: 20px;
    font-weight: 700;
  }

  .gallery-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .gallery-actions .btn-ghost,
  .save-current {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
  }

  .save-current:disabled {
    opacity: 0.5;
  }

  .gallery-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted);
    padding: 48px 0;
  }

  .gallery-empty p {
    font-size: 14px;
    font-weight: 500;
  }

  .gallery-empty-sub {
    font-size: 12px;
    opacity: 0.7;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .project-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .project-card:hover {
    border-color: var(--accent);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px 16px 12px;
    width: 100%;
    text-align: center;
    cursor: pointer;
    transition: background 0.15s;
  }

  .card-body:hover {
    background: var(--surface-hover);
  }

  .card-icon {
    margin-bottom: 4px;
  }

  .card-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    word-break: break-word;
  }

  .card-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .card-date {
    font-size: 10px;
    color: var(--text-muted);
    opacity: 0.7;
  }

  .card-actions {
    display: flex;
    justify-content: center;
    gap: 4px;
    padding: 6px;
    border-top: 1px solid var(--border);
  }

  .card-action {
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    color: var(--text-muted);
    transition: color 0.15s, background 0.15s;
  }

  .card-action:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .card-action.danger:hover {
    color: var(--danger, #e55);
    background: var(--danger-muted, rgba(238,85,85,0.1));
  }

  @media (max-width: 640px) {
    .gallery {
      padding: 16px;
    }

    .gallery-header {
      flex-direction: column;
      align-items: stretch;
    }

    .gallery-actions {
      justify-content: stretch;
    }

    .gallery-actions .btn-primary,
    .gallery-actions .btn-ghost {
      flex: 1;
      justify-content: center;
    }

    .project-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
    }
  }
</style>
