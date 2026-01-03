<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { confirmStore } from '$lib/stores/confirm';
  import type { PageData } from './$types';

  export let data: PageData;

  let isDeleting = false;
  let _pendingDeleteLayoutId: number | null = null;

  async function handleDeleteLayout(layoutId: number): Promise<void> {
    const confirmed = await confirmStore.show('Are you sure you want to delete this layout?', {
      title: 'Delete Layout',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (confirmed) {
      _pendingDeleteLayoutId = layoutId;
      // Trigger form submission
      const form = document.getElementById(`delete-layout-${layoutId}`) as HTMLFormElement;
      if (form) form.requestSubmit();
    }
  }

  function handleEdit(layoutId: number): void {
    goto(`/admin/builder/layout/${layoutId}`);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<svelte:head>
  <title>Layouts - Admin</title>
</svelte:head>

<div class="layouts-page">
  <div class="page-header">
    <div>
      <h1>Layouts</h1>
      <p class="page-description">Manage page layouts for your site</p>
    </div>
    <a href="/admin/builder/layout" class="btn btn-primary">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      Create Layout
    </a>
  </div>

  {#if data.layouts.length === 0}
    <div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9" stroke-width="2"></line>
        <line x1="9" y1="21" x2="9" y2="9" stroke-width="2"></line>
      </svg>
      <h2>No layouts yet</h2>
      <p>Create your first layout to define the structure of your pages</p>
      <a href="/admin/builder/layout" class="btn btn-primary">Create Layout</a>
    </div>
  {:else}
    <div class="layouts-grid">
      {#each data.layouts as layout (layout.id)}
        <div class="layout-card">
          <div class="layout-header">
            <div>
              <h3>{layout.name}</h3>
              {#if layout.description}
                <p class="layout-description">{layout.description}</p>
              {/if}
            </div>
            {#if layout.is_default}
              <span class="default-badge">Default</span>
            {/if}
          </div>

          <div class="layout-meta">
            <span>Slug: <code>{layout.slug}</code></span>
            <span>Created: {formatDate(layout.created_at)}</span>
          </div>

          <div class="layout-actions">
            <button class="btn btn-secondary" on:click={() => handleEdit(layout.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
                <path
                  d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
              </svg>
              Edit
            </button>

            {#if !layout.is_default}
              <form method="POST" action="?/setDefault" use:enhance>
                <input type="hidden" name="layoutId" value={layout.id} />
                <button type="submit" class="btn btn-outline">Set as Default</button>
              </form>

              <form
                id="delete-layout-{layout.id}"
                method="POST"
                action="?/delete"
                use:enhance={() => {
                  isDeleting = true;
                  return async ({ update }) => {
                    await update();
                    isDeleting = false;
                    _pendingDeleteLayoutId = null;
                  };
                }}
              >
                <input type="hidden" name="layoutId" value={layout.id} />
                <button
                  type="button"
                  class="btn btn-danger"
                  disabled={isDeleting}
                  on:click={() => handleDeleteLayout(layout.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                  Delete
                </button>
              </form>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .layouts-page {
    padding: 2rem;
    width: 100%;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: var(--color-text-primary);
  }

  .page-description {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-dark);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  .btn-outline {
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
  }

  .btn-outline:hover {
    background: var(--color-bg-secondary);
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
  }

  .btn-danger:hover {
    background: var(--color-error-dark);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-secondary);
  }

  .empty-state svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h2 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
  }

  .layouts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .layout-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 200px;
  }

  .layout-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .layout-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .layout-description {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .default-badge {
    background: var(--color-primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .layout-meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .layout-meta code {
    background: var(--color-bg-secondary);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.8125rem;
  }

  .layout-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border-secondary);
    margin-top: auto;
  }

  .layout-actions form {
    display: contents;
  }

  @media (max-width: 768px) {
    .layouts-page {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
    }

    .layouts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
