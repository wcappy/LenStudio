<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<aside class="sidebar">
  {@render children()}
</aside>

<style>
  .sidebar {
    width: 320px;
    min-width: 320px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  @media (max-width: 640px) {
    .sidebar {
      display: none;
    }
  }
</style>
