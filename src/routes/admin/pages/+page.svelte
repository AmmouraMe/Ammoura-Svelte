<script lang="ts">
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/admin/DataTable.svelte';
  import StatusCell from '$lib/components/admin/pages/StatusCell.svelte';
  import DateCell from '$lib/components/admin/pages/DateCell.svelte';
  import ActionsCell from '$lib/components/admin/pages/ActionsCell.svelte';
  import BuiltInActionsCell from '$lib/components/admin/pages/BuiltInActionsCell.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  $: tableData = data.pages as unknown as Array<Record<string, unknown>>;
  $: builtInTableData = data.builtInPages as unknown as Array<Record<string, unknown>>;

  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true
    },
    {
      key: 'slug',
      label: 'Slug',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      component: StatusCell
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      component: DateCell
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      component: ActionsCell,
      align: 'right' as const
    }
  ];

  // Built-in pages have a different actions cell (no delete option)
  const builtInColumns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true
    },
    {
      key: 'slug',
      label: 'Slug',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      component: StatusCell
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      component: DateCell
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      component: BuiltInActionsCell,
      align: 'right' as const
    }
  ];

  function handleCreate(): void {
    goto('/admin/builder');
  }
</script>

<svelte:head>
  <title>Pages - Hermes Admin</title>
</svelte:head>

<div class="pages-container">
  <div class="page-header">
    <div>
      <h1>Pages</h1>
      <p>Create and manage your site pages with the Builder</p>
    </div>
    <button class="create-btn" on:click={handleCreate}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      Create Page
    </button>
  </div>

  <!-- Built-in Pages Section -->
  {#if data.builtInPages && data.builtInPages.length > 0}
    <section class="pages-section builtin-section">
      <div class="section-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <polyline
              points="9,22 9,12 15,12 15,22"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></polyline>
          </svg>
          Built-in Pages
        </h2>
        <p class="section-description">
          System pages that come with your site. These can be customized but not deleted.
        </p>
      </div>
      <div class="content-card">
        <DataTable
          data={builtInTableData}
          columns={builtInColumns}
          itemsPerPage={10}
          emptyMessage="No built-in pages"
        />
      </div>
    </section>
  {/if}

  <!-- Custom Pages Section -->
  <section class="pages-section custom-section">
    <div class="section-header">
      <h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          <path d="M14 2v6h6" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        Custom Pages
      </h2>
      <p class="section-description">Pages you've created for your site.</p>
    </div>
    <div class="content-card">
      {#if data.pages.length === 0}
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke-width="2" stroke-linecap="round"
            ></path>
          </svg>
          <h3>No custom pages yet</h3>
          <p>Create your first page to get started with the Builder</p>
          <button class="create-btn" on:click={handleCreate}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"></path>
            </svg>
            Create Page
          </button>
        </div>
      {:else}
        <DataTable data={tableData} {columns} itemsPerPage={10} emptyMessage="No pages found" />
      {/if}
    </div>
  </section>
</div>

<style>
  /* Mobile-first styles */
  .pages-container {
    width: 100%;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  h1 {
    color: var(--color-text-primary);
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    transition: color var(--transition-normal);
  }

  .page-header p {
    color: var(--color-text-secondary);
    margin: 0;
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  .create-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    width: 100%;
    transition:
      background-color var(--transition-normal),
      transform var(--transition-normal);
  }

  .create-btn:hover {
    background: var(--color-primary-hover);
    transform: translateY(-2px);
  }

  .content-card {
    background: var(--color-bg-primary);
    border-radius: 8px;
    padding: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow-x: auto;
    transition:
      background-color var(--transition-normal),
      box-shadow var(--transition-normal);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }

  .empty-state svg {
    color: var(--color-text-tertiary);
    margin-bottom: 1rem;
    opacity: 0.5;
    width: 48px;
    height: 48px;
  }

  .empty-state p {
    color: var(--color-text-secondary);
    margin: 0 0 1.5rem 0;
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  /* Tablet and up */
  @media (min-width: 768px) {
    .page-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 2rem;
    }

    .page-header p {
      font-size: 1rem;
    }

    .create-btn {
      width: auto;
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
    }

    .content-card {
      padding: 0;
      border-radius: 12px;
    }

    .empty-state {
      padding: 4rem 2rem;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
    }

    .empty-state h3 {
      font-size: 1.5rem;
    }

    .empty-state p {
      font-size: 1rem;
      margin-bottom: 2rem;
    }
  }

  /* Section styles */
  .pages-section {
    margin-bottom: 2rem;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .section-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-primary);
    font-size: 1.25rem;
    margin: 0 0 0.25rem 0;
    transition: color var(--transition-normal);
  }

  .section-header h2 svg {
    color: var(--color-text-secondary);
  }

  .section-description {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin: 0;
    transition: color var(--transition-normal);
  }

  .builtin-section {
    margin-bottom: 2.5rem;
  }

  .builtin-section .section-header h2 svg {
    color: var(--color-primary);
  }

  .empty-state h3 {
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    transition: color var(--transition-normal);
  }

  @media (min-width: 768px) {
    .section-header h2 {
      font-size: 1.5rem;
    }

    .section-description {
      font-size: 1rem;
    }
  }
</style>
