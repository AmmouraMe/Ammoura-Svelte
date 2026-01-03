<script lang="ts">
  import { goto } from '$app/navigation';
  import { confirmStore } from '$lib/stores/confirm';
  import { toastStore } from '$lib/stores/toast';
  import type { EnrichedPage } from '$lib/server/db/pages';

  export let row: EnrichedPage;

  // A page is considered published if:
  // 1. It has a published_at timestamp (from published_revision_id join), OR
  // 2. Its status field is 'published'
  $: hasPublished = !!row.published_at || row.status === 'published';

  // Show View button if page has been published
  $: showView = hasPublished;

  // Show Preview button if:
  // 1. There are unpublished changes (draft is newer than published), OR
  // 2. Page has never been published (preview the draft)
  $: showPreview = row.has_unpublished_changes || !hasPublished;

  async function handleDelete(): Promise<void> {
    const confirmed = await confirmStore.show('Are you sure you want to delete this page?', {
      title: 'Delete Page',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/pages/${row.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      toastStore.success('Page deleted successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting page:', error);
      toastStore.error('Failed to delete page');
    }
  }

  function handleEdit(): void {
    goto(`/admin/builder/${row.id}`);
  }
</script>

<div class="actions">
  {#if showView}
    <a
      href={row.slug}
      target="_blank"
      rel="noopener noreferrer"
      class="view-btn"
      title="View published page"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
      <span class="btn-text">View</span>
    </a>
  {/if}
  {#if showPreview}
    <a
      href="{row.slug}?preview"
      target="_blank"
      rel="noopener noreferrer"
      class="preview-btn"
      title="Preview draft page"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        <circle cx="12" cy="12" r="3" stroke-width="2"></circle>
      </svg>
      <span class="btn-text">Preview</span>
    </a>
  {/if}
  <button class="edit-btn" on:click={handleEdit}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke-width="2"
      ></path>
    </svg>
    <span class="btn-text">Edit</span>
  </button>
  <button class="delete-btn" on:click={handleDelete}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
  </button>
</div>

<style>
  .actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-end;
  }

  .view-btn,
  .preview-btn,
  .edit-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .view-btn {
    background: var(--color-success);
    color: var(--color-text-inverse);
  }

  .view-btn:hover {
    background: var(--color-success);
    opacity: 0.9;
  }

  .preview-btn {
    background: var(--color-bg-accent);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
  }

  .preview-btn:hover {
    background: var(--color-bg-secondary);
  }

  .edit-btn {
    background: var(--color-secondary);
    color: var(--color-text-inverse);
  }

  .edit-btn:hover {
    background: var(--color-secondary-hover);
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: transparent;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    border-radius: 6px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .delete-btn:hover {
    background: var(--color-danger);
    color: white;
  }

  @media (max-width: 767px) {
    .btn-text {
      display: none;
    }

    .view-btn,
    .preview-btn,
    .edit-btn {
      padding: 0.5rem;
    }
  }
</style>
