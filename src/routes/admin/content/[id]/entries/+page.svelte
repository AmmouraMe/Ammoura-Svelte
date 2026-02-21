<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { page as pageStore } from '$app/stores';
  import { confirmStore } from '$lib/stores/confirm';
  import { toastStore } from '$lib/stores/toast';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageData } from './$types';

  export let data: PageData;

  $: contentType = data.contentType;
  $: entries = data.entries || [];
  $: total = data.total;
  $: currentPage = data.currentPage;
  $: totalPages = data.totalPages;

  let searchQuery = data.search || '';
  let statusFilter = data.statusFilter || '';

  const handleFormResult: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        toastStore.success('Action completed');
      } else if (result.type === 'failure') {
        const err =
          (result.data as Record<string, unknown> | undefined)?.error ?? 'An error occurred';
        toastStore.error(err as string);
      }
      pendingAction = null;
      await update();
    };
  };

  function applyFilters(): void {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter) params.set('status', statusFilter);
    goto(`/admin/content/${contentType.id}/entries?${params.toString()}`);
  }

  function goToPage(p: number): void {
    const params = new URLSearchParams($pageStore.url.searchParams);
    params.set('page', p.toString());
    goto(`/admin/content/${contentType.id}/entries?${params.toString()}`);
  }

  async function handleDelete(entryId: string, title: string): Promise<void> {
    const confirmed = await confirmStore.show(`Delete "${title}" permanently?`, {
      title: 'Delete Entry',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (confirmed) {
      pendingAction = { type: 'delete', entryId };
    }
  }

  let pendingAction: { type: string; entryId: string } | null = null;

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>{contentType.name} Entries - Admin</title>
</svelte:head>

<div class="entries-page">
  <div class="page-header">
    <button class="btn btn-ghost" on:click={() => goto('/admin/content')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline
          points="15 18 9 12 15 6"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Back
    </button>
    <div class="header-text">
      <h1>
        <span class="type-icon">{contentType.icon || '📄'}</span>
        {contentType.name}
      </h1>
      <p class="subtitle">{total} {total === 1 ? 'entry' : 'entries'}</p>
    </div>
    <div class="header-actions">
      <button
        class="btn btn-secondary"
        on:click={() => goto(`/admin/content/${contentType.id}/edit`)}
      >
        Settings
      </button>
      <button
        class="btn btn-primary"
        on:click={() => goto(`/admin/content/${contentType.id}/entries/create`)}
      >
        + New Entry
      </button>
    </div>
  </div>

  <!-- Filters bar -->
  <div class="filters-bar">
    <div class="search-group">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search entries..."
        on:keydown={(e) => e.key === 'Enter' && applyFilters()}
      />
      <button class="btn btn-sm btn-secondary" on:click={applyFilters}>Search</button>
    </div>
    <select bind:value={statusFilter} on:change={applyFilters}>
      <option value="">All statuses</option>
      <option value="draft">Draft</option>
      <option value="published">Published</option>
      <option value="archived">Archived</option>
    </select>
  </div>

  {#if entries.length === 0}
    <div class="empty-state">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        opacity="0.4"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-width="1.5" />
        <path d="M14 2v6h6" stroke-width="1.5" />
      </svg>
      <h2>No entries yet</h2>
      <p>Create your first {contentType.name.toLowerCase()} entry.</p>
      <button
        class="btn btn-primary"
        on:click={() => goto(`/admin/content/${contentType.id}/entries/create`)}
      >
        Create Entry
      </button>
    </div>
  {:else}
    <div class="entries-table">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Slug</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each entries as entry (entry.id)}
            <tr>
              <td class="title-cell">
                <a href="/admin/content/{contentType.id}/entries/{entry.id}/edit">
                  {entry.title}
                </a>
              </td>
              <td>
                <span
                  class="status-badge"
                  class:published={entry.status === 'published'}
                  class:draft={entry.status === 'draft'}
                  class:archived={entry.status === 'archived'}
                >
                  {entry.status}
                </span>
              </td>
              <td class="slug-cell">{entry.slug}</td>
              <td class="date-cell">{formatDate(entry.updatedAt)}</td>
              <td class="actions-cell">
                <button
                  class="btn btn-sm btn-outline"
                  on:click={() => goto(`/admin/content/${contentType.id}/entries/${entry.id}/edit`)}
                >
                  Edit
                </button>
                {#if entry.status === 'draft'}
                  <form
                    method="POST"
                    action="?/publish"
                    use:enhance={handleFormResult}
                    style="display:inline"
                  >
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button type="submit" class="btn btn-sm btn-success">Publish</button>
                  </form>
                {:else if entry.status === 'published'}
                  <form
                    method="POST"
                    action="?/unpublish"
                    use:enhance={handleFormResult}
                    style="display:inline"
                  >
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button type="submit" class="btn btn-sm btn-outline">Unpublish</button>
                  </form>
                {/if}
                <button
                  class="btn btn-sm btn-ghost btn-danger"
                  on:click={() => handleDelete(entry.id, entry.title)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="3 6 5 6 21 6" stroke-width="2" />
                    <path
                      d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      stroke-width="2"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="btn btn-sm btn-outline"
          disabled={currentPage <= 1}
          on:click={() => goToPage(currentPage - 1)}
        >
          Previous
        </button>
        <span class="page-info">Page {currentPage} of {totalPages}</span>
        <button
          class="btn btn-sm btn-outline"
          disabled={currentPage >= totalPages}
          on:click={() => goToPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}

  <!-- Hidden delete form -->
  {#if pendingAction?.type === 'delete'}
    <form method="POST" action="?/delete" use:enhance={handleFormResult} style="display:none">
      <input type="hidden" name="entryId" value={pendingAction.entryId} />
      <button type="submit" class="auto-submit-entry-delete">Submit</button>
    </form>
    <script>
      document.querySelector('.auto-submit-entry-delete')?.click?.();
    </script>
  {/if}
</div>

<style>
  /* === Mobile-first base styles === */
  .entries-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .header-text {
    flex: 1;
  }

  .header-text h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .type-icon {
    font-size: 1.25rem;
  }

  .subtitle {
    margin: 0.25rem 0 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Filters */
  .filters-bar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .search-group {
    display: flex;
    gap: 0.5rem;
    flex: 1;
  }

  .search-group input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border-primary);
    border-radius: 8px;
    font-size: 0.875rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .search-group input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .search-group input::placeholder {
    color: var(--color-text-muted);
  }

  .filters-bar select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border-primary);
    border-radius: 8px;
    font-size: 0.875rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .filters-bar select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  /* Table */
  .entries-table {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-primary);
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal),
      border-color var(--transition-normal);
  }

  td {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--color-border-primary);
    color: var(--color-text-primary);
    transition:
      color var(--transition-normal),
      border-color var(--transition-normal);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .title-cell a {
    color: var(--color-text-primary);
    text-decoration: none;
    font-weight: 500;
    transition: color var(--transition-fast);
  }

  .title-cell a:hover {
    color: var(--color-primary);
  }

  .slug-cell {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .date-cell {
    color: var(--color-text-secondary);
    white-space: nowrap;
    transition: color var(--transition-normal);
  }

  .actions-cell {
    display: flex;
    gap: 0.375rem;
    align-items: center;
  }

  /* Status badges */
  .status-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-badge.published {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .status-badge.draft {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  .status-badge.archived {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .page-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
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
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .empty-state p {
    margin: 0 0 1.5rem;
    color: var(--color-text-muted);
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

  .btn-success {
    background: var(--color-success);
    color: var(--color-text-inverse);
  }

  .btn-success:hover {
    background: var(--color-success-hover);
  }

  .btn-ghost {
    background: transparent;
    border: none;
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

  /* === Tablet (768px+) === */
  @media (min-width: 768px) {
    .entries-page {
      padding: 1.5rem;
    }

    .page-header {
      flex-direction: row;
      align-items: center;
    }

    .header-text h1 {
      font-size: 1.5rem;
    }

    .filters-bar {
      flex-direction: row;
      align-items: center;
    }

    .search-group {
      max-width: 400px;
    }

    .empty-state {
      padding: 4rem 2rem;
    }
  }

  /* === Desktop (1024px+) === */
  @media (min-width: 1024px) {
    .entries-page {
      padding: 2rem;
    }
  }
</style>
