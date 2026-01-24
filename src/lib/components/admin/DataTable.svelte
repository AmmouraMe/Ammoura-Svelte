<script lang="ts">
  type SortDirection = 'asc' | 'desc' | null;

  type DataRow = Record<string, unknown>;

  interface Column<T extends DataRow> {
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (value: unknown, row: T) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component?: any;
    align?: 'left' | 'center' | 'right';
  }

  export let data: DataRow[] = [];
  export let columns: Column<DataRow>[] = [];
  export let itemsPerPage: number = 10;
  export let emptyMessage: string = 'No data available';

  let currentPage: number = 1;
  let sortKey: keyof DataRow | null = null;
  let sortDirection: SortDirection = null;

  $: sortedData = (() => {
    if (!sortKey || !sortDirection) {
      return data;
    }

    const key = sortKey;
    return [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === bVal) return 0;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  })();

  $: paginatedData = (() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return sortedData.slice(startIdx, endIdx);
  })();

  $: totalPages = Math.ceil(data.length / itemsPerPage);

  function handleSort(key: keyof DataRow): void {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        sortKey = null;
        sortDirection = null;
      }
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
    currentPage = 1;
  }

  function goToPage(page: number): void {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function getCellValue(row: DataRow, column: Column<DataRow>): string {
    const value = row[column.key];
    if (column.render) {
      return column.render(value, row);
    }
    return String(value ?? '');
  }
</script>

{#if data.length === 0}
  <div class="empty-state">
    <p>{emptyMessage}</p>
  </div>
{:else}
  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as column}
            <th style="text-align: {column.align || 'left'}">
              {#if column.sortable !== false}
                <button
                  class="sort-button"
                  class:active={sortKey === column.key}
                  on:click={() => handleSort(column.key)}
                  type="button"
                >
                  {column.label}
                  <span class="sort-icon">
                    {#if sortKey === column.key}
                      {#if sortDirection === 'asc'}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path d="M12 19V5M5 12l7-7 7 7" stroke-width="2" stroke-linecap="round" />
                        </svg>
                      {:else}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path d="M12 5v14M5 12l7 7 7-7" stroke-width="2" stroke-linecap="round" />
                        </svg>
                      {/if}
                    {:else}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M7 15l5 5 5-5M7 9l5-5 5 5"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    {/if}
                  </span>
                </button>
              {:else}
                {column.label}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each paginatedData as row, index}
          <tr class:even={index % 2 === 1}>
            {#each columns as column}
              <td style="text-align: {column.align || 'left'}">
                {#if column.component}
                  <svelte:component this={column.component} {row} {column} />
                {:else}
                  {getCellValue(row, column)}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if totalPages > 1}
    <div class="pagination">
      <button
        class="pagination-btn"
        on:click={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M15 18l-6-6 6-6" stroke-width="2" stroke-linecap="round" />
        </svg>
        Previous
      </button>

      <div class="pagination-info">
        <span class="page-numbers">
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
            {#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
              <button
                class="page-btn"
                class:active={page === currentPage}
                on:click={() => goToPage(page)}
                type="button"
              >
                {page}
              </button>
            {:else if page === currentPage - 2 || page === currentPage + 2}
              <span class="ellipsis">...</span>
            {/if}
          {/each}
        </span>
        <span class="page-info">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <button
        class="pagination-btn"
        on:click={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        type="button"
      >
        Next
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  {/if}
{/if}

<style>
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .table-container {
    overflow-x: auto;
    margin-bottom: 0;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    border: none;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  thead tr {
    border: none;
    background: var(--color-bg-secondary);
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    border: none;
    background: var(--color-bg-secondary);
  }

  .sort-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: color var(--transition-fast);
  }

  .sort-button:hover {
    color: var(--color-text-primary);
  }

  .sort-button.active {
    color: var(--color-primary);
  }

  .sort-icon {
    display: flex;
    align-items: center;
    opacity: 0.5;
    transition: opacity var(--transition-fast);
  }

  .sort-button:hover .sort-icon,
  .sort-button.active .sort-icon {
    opacity: 1;
  }

  tbody tr {
    transition: background-color var(--transition-fast);
    border: none;
    background: var(--color-bg-primary);
  }

  tbody tr.even {
    background: var(--color-bg-tertiary);
  }

  tbody tr:hover {
    background: color-mix(in srgb, var(--color-primary-hover) 10%, transparent);
  }

  td {
    padding: 1rem;
    color: var(--color-text-primary);
    font-size: 0.9375rem;
    border: none;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 1.5rem;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .pagination-btn:hover:not(:disabled) {
    background: var(--color-bg-accent);
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pagination-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .page-numbers {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .page-btn {
    min-width: 2.5rem;
    height: 2.5rem;
    padding: 0.5rem;
    background: transparent;
    color: var(--color-text-primary);
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .page-btn:hover {
    background: var(--color-bg-secondary);
  }

  .page-btn.active {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .ellipsis {
    padding: 0 0.25rem;
    color: var(--color-text-tertiary);
  }

  .page-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    th,
    td {
      padding: 0.75rem;
      font-size: 0.875rem;
    }

    .pagination {
      flex-direction: column;
      gap: 1rem;
    }

    .pagination-info {
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }

    .page-numbers {
      justify-content: center;
    }
  }

  /* Tablet and desktop */
  @media (min-width: 768px) {
    .pagination {
      padding: 1.5rem 0;
    }
  }
</style>
