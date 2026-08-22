<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toastStore } from '$lib/stores/toast';

  export let data: {
    provider: { id: string } | null;
    store: { id: number; name: string; currency: string } | null;
    webhookUrl?: string | null;
  };

  // Connection state
  let apiKey = '';
  let showKey = false;
  let isConnecting = false;

  // Products state
  let products: Array<{
    id: number;
    name: string;
    variants: number;
    thumbnail_url: string | null;
    imported: boolean;
    selected: boolean;
    markupPercent: number;
  }> = [];
  let loadingProducts = false;
  let productsLoaded = false;
  let importingProducts = false;

  $: isConnected = !!data.store;
  $: providerId = data.provider?.id ?? null;
  $: selectedProducts = products.filter((p) => p.selected && !p.imported);
  $: allSelectableChecked =
    products.filter((p) => !p.imported).length > 0 &&
    products.filter((p) => !p.imported).every((p) => p.selected);

  async function handleConnect() {
    if (!apiKey.trim()) {
      toastStore.error('Please enter your Printful API key');
      return;
    }
    isConnecting = true;
    try {
      const res = await fetch('/api/admin/printful/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const body = (await res.json()) as { store?: { name: string }; error?: string };
      if (!res.ok) {
        toastStore.error(body.error || 'Failed to connect to Printful');
        return;
      }
      toastStore.success(`Connected to Printful store: ${body.store?.name}`);
      apiKey = '';
      await invalidateAll();
    } catch {
      toastStore.error('Failed to connect to Printful');
    } finally {
      isConnecting = false;
    }
  }

  async function loadProducts() {
    if (!providerId) return;
    loadingProducts = true;
    productsLoaded = false;
    try {
      const res = await fetch(`/api/admin/printful/store-products?providerId=${providerId}`);
      const body = (await res.json()) as {
        products?: typeof products;
        error?: string;
      };
      if (!res.ok) {
        toastStore.error(body.error || 'Failed to load Printful products');
        return;
      }
      products = (body.products || []).map((p) => ({
        ...p,
        selected: false,
        markupPercent: 0
      }));
      productsLoaded = true;
    } catch {
      toastStore.error('Failed to load products from Printful');
    } finally {
      loadingProducts = false;
    }
  }

  async function handleImport() {
    if (!providerId || selectedProducts.length === 0) return;
    importingProducts = true;
    try {
      const res = await fetch('/api/admin/printful/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          products: selectedProducts.map((p) => ({
            printfulId: p.id,
            name: p.name,
            markupPercent: p.markupPercent,
            thumbnailUrl: p.thumbnail_url
          }))
        })
      });
      const body = (await res.json()) as {
        imported?: number;
        skipped?: number;
        error?: string;
      };
      if (!res.ok) {
        toastStore.error(body.error || 'Import failed');
        return;
      }
      toastStore.success(
        `Imported ${body.imported} product${body.imported === 1 ? '' : 's'}${body.skipped ? ` (${body.skipped} skipped)` : ''}`
      );
      await loadProducts();
    } catch {
      toastStore.error('Import failed');
    } finally {
      importingProducts = false;
    }
  }

  function toggleSelectAll() {
    const shouldSelect = !allSelectableChecked;
    products = products.map((p) => (p.imported ? p : { ...p, selected: shouldSelect }));
  }
</script>

<svelte:head>
  <title>Printful — Settings</title>
</svelte:head>

<div class="printful-page">
  <div class="page-header">
    <div class="header-content">
      <div class="header-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline
            points="6 9 6 2 18 2 18 9"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></polyline>
          <path
            d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          <rect
            x="6"
            y="14"
            width="12"
            height="8"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></rect>
        </svg>
      </div>
      <div>
        <h1>Printful</h1>
        <p>Print-on-demand fulfillment</p>
      </div>
    </div>
    {#if isConnected}
      <div class="connected-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline
            points="20 6 9 17 4 12"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></polyline>
        </svg>
        Connected — {data.store?.name}
      </div>
    {/if}
  </div>

  <!-- Step 1: Connect -->
  <section class="section">
    <div class="section-header">
      <div class="step-badge" class:done={isConnected}>
        {#if isConnected}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline
              points="20 6 9 17 4 12"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></polyline>
          </svg>
        {:else}
          1
        {/if}
      </div>
      <h2>{isConnected ? 'Connected account' : 'Connect your Printful account'}</h2>
    </div>

    {#if isConnected}
      <div class="connected-info">
        <p>
          Your Printful store <strong>{data.store?.name}</strong> is connected. Products you set up in
          Printful are available to import below.
        </p>
        {#if data.webhookUrl}
          <div class="webhook-info">
            <p class="webhook-label">
              To get order status updates (shipped, tracking, etc.), add this URL as a webhook in
              your Printful Dashboard → Settings → Webhooks:
            </p>
            <code class="webhook-url">{data.webhookUrl}</code>
          </div>
        {/if}
        <details class="update-key">
          <summary>Update API key</summary>
          <div class="key-form">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              on:input={(event) => (apiKey = event.currentTarget.value)}
              placeholder="Paste new API key"
              class="key-input"
            />
            <button class="toggle-visibility" on:click={() => (showKey = !showKey)} type="button">
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button
              class="btn-primary"
              on:click={handleConnect}
              disabled={isConnecting || !apiKey.trim()}
            >
              {isConnecting ? 'Connecting…' : 'Update'}
            </button>
          </div>
        </details>
      </div>
    {:else}
      <div class="connect-form">
        <p class="help-text">
          Get your API key from
          <a href="https://www.printful.com/dashboard/store/api" target="_blank" rel="noopener">
            Printful Dashboard → Store → API
          </a>. Create a store-level token with at least <em>sync products</em> read access.
        </p>
        <div class="key-form">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            on:input={(event) => (apiKey = event.currentTarget.value)}
            placeholder="Paste your Printful API key"
            class="key-input"
            on:keydown={(e) => e.key === 'Enter' && handleConnect()}
          />
          <button class="toggle-visibility" on:click={() => (showKey = !showKey)} type="button">
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            class="btn-primary"
            on:click={handleConnect}
            disabled={isConnecting || !apiKey.trim()}
          >
            {isConnecting ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    {/if}
  </section>

  <!-- Step 2: Import products -->
  {#if isConnected}
    <section class="section">
      <div class="section-header">
        <div class="step-badge">2</div>
        <h2>Import products to your store</h2>
      </div>

      {#if !productsLoaded && !loadingProducts}
        <div class="load-prompt">
          <p>Load your Printful products to choose which ones to add to your site.</p>
          <button class="btn-primary" on:click={loadProducts}>Load products</button>
        </div>
      {:else if loadingProducts}
        <div class="loading">
          <div class="spinner"></div>
          <span>Loading from Printful…</span>
        </div>
      {:else if products.length === 0}
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
              stroke-width="2"
            ></path>
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke-width="2"></path>
          </svg>
          <p>No products found in your Printful store yet.</p>
          <a
            href="https://www.printful.com/dashboard/sync"
            target="_blank"
            rel="noopener"
            class="btn-secondary"
          >
            Set up products in Printful →
          </a>
        </div>
      {:else}
        <div class="products-toolbar">
          <label class="select-all">
            <input type="checkbox" checked={allSelectableChecked} on:change={toggleSelectAll} />
            <span>Select all</span>
          </label>
          <span class="selected-count">
            {selectedProducts.length} selected
          </span>
          <button
            class="btn-primary"
            on:click={handleImport}
            disabled={importingProducts || selectedProducts.length === 0}
          >
            {importingProducts
              ? 'Importing…'
              : `Import ${selectedProducts.length || ''} product${selectedProducts.length === 1 ? '' : 's'}`}
          </button>
          {#if products.some((p) => p.imported)}
            <a href="/admin/products" class="btn-secondary view-link">View imported →</a>
          {/if}
        </div>

        <div class="products-list">
          {#each products as product (product.id)}
            <div class="product-row" class:imported={product.imported}>
              <label class="product-checkbox">
                <input
                  type="checkbox"
                  bind:checked={product.selected}
                  disabled={product.imported}
                />
              </label>

              <div class="product-thumb">
                {#if product.thumbnail_url}
                  <img src={product.thumbnail_url} alt={product.name} loading="lazy" />
                {:else}
                  <div class="thumb-placeholder">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke-width="2"></circle>
                      <polyline points="21 15 16 10 5 21" stroke-width="2"></polyline>
                    </svg>
                  </div>
                {/if}
              </div>

              <div class="product-info">
                <span class="product-name">{product.name}</span>
                <span class="product-meta"
                  >{product.variants} variant{product.variants === 1 ? '' : 's'}</span
                >
              </div>

              <div class="product-price">
                {#if product.imported}
                  <span class="imported-badge">Imported</span>
                {:else}
                  <div class="price-field">
                    <input
                      type="number"
                      bind:value={product.markupPercent}
                      step="1"
                      placeholder="0"
                      class="price-input"
                    />
                    <span class="currency">% markup</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <div class="import-footer">
          <p class="price-note">
            Each variant is priced at its Printful retail price plus the markup you set here (0% =
            sell at Printful's price). You can edit variant prices later in Products.
          </p>
          <button
            class="btn-primary large"
            on:click={handleImport}
            disabled={importingProducts || selectedProducts.length === 0}
          >
            {importingProducts ? 'Importing…' : `Import ${selectedProducts.length} selected`}
          </button>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .printful-page {
    width: 100%;
    padding: 2rem 1rem;
    max-width: 860px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--color-border-secondary);
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #00a878 0%, #007a56 100%);
    border-radius: 14px;
    color: white;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.2rem 0;
    color: var(--color-text-primary);
  }

  .page-header p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
  }

  .connected-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.9rem;
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .section {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 12px;
    padding: 1.75rem;
    margin-bottom: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .step-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-border-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .step-badge.done {
    background: #dcfce7;
    border-color: #86efac;
    color: #166534;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text-primary);
  }

  .help-text {
    margin: 0 0 1rem 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .help-text a {
    color: var(--color-primary);
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  .key-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .key-input {
    flex: 1;
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 0.9rem;
    font-family: monospace;
    min-width: 0;
  }

  .key-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-alpha);
  }

  .toggle-visibility {
    padding: 0.65rem 0.75rem;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .connected-info p {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .webhook-info {
    margin: 0.75rem 0;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border-radius: 6px;
  }

  .connected-info .webhook-label {
    margin: 0 0 0.5rem 0;
  }

  .webhook-url {
    display: block;
    padding: 0.5rem;
    background: var(--color-bg-primary);
    border-radius: 4px;
    font-size: 0.8rem;
    word-break: break-all;
    color: var(--color-text-primary);
  }

  .update-key {
    margin-top: 0.75rem;
  }

  .update-key summary {
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    user-select: none;
  }

  .update-key summary:hover {
    color: var(--color-text-primary);
  }

  .update-key .key-form {
    margin-top: 0.75rem;
  }

  .btn-primary {
    padding: 0.65rem 1.25rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary.large {
    padding: 0.8rem 1.75rem;
    font-size: 1rem;
  }

  .btn-secondary {
    padding: 0.65rem 1.25rem;
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: border-color 0.2s;
  }

  .btn-secondary:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .load-prompt {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .load-prompt p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    flex: 1;
  }

  .loading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem 0;
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border-secondary);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2.5rem 1rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-state p {
    margin: 0;
  }

  .products-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .select-all {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  .selected-count {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    flex: 1;
  }

  .view-link {
    text-decoration: none;
  }

  .products-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .product-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    transition: border-color 0.15s;
  }

  .product-row:hover {
    border-color: var(--color-primary);
  }

  .product-row.imported {
    opacity: 0.6;
  }

  .product-row.imported:hover {
    border-color: var(--color-border-secondary);
  }

  .product-checkbox {
    flex-shrink: 0;
    cursor: pointer;
  }

  .product-checkbox input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .product-thumb {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    background: var(--color-bg-tertiary);
  }

  .product-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-tertiary);
  }

  .product-info {
    flex: 1;
    min-width: 0;
  }

  .product-name {
    display: block;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .product-meta {
    display: block;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin-top: 0.15rem;
  }

  .product-price {
    flex-shrink: 0;
  }

  .price-field {
    display: flex;
    align-items: center;
    gap: 0.1rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    background: var(--color-bg-secondary);
    padding: 0 0.5rem;
  }

  .currency {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .price-input {
    width: 70px;
    padding: 0.4rem 0.25rem;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    font-size: 0.9rem;
    text-align: right;
    outline: none;
  }

  .imported-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.6rem;
    background: #dcfce7;
    color: #166534;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .import-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-border-secondary);
    flex-wrap: wrap;
    gap: 1rem;
  }

  .price-note {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    flex: 1;
  }

  @media (max-width: 640px) {
    .key-form {
      flex-direction: column;
      align-items: stretch;
    }

    .products-toolbar {
      flex-direction: column;
      align-items: flex-start;
    }

    .product-row {
      flex-wrap: wrap;
    }

    .import-footer {
      flex-direction: column;
    }
  }
</style>
