<script lang="ts">
  import { onMount } from 'svelte';

  interface ColumnInfo {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }

  interface IndexInfo {
    seq: number;
    name: string;
    unique: number;
    origin: string;
    partial: number;
  }

  interface ForeignKeyInfo {
    id: number;
    seq: number;
    table: string;
    from: string;
    to: string;
    on_update: string;
    on_delete: string;
    match: string;
  }

  interface TableSchema {
    name: string;
    type: 'table' | 'index' | 'view';
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreignKeys: ForeignKeyInfo[];
    rowCount: number;
  }

  interface DatabaseSchema {
    tables: TableSchema[];
    totalTables: number;
    totalIndexes: number;
  }

  interface TableData {
    tableName: string;
    data: Record<string, unknown>[];
    pagination: {
      page: number;
      limit: number;
      totalRows: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }

  type TabType = 'schema' | 'data';

  let schema: DatabaseSchema | null = null;
  let loading = true;
  let error = '';
  let expandedTables: Set<string> = new Set();
  let searchQuery = '';
  let activeTab: Map<string, TabType> = new Map();
  let tableData: Map<string, TableData> = new Map();
  let loadingData: Set<string> = new Set();
  let dataErrors: Map<string, string> = new Map();

  onMount(async () => {
    await loadSchema();
  });

  async function loadSchema() {
    try {
      loading = true;
      error = '';
      const response = await fetch('/api/admin/database/schema');

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || 'Failed to load database schema');
      }

      schema = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Failed to load database schema:', err);
    } finally {
      loading = false;
    }
  }

  async function loadTableData(tableName: string, page: number = 1) {
    try {
      loadingData.add(tableName);
      loadingData = loadingData;
      dataErrors.delete(tableName);
      dataErrors = dataErrors;

      const response = await fetch(
        `/api/admin/database/data?table=${encodeURIComponent(tableName)}&page=${page}&limit=50`
      );

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || 'Failed to load table data');
      }

      const data = (await response.json()) as TableData;
      tableData.set(tableName, data);
      tableData = tableData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      dataErrors.set(tableName, errorMsg);
      dataErrors = dataErrors;
      console.error('Failed to load table data:', err);
    } finally {
      loadingData.delete(tableName);
      loadingData = loadingData;
    }
  }

  function toggleTable(tableName: string) {
    if (expandedTables.has(tableName)) {
      expandedTables.delete(tableName);
    } else {
      expandedTables.add(tableName);
      // Set default tab to schema if not set
      if (!activeTab.has(tableName)) {
        activeTab.set(tableName, 'schema');
        activeTab = activeTab;
      }
    }
    expandedTables = expandedTables;
  }

  function setActiveTab(tableName: string, tab: TabType) {
    activeTab.set(tableName, tab);
    activeTab = activeTab;

    // Load data if switching to data tab and data not yet loaded
    if (tab === 'data' && !tableData.has(tableName) && !loadingData.has(tableName)) {
      loadTableData(tableName);
    }
  }

  function changePage(tableName: string, page: number) {
    loadTableData(tableName, page);
  }

  function expandAll() {
    if (schema) {
      expandedTables = new Set(schema.tables.map((t) => t.name));
    }
  }

  function collapseAll() {
    expandedTables = new Set();
  }

  $: filteredTables = schema?.tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getTypeColor(type: string): string {
    const lowerType = type.toLowerCase();
    // Use theme-specific colors for data types
    if (lowerType.includes('text')) return 'var(--color-type-text)';
    if (lowerType.includes('int')) return 'var(--color-type-integer)';
    if (lowerType.includes('real') || lowerType.includes('numeric'))
      return 'var(--color-type-real)';
    if (lowerType.includes('blob')) return 'var(--color-type-blob)';
    return 'var(--color-type-default)';
  }

  function formatValue(value: unknown): string {
    if (value === null) return 'NULL';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
</script>

<div class="database-navigator">
  <div class="header">
    <h2>Database Schema Navigator</h2>
    {#if schema}
      <div class="stats">
        <span class="stat">{schema.totalTables} tables</span>
        <span class="stat">{schema.totalIndexes} indexes</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading database schema...</p>
    </div>
  {:else if error}
    <div class="error">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
        <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"></line>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"></line>
      </svg>
      <p>{error}</p>
      <button on:click={loadSchema} class="retry-btn">Retry</button>
    </div>
  {:else if schema}
    <div class="controls">
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" stroke-width="2"></circle>
          <path d="m21 21-4.35-4.35" stroke-width="2"></path>
        </svg>
        <input
          type="text"
          placeholder="Search tables..."
          bind:value={searchQuery}
          class="search-input"
        />
      </div>
      <div class="action-buttons">
        <button on:click={expandAll} class="control-btn">Expand All</button>
        <button on:click={collapseAll} class="control-btn">Collapse All</button>
        <button on:click={loadSchema} class="control-btn">Refresh</button>
      </div>
    </div>

    <div class="tables-container">
      {#if filteredTables && filteredTables.length > 0}
        {#each filteredTables as table}
          <div class="table-card">
            <button class="table-header" on:click={() => toggleTable(table.name)}>
              <div class="table-info">
                <svg
                  class="expand-icon"
                  class:expanded={expandedTables.has(table.name)}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="9 18 15 12 9 6" stroke-width="2"></polyline>
                </svg>
                <span class="table-name">{table.name}</span>
                <span class="table-type" class:is-view={table.type === 'view'}>{table.type}</span>
              </div>
              <div class="table-meta">
                <span class="meta-item">{table.columns.length} columns</span>
                {#if table.rowCount >= 0}
                  <span class="meta-item">{table.rowCount.toLocaleString()} rows</span>
                {/if}
              </div>
            </button>

            {#if expandedTables.has(table.name)}
              <div class="table-details">
                <!-- Tabs -->
                <div class="tabs">
                  <button
                    class="tab"
                    class:active={activeTab.get(table.name) === 'schema'}
                    on:click={() => setActiveTab(table.name, 'schema')}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M4 6h16M4 12h16M4 18h16" stroke-width="2" stroke-linecap="round"
                      ></path>
                    </svg>
                    Schema
                  </button>
                  <button
                    class="tab"
                    class:active={activeTab.get(table.name) === 'data'}
                    on:click={() => setActiveTab(table.name, 'data')}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>
                    </svg>
                    Data
                    {#if table.rowCount > 0}
                      <span class="row-count">({table.rowCount.toLocaleString()})</span>
                    {/if}
                  </button>
                </div>

                {#if activeTab.get(table.name) === 'schema'}
                  <!-- Columns -->
                  <div class="section">
                    <h4 class="section-title">Columns</h4>
                    <div class="columns-grid">
                      {#each table.columns as column}
                        <div class="column-item">
                          <div class="column-header">
                            <span class="column-name">{column.name}</span>
                            {#if column.pk}
                              <span class="badge pk-badge">PK</span>
                            {/if}
                            {#if column.notnull}
                              <span class="badge required-badge">NOT NULL</span>
                            {/if}
                          </div>
                          <div class="column-details">
                            <span class="column-type" style="color: {getTypeColor(column.type)}"
                              >{column.type}</span
                            >
                            {#if column.dflt_value}
                              <span class="column-default">default: {column.dflt_value}</span>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>

                  <!-- Foreign Keys -->
                  {#if table.foreignKeys.length > 0}
                    <div class="section">
                      <h4 class="section-title">Foreign Keys</h4>
                      <div class="fk-list">
                        {#each table.foreignKeys as fk}
                          <div class="fk-item">
                            <div class="fk-relationship">
                              <span class="fk-from">{fk.from}</span>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <line x1="5" y1="12" x2="19" y2="12" stroke-width="2"></line>
                                <polyline points="12 5 19 12 12 19" stroke-width="2"></polyline>
                              </svg>
                              <span class="fk-to">{fk.table}.{fk.to}</span>
                            </div>
                            <div class="fk-actions">
                              {#if fk.on_update !== 'NO ACTION'}
                                <span class="fk-action">ON UPDATE: {fk.on_update}</span>
                              {/if}
                              {#if fk.on_delete !== 'NO ACTION'}
                                <span class="fk-action">ON DELETE: {fk.on_delete}</span>
                              {/if}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Indexes -->
                  {#if table.indexes.length > 0}
                    <div class="section">
                      <h4 class="section-title">Indexes</h4>
                      <div class="index-list">
                        {#each table.indexes as index}
                          <div class="index-item">
                            <span class="index-name">{index.name}</span>
                            {#if index.unique}
                              <span class="badge unique-badge">UNIQUE</span>
                            {/if}
                            <span class="index-origin">{index.origin}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {:else if activeTab.get(table.name) === 'data'}
                  <!-- Data View -->
                  <div class="section data-view">
                    {#if loadingData.has(table.name)}
                      <div class="loading-data">
                        <div class="spinner-small"></div>
                        <p>Loading data...</p>
                      </div>
                    {:else if dataErrors.has(table.name)}
                      <div class="data-error">
                        <p>{dataErrors.get(table.name)}</p>
                        <button on:click={() => loadTableData(table.name)} class="retry-btn-small">
                          Retry
                        </button>
                      </div>
                    {:else if tableData.has(table.name)}
                      {@const data = tableData.get(table.name)}
                      {#if data && data.data.length > 0}
                        <div class="table-wrapper">
                          <table class="data-table">
                            <thead>
                              <tr>
                                {#each Object.keys(data.data[0]) as columnName}
                                  <th>{columnName}</th>
                                {/each}
                              </tr>
                            </thead>
                            <tbody>
                              {#each data.data as row}
                                <tr>
                                  {#each Object.values(row) as value}
                                    <td>{formatValue(value)}</td>
                                  {/each}
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>

                        <!-- Pagination -->
                        {#if data.pagination.totalPages > 1}
                          <div class="pagination">
                            <button
                              class="page-btn"
                              disabled={!data.pagination.hasPrev}
                              on:click={() => changePage(table.name, data.pagination.page - 1)}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <polyline points="15 18 9 12 15 6" stroke-width="2"></polyline>
                              </svg>
                              Previous
                            </button>

                            <span class="page-info">
                              Page {data.pagination.page} of {data.pagination.totalPages}
                              <span class="total-rows"
                                >({data.pagination.totalRows.toLocaleString()} rows)</span
                              >
                            </span>

                            <button
                              class="page-btn"
                              disabled={!data.pagination.hasNext}
                              on:click={() => changePage(table.name, data.pagination.page + 1)}
                            >
                              Next
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <polyline points="9 18 15 12 9 6" stroke-width="2"></polyline>
                              </svg>
                            </button>
                          </div>
                        {/if}
                      {:else}
                        <div class="empty-data">
                          <p>No data in this table</p>
                        </div>
                      {/if}
                    {:else}
                      <div class="empty-data">
                        <p>Click to load data</p>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <div class="no-results">
          <p>No tables found matching "{searchQuery}"</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .database-navigator {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--color-border);
  }

  .header h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .stats {
    display: flex;
    gap: 1rem;
  }

  .stat {
    padding: 0.5rem 1rem;
    background: var(--color-bg-tertiary);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .loading,
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error svg {
    color: var(--color-error);
    margin-bottom: 0.5rem;
  }

  .error p {
    color: var(--color-error);
    margin-bottom: 1rem;
  }

  .retry-btn {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
  }

  .retry-btn:hover {
    background: var(--color-primary-dark);
  }

  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 250px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }

  .search-box svg {
    color: var(--color-text-tertiary);
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-text);
    font-size: 0.875rem;
    outline: none;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .control-btn {
    padding: 0.625rem 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    transition: all 0.2s;
  }

  .control-btn:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  .tables-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .table-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;
    transition: all 0.2s;
  }

  .table-card:hover {
    border-color: var(--color-primary);
  }

  .table-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: transparent;
    /* Inherit, or the global filled-button colour makes this unreadable. */
    color: inherit;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
  }

  .table-header:hover {
    background: var(--color-bg-tertiary);
  }

  .table-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .expand-icon {
    color: var(--color-text-tertiary);
    transition: transform 0.2s;
  }

  .expand-icon.expanded {
    transform: rotate(90deg);
  }

  .table-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-primary);
    font-family: 'Courier New', monospace;
  }

  .table-type {
    padding: 0.25rem 0.5rem;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  .table-type.is-view {
    background: var(--color-badge-view);
  }

  .table-meta {
    display: flex;
    gap: 1rem;
  }

  .meta-item {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .table-details {
    padding: 0 1.25rem 1.25rem;
    border-top: 1px solid var(--color-border);
  }

  .section {
    margin-top: 1rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    margin-bottom: 0.75rem;
    letter-spacing: 0.05em;
  }

  .columns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.75rem;
  }

  .column-item {
    padding: 0.75rem;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 0.375rem;
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .column-name {
    font-weight: 600;
    font-family: 'Courier New', monospace;
    color: var(--color-text-primary);
  }

  .badge {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .pk-badge {
    background: var(--color-badge-pk);
    color: var(--color-text-inverse);
  }

  .required-badge {
    background: var(--color-badge-required);
    color: var(--color-text-inverse);
  }

  .unique-badge {
    background: var(--color-badge-unique);
    color: var(--color-text-inverse);
  }

  .column-details {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .column-type {
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }

  .column-default {
    color: var(--color-text-tertiary);
  }

  .fk-list,
  .index-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .fk-item,
  .index-item {
    padding: 0.75rem;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 0.375rem;
  }

  .fk-relationship {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-family: 'Courier New', monospace;
  }

  .fk-from,
  .fk-to {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .fk-relationship svg {
    color: var(--color-text-tertiary);
  }

  .fk-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .fk-action {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .index-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .index-name {
    font-family: 'Courier New', monospace;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .index-origin {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    margin-left: auto;
  }

  .no-results {
    padding: 3rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-tertiary);
    transition: all 0.2s;
    margin-bottom: -2px;
  }

  .tab:hover {
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);
  }

  .tab.active {
    color: var(--color-text-primary);
    border-bottom-color: var(--color-primary);
  }

  .tab svg {
    color: currentColor;
  }

  .row-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  /* Data View */
  .data-view {
    min-height: 200px;
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--color-border-secondary);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .data-table thead {
    background: var(--color-bg-tertiary);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .data-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-primary);
    border-bottom: 2px solid var(--color-border-secondary);
    white-space: nowrap;
  }

  .data-table tbody tr {
    border-bottom: 1px solid var(--color-border-secondary);
    transition: background 0.2s;
  }

  .data-table tbody tr:hover {
    background: var(--color-bg-tertiary);
  }

  .data-table tbody tr:last-child {
    border-bottom: none;
  }

  .data-table td {
    padding: 0.75rem 1rem;
    color: var(--color-text-secondary);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-bg-tertiary);
    border-radius: 0.5rem;
  }

  .page-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: all 0.2s;
  }

  .page-btn:hover:not(:disabled) {
    background: var(--color-bg-accent);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-btn svg {
    color: currentColor;
  }

  .page-info {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .total-rows {
    color: var(--color-text-tertiary);
    font-weight: 400;
    margin-left: 0.25rem;
  }

  /* Loading and Error States */
  .loading-data,
  .data-error,
  .empty-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }

  .spinner-small {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border-secondary);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 0.5rem;
  }

  .loading-data p,
  .data-error p,
  .empty-data p {
    color: var(--color-text-tertiary);
    margin: 0;
  }

  .data-error p {
    color: var(--color-danger);
    margin-bottom: 0.5rem;
  }

  .retry-btn-small {
    padding: 0.375rem 0.75rem;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .retry-btn-small:hover {
    background: var(--color-primary-hover);
  }

  @media (max-width: 768px) {
    .database-navigator {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .controls {
      flex-direction: column;
    }

    .action-buttons {
      width: 100%;
    }

    .control-btn {
      flex: 1;
    }

    .columns-grid {
      grid-template-columns: 1fr;
    }

    .table-meta {
      flex-direction: column;
      gap: 0.25rem;
      align-items: flex-end;
    }

    .tabs {
      overflow-x: auto;
    }

    .pagination {
      flex-direction: column;
      gap: 1rem;
    }

    .page-info {
      order: -1;
    }

    .page-btn {
      width: 100%;
      justify-content: center;
    }

    .data-table {
      font-size: 0.75rem;
    }

    .data-table th,
    .data-table td {
      padding: 0.5rem;
      max-width: 150px;
    }
  }
</style>
