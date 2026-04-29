<script lang="ts">
  import { toastStore } from '$lib/stores/toast';
  import { confirmStore } from '$lib/stores/confirm';
  import type { FulfillmentProvider } from '$lib/types/fulfillment';

  export let provider: FulfillmentProvider;
  export let onSaved: (() => void) | undefined = undefined;

  let showSettings = false;
  let apiKey = '';
  let isTesting = false;
  let isConfigured = false;
  let isSyncing = false;

  $: if (provider && provider.providerType === 'printful') {
    // Provider loaded, check if configured
    checkConfiguration();
  }

  function checkConfiguration() {
    // In a real implementation, you'd parse the config from the provider
    // For now, we'll just show the form if not configured
    isConfigured = false;
  }

  async function handleTestConnection() {
    if (!apiKey.trim()) {
      toastStore.error('Please enter your Printful API key');
      return;
    }

    isTesting = true;
    try {
      const response = await fetch('/api/admin/printful/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, apiKey })
      });

      if (!response.ok) {
        toastStore.error('Failed to connect to Printful. Check your API key.');
        return;
      }

      const data = (await response.json()) as { connected?: boolean };

      if (data.connected) {
        toastStore.success('Connected to Printful!');
        // Save the API key
        await saveApiKey();
      } else {
        toastStore.error('Could not verify Printful connection');
      }
    } catch (err) {
      console.error('Connection test error:', err);
      toastStore.error('Failed to test connection');
    } finally {
      isTesting = false;
    }
  }

  async function saveApiKey() {
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: provider.id,
          config: { apiKey }
        })
      });

      if (!response.ok) {
        toastStore.error('Failed to save API key');
        return;
      }

      isConfigured = true;
      toastStore.success('Printful API key saved!');
      showSettings = false;

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error('Save error:', err);
      toastStore.error('Failed to save API key');
    }
  }

  async function handleSyncProducts() {
    if (!isConfigured) {
      toastStore.error('Please configure Printful first');
      return;
    }

    const confirmed = await confirmStore.show(
      'Sync all products from Printful? This may take a few moments.',
      {
        title: 'Sync Printful Products',
        confirmText: 'Sync',
        cancelText: 'Cancel'
      }
    );

    if (!confirmed) return;

    isSyncing = true;
    try {
      const response = await fetch('/api/admin/printful/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id })
      });

      const data = (await response.json()) as { message?: string; productsCount?: number };

      if (!response.ok) {
        toastStore.error(data.message || 'Failed to sync products');
        return;
      }

      toastStore.success(`Synced ${data.productsCount || 0} products from Printful!`);
    } catch (err) {
      console.error('Sync error:', err);
      toastStore.error('Failed to sync products');
    } finally {
      isSyncing = false;
    }
  }
</script>

{#if provider.providerType === 'printful'}
  <div class="printful-config">
    <div class="header">
      <h3>Printful Configuration</h3>
      <button on:click={() => (showSettings = !showSettings)} class="btn-secondary">
        {showSettings ? 'Hide' : 'Configure'}
      </button>
    </div>

    {#if showSettings}
      <div class="settings">
        <div class="form-group">
          <label for="apiKey">Printful API Key</label>
          <input
            id="apiKey"
            type="password"
            bind:value={apiKey}
            placeholder="Enter your Printful API key"
            class="input-field"
          />
          <small>
            Get your API key from <a
              href="https://printful.com/dashboard/account/api"
              target="_blank">Printful Dashboard → Account → API</a
            >
          </small>
        </div>

        <div class="actions">
          <button
            on:click={handleTestConnection}
            disabled={!apiKey.trim() || isTesting}
            class="btn-primary"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
    {/if}

    {#if isConfigured}
      <div class="configured">
        <p class="success">✓ Printful is configured</p>
        <button on:click={handleSyncProducts} disabled={isSyncing} class="btn-primary">
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </button>
      </div>
    {/if}
  </div>

  <style>
    .printful-config {
      margin-top: 1.5rem;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background-color: var(--color-surface);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .header h3 {
      margin: 0;
      font-size: 1rem;
    }

    .settings {
      margin-top: 1rem;
      padding: 1rem;
      background-color: var(--color-background);
      border-radius: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .input-field {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
    }

    .form-group small {
      display: block;
      margin-top: 0.5rem;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .form-group a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .form-group a:hover {
      text-decoration: underline;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .configured {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #f0fff4;
      border: 1px solid #86efac;
      border-radius: 0.5rem;
    }

    .configured .success {
      margin: 0 0 1rem 0;
      color: #22863a;
      font-weight: 500;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .btn-primary {
      background-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background-color: var(--color-secondary);
      color: var(--color-text);
    }

    .btn-secondary:hover {
      opacity: 0.9;
    }
  </style>
{/if}
