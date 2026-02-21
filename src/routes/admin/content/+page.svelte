<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { confirmStore } from '$lib/stores/confirm';
  import { toastStore } from '$lib/stores/toast';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageData } from './$types';

  export let data: PageData;

  $: contentTypes = data.contentTypes || [];
  $: activeTypes = contentTypes.filter((ct) => ct.status === 'active');
  $: archivedTypes = contentTypes.filter((ct) => ct.status === 'archived');

  let deletingId: string | null = null;
  let archivingId: string | null = null;

  async function handleDelete(id: string, name: string): Promise<void> {
    const confirmed = await confirmStore.show(`Delete "${name}" and all its entries permanently?`, {
      title: 'Delete Content Type',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (confirmed) {
      deletingId = id;
    }
  }

  async function handleArchive(id: string, name: string): Promise<void> {
    const confirmed = await confirmStore.show(
      `Archive "${name}"? It will be hidden from the storefront but can be restored.`,
      {
        title: 'Archive Content Type',
        confirmText: 'Archive',
        cancelText: 'Cancel',
        variant: 'warning'
      }
    );
    if (confirmed) {
      archivingId = id;
    }
  }

  const handleFormResult: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        toastStore.success('Action completed successfully');
      } else if (result.type === 'failure') {
        const err =
          (result.data as Record<string, unknown> | undefined)?.error ?? 'An error occurred';
        toastStore.error(err as string);
      }
      deletingId = null;
      archivingId = null;
      await update();
    };
  };
</script>

<svelte:head>
  <title>Content Types - Admin</title>
</svelte:head>

<div class="content-types-page">
  <div class="page-header">
    <div class="header-text">
      <h1>Content Types</h1>
      <p class="subtitle">Manage custom content types like blogs, FAQs, and more</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" on:click={() => goto('/admin/content/create')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round" />
        </svg>
        New Content Type
      </button>
    </div>
  </div>

  {#if activeTypes.length === 0 && archivedTypes.length === 0}
    <div class="empty-state">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        opacity="0.4"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-width="1.5" />
        <path d="M14 2v6h6" stroke-width="1.5" />
        <line x1="16" y1="13" x2="8" y2="13" stroke-width="1.5" />
        <line x1="16" y1="17" x2="8" y2="17" stroke-width="1.5" />
      </svg>
      <h2>No content types yet</h2>
      <p>
        Create your first content type to start managing structured content like blog posts, FAQs,
        and more.
      </p>
      <button class="btn btn-primary" on:click={() => goto('/admin/content/create')}>
        Create Content Type
      </button>
    </div>
  {:else}
    {#if activeTypes.length > 0}
      <div class="section">
        <h2 class="section-title">Active Content Types</h2>
        <div class="content-type-grid">
          {#each activeTypes as ct (ct.id)}
            <div class="content-type-card">
              <div class="card-header">
                <div class="card-icon">{ct.icon || '📄'}</div>
                <div class="card-info">
                  <h3>{ct.name}</h3>
                  {#if ct.description}
                    <p class="card-description">{ct.description}</p>
                  {/if}
                </div>
              </div>

              <div class="card-details">
                <span class="detail-chip" title="Entries">
                  {ct.entryCount} entries
                </span>
                <span class="detail-chip" title="Published">
                  {ct.publishedCount} published
                </span>
                <span class="detail-chip" title="Fields">
                  {ct.fieldsSchema.length} fields
                </span>
                <span class="detail-chip detail-path" title="Path">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <path
                      d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  /{ct.slug}
                </span>
              </div>

              <div class="card-actions">
                <button
                  class="btn btn-sm btn-secondary"
                  on:click={() => goto(`/admin/content/${ct.id}/entries`)}
                >
                  View Entries
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  on:click={() => goto(`/admin/content/${ct.id}/edit`)}
                >
                  Edit
                </button>
                <div class="action-more">
                  <button
                    class="btn btn-sm btn-ghost"
                    on:click={() => handleArchive(ct.id, ct.name)}
                    title="Archive"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <polyline points="21 8 21 21 3 21 3 8" stroke-width="2" />
                      <rect x="1" y="3" width="22" height="5" stroke-width="2" />
                      <line x1="10" y1="12" x2="14" y2="12" stroke-width="2" />
                    </svg>
                  </button>
                  <button
                    class="btn btn-sm btn-ghost btn-danger"
                    on:click={() => handleDelete(ct.id, ct.name)}
                    title="Delete"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <polyline points="3 6 5 6 21 6" stroke-width="2" />
                      <path
                        d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                        stroke-width="2"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Hidden forms for delete/archive actions -->
              {#if deletingId === ct.id}
                <form method="POST" action="?/delete" use:enhance={handleFormResult}>
                  <input type="hidden" name="contentTypeId" value={ct.id} />
                  <button type="submit" style="display:none" class="auto-submit">Submit</button>
                </form>
                <script>
                  document.querySelector('.auto-submit')?.click?.();
                </script>
              {/if}
              {#if archivingId === ct.id}
                <form method="POST" action="?/archive" use:enhance={handleFormResult}>
                  <input type="hidden" name="contentTypeId" value={ct.id} />
                  <button type="submit" style="display:none" class="auto-submit-archive"
                    >Submit</button
                  >
                </form>
                <script>
                  document.querySelector('.auto-submit-archive')?.click?.();
                </script>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if archivedTypes.length > 0}
      <div class="section">
        <h2 class="section-title">Archived</h2>
        <div class="content-type-grid">
          {#each archivedTypes as ct (ct.id)}
            <div class="content-type-card archived">
              <div class="card-header">
                <div class="card-icon">{ct.icon || '📄'}</div>
                <div class="card-info">
                  <h3>{ct.name}</h3>
                  <span class="badge badge-archived">Archived</span>
                </div>
              </div>
              <div class="card-actions">
                <button
                  class="btn btn-sm btn-outline"
                  on:click={() => goto(`/admin/content/${ct.id}/edit`)}
                >
                  Restore / Edit
                </button>
                <button
                  class="btn btn-sm btn-ghost btn-danger"
                  on:click={() => handleDelete(ct.id, ct.name)}
                  title="Delete permanently"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="3 6 5 6 21 6" stroke-width="2" />
                    <path
                      d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      stroke-width="2"
                    />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* === Mobile-first base styles === */
  .content-types-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .header-text h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal),
      border-color var(--transition-normal),
      transform var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border-color: var(--color-border-primary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  .btn-outline {
    background: transparent;
    color: var(--color-text-primary);
    border-color: var(--color-border-primary);
  }

  .btn-outline:hover {
    background: var(--color-bg-secondary);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    padding: 0.375rem;
  }

  .btn-ghost:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .btn-danger {
    color: var(--color-danger);
  }

  .btn-danger:hover {
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  /* Sections */
  .section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  /* Grid - mobile single column */
  .content-type-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  /* Cards */
  .content-type-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    padding: 1rem;
    transition:
      background-color var(--transition-normal),
      box-shadow var(--transition-normal),
      border-color var(--transition-normal),
      transform var(--transition-normal);
  }

  .content-type-card:hover {
    box-shadow: 0 4px 12px var(--color-shadow-medium);
    transform: translateY(-2px);
  }

  .content-type-card.archived {
    opacity: 0.7;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.625rem;
  }

  .card-icon {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .card-info h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .card-description {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
    transition: color var(--transition-normal);
  }

  .card-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 0.75rem;
  }

  .detail-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.175rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    background: var(--color-bg-secondary);
    transition:
      color var(--transition-normal),
      background-color var(--transition-normal);
  }

  .detail-path {
    color: var(--color-text-muted);
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .action-more {
    margin-left: auto;
    display: flex;
    gap: 0.25rem;
  }

  .badge-archived {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
    background: var(--color-bg-primary);
    border: 1px dashed var(--color-border-primary);
    border-radius: 12px;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  .empty-state svg {
    color: var(--color-text-muted);
    transition: color var(--transition-normal);
  }

  .empty-state h2 {
    margin: 1rem 0 0.5rem;
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .empty-state p {
    margin: 0 0 1.5rem;
    color: var(--color-text-muted);
    max-width: 400px;
    transition: color var(--transition-normal);
  }

  /* === Tablet (768px+) === */
  @media (min-width: 768px) {
    .content-types-page {
      padding: 1.5rem;
    }

    .page-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-text h1 {
      font-size: 1.75rem;
    }

    .content-type-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }

    .empty-state {
      padding: 4rem 2rem;
    }
  }

  /* === Desktop (1024px+) === */
  @media (min-width: 1024px) {
    .content-types-page {
      padding: 2rem;
    }

    .content-type-grid {
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    }
  }
</style>
