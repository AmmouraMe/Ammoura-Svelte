<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidate } from '$app/navigation';
  import { confirmStore } from '$lib/stores/confirm';
  import { toastStore } from '$lib/stores/toast';
  import ToggleSwitch from '$lib/components/ToggleSwitch.svelte';
  import type { PageData, ActionData } from './$types';
  import type { AIProvider } from '$lib/types/ai-chat';

  export let data: PageData;
  export let form: ActionData;

  const providers: AIProvider[] = ['openai', 'anthropic', 'grok'];
  let selectedProvider: AIProvider | null = null;
  let apiKey = '';
  let showApiKeyModal = false;
  let isSubmitting = false;

  // Settings form
  let aiChatEnabled = data.settings.ai_chat_enabled ?? false;
  let preferredModel = data.settings.preferred_model || 'gpt-4o';
  let temperature = data.settings.temperature?.toString() || '0.7';
  let maxTokens = data.settings.max_tokens?.toString() || '4096';
  let costLimitDaily = data.settings.cost_limit_daily?.toString() || '10';
  let rateLimitPerMinute = data.settings.rate_limit_per_minute?.toString() || '10';

  $: if (form?.success) {
    toastStore.success(form.message || 'Success');
    closeModal();
    isSubmitting = false;
  }

  $: if (form?.error) {
    toastStore.error(form.error);
    isSubmitting = false;
  }

  function openApiKeyModal(provider: AIProvider) {
    selectedProvider = provider;
    apiKey = '';
    showApiKeyModal = true;
  }

  function closeModal() {
    showApiKeyModal = false;
    selectedProvider = null;
    apiKey = '';
  }

  function getProviderName(provider: AIProvider): string {
    const names: Record<AIProvider, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      grok: 'Grok (X.AI)'
    };
    return names[provider];
  }

  function getProviderDescription(provider: AIProvider): string {
    const descriptions: Record<AIProvider, string> = {
      openai: 'GPT-4o and GPT-4o Mini models with vision capabilities',
      anthropic: 'Claude 3.5 Sonnet and Haiku models with superior reasoning',
      grok: 'Grok models through the xAI API'
    };
    return descriptions[provider];
  }

  function getProviderKeyFormat(provider: AIProvider): string {
    const formats: Record<AIProvider, string> = {
      openai: 'sk-...',
      anthropic: 'sk-ant-...',
      grok: 'xai-...'
    };
    return formats[provider];
  }
</script>

<div class="ai-settings-page">
  <header class="page-header">
    <div>
      <h1>AI Settings</h1>
      <p class="subtitle">Configure AI providers and models for the chat assistant</p>
    </div>
  </header>

  <!-- Enable/Disable Toggle -->
  <section class="settings-section toggle-section">
    <div class="toggle-container">
      <div class="toggle-content">
        <div>
          <h2>AI Chat Assistant</h2>
          <p>Enable or disable the AI chat assistant for your site</p>
        </div>
        <form
          method="POST"
          action="?/toggleEnabled"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === 'success') {
                // Invalidate layout data to update menu visibility in real-time
                await invalidate('app:layout');
                toastStore.success(
                  aiChatEnabled ? 'AI chat enabled successfully' : 'AI chat disabled successfully'
                );
              } else if (result.type === 'failure' && result.data) {
                const data = result.data;
                const errorMsg =
                  (typeof data === 'object' && 'error' in data && typeof data.error === 'string'
                    ? data.error
                    : null) || 'Failed to toggle AI chat';
                toastStore.error(errorMsg);
                // Revert the toggle on failure
                aiChatEnabled = !aiChatEnabled;
              }
            };
          }}
        >
          <input type="hidden" name="enabled" value={aiChatEnabled ? 'true' : 'false'} />
          <ToggleSwitch
            checked={aiChatEnabled}
            onChange={(checked) => {
              aiChatEnabled = checked;
              const form = document.querySelector('form[action="?/toggleEnabled"]');
              if (form instanceof HTMLFormElement) {
                // Update hidden input before submitting
                const hiddenInput = form.querySelector('input[name="enabled"]');
                if (hiddenInput instanceof HTMLInputElement) {
                  hiddenInput.value = checked ? 'true' : 'false';
                }
                form.requestSubmit();
              }
            }}
          />
        </form>
      </div>
    </div>
  </section>

  {#if aiChatEnabled}
    {#if !data.hasKeys}
      <div class="info-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
          <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        <div>
          <strong>Get Started with AI Chat</strong>
          <p>
            Add at least one API key below to enable the AI chat assistant for product creation.
            Your keys are encrypted and stored securely.
          </p>
        </div>
      </div>
    {/if}

    <!-- API Keys Section -->
    <section class="settings-section">
      <h2>API Keys</h2>
      <p class="section-description">
        Add API keys for AI providers. Keys are encrypted at rest and never exposed in the UI.
      </p>

      <div class="provider-cards">
        {#each providers as provider}
          {@const hasKey = data.settings[`${provider}_api_key`]}

          <div class="provider-card" class:has-key={hasKey}>
            <div class="provider-header">
              <div class="provider-info">
                <h3>{getProviderName(provider)}</h3>
                <p>{getProviderDescription(provider)}</p>
              </div>
              {#if hasKey}
                <span class="status-badge configured">Configured</span>
              {:else}
                <span class="status-badge not-configured">Not configured</span>
              {/if}
            </div>

            <div class="provider-actions">
              <button
                type="button"
                class="btn btn-primary"
                on:click={() => openApiKeyModal(provider)}
              >
                {hasKey ? 'Update Key' : 'Add Key'}
              </button>

              {#if hasKey}
                <form
                  method="POST"
                  action="?/deleteApiKey"
                  use:enhance={() => {
                    return async ({ update, result: _result }) => {
                      const confirmed = await confirmStore.show(
                        `Delete ${getProviderName(provider)} API key?`,
                        {
                          title: 'Delete API Key',
                          confirmText: 'Delete',
                          variant: 'danger'
                        }
                      );
                      if (confirmed) {
                        await update();
                      }
                    };
                  }}
                >
                  <input type="hidden" name="provider" value={provider} />
                  <button type="submit" class="btn btn-danger-outline">Delete</button>
                </form>
              {/if}
            </div>

            {#if hasKey}
              <div class="key-info">
                <div class="key-mask">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"></rect>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke-width="2" stroke-linecap="round"></path>
                  </svg>
                  <span>••••••••••••</span>
                </div>
                <small>Last updated: Recently</small>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- Model Configuration Section -->
    <section class="settings-section">
      <h2>Model Configuration</h2>
      <p class="section-description">
        Configure the default AI model and parameters for chat conversations.
      </p>

      <form method="POST" action="?/saveSettings" use:enhance class="settings-form">
        <div class="form-group">
          <label for="preferred_model">
            Preferred Model
            <span class="help-text">Default model for new conversations</span>
          </label>
          <select id="preferred_model" name="preferred_model" bind:value={preferredModel}>
            {#each data.supportedModels as model}
              <option value={model.model}>{model.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="temperature">
              Temperature
              <span class="help-text">0 = precise, 2 = creative</span>
            </label>
            <input
              type="number"
              id="temperature"
              name="temperature"
              bind:value={temperature}
              min="0"
              max="2"
              step="0.1"
            />
          </div>

          <div class="form-group">
            <label for="max_tokens">
              Max Tokens
              <span class="help-text">Maximum response length</span>
            </label>
            <input
              type="number"
              id="max_tokens"
              name="max_tokens"
              bind:value={maxTokens}
              min="100"
              max="16000"
              step="100"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cost_limit_daily">
              Daily Cost Limit (USD)
              <span class="help-text">Pause chat when exceeded</span>
            </label>
            <input
              type="number"
              id="cost_limit_daily"
              name="cost_limit_daily"
              bind:value={costLimitDaily}
              min="0"
              step="1"
            />
          </div>

          <div class="form-group">
            <label for="rate_limit_per_minute">
              Rate Limit (requests/min)
              <span class="help-text">Prevent excessive usage</span>
            </label>
            <input
              type="number"
              id="rate_limit_per_minute"
              name="rate_limit_per_minute"
              bind:value={rateLimitPerMinute}
              min="1"
              max="100"
              step="1"
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            on:click={() => {
              preferredModel = data.settings.preferred_model || 'gpt-4o';
              temperature = data.settings.temperature?.toString() || '0.7';
              maxTokens = data.settings.max_tokens?.toString() || '4096';
              costLimitDaily = data.settings.cost_limit_daily?.toString() || '10';
              rateLimitPerMinute = data.settings.rate_limit_per_minute?.toString() || '10';
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </section>

    <!-- Documentation Section -->
    <section class="settings-section">
      <h2>Getting API Keys</h2>
      <div class="docs-grid">
        <div class="doc-card">
          <h3>OpenAI</h3>
          <p>Get your API key from the OpenAI platform.</p>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            class="doc-link"
          >
            Get OpenAI API Key →
          </a>
        </div>

        <div class="doc-card">
          <h3>Anthropic</h3>
          <p>Get your API key from the Anthropic console.</p>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            class="doc-link"
          >
            Get Anthropic API Key →
          </a>
        </div>

        <div class="doc-card">
          <h3>Grok (X.AI)</h3>
          <p>Get your API key from the X.AI platform.</p>
          <a href="https://x.ai/" target="_blank" rel="noopener noreferrer" class="doc-link">
            Get Grok API Key →
          </a>
        </div>
      </div>
    </section>
  {/if}
</div>

<!-- API Key Modal -->
{#if showApiKeyModal && selectedProvider}
  <div
    class="modal-overlay"
    on:click={closeModal}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="button"
    tabindex="0"
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="modal"
      on:click={(e) => e.stopPropagation()}
      on:keydown={(e) => e.stopPropagation()}
      role="dialog"
    >
      <div class="modal-header">
        <h2>
          {data.settings[`${selectedProvider}_api_key`] ? 'Update' : 'Add'}
          {getProviderName(selectedProvider)} API Key
        </h2>
        <button class="close-btn" on:click={closeModal} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>

      <form method="POST" action="?/saveApiKey" use:enhance class="modal-form">
        <input type="hidden" name="provider" value={selectedProvider} />

        <div class="form-group">
          <label for="api_key">
            API Key
            <span class="help-text">Format: {getProviderKeyFormat(selectedProvider)}</span>
          </label>
          <input
            type="password"
            id="api_key"
            name="api_key"
            bind:value={apiKey}
            placeholder={getProviderKeyFormat(selectedProvider)}
            required
            autocomplete="off"
          />
        </div>

        <div class="info-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"></rect>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke-width="2" stroke-linecap="round"></path>
          </svg>
          <p>
            Your API key will be encrypted using AES-256-GCM encryption and stored securely. It
            cannot be viewed after saving.
          </p>
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Key'}
          </button>
          <button type="button" class="btn btn-secondary" on:click={closeModal}>Cancel</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .ai-settings-page {
    width: 100%;
    padding: 2rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .info-banner {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-accent);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .info-banner svg {
    flex-shrink: 0;
    color: var(--color-primary);
  }

  .info-banner strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--color-text-primary);
  }

  .info-banner p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .settings-section {
    margin-bottom: 3rem;
  }

  .settings-section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
  }

  .section-description {
    color: var(--color-text-secondary);
    margin: 0 0 1.5rem 0;
  }

  .provider-cards {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .provider-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    transition: all var(--transition-normal);
  }

  .provider-card.has-key {
    border-color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 5%, transparent);
  }

  .provider-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .provider-info h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.25rem 0;
  }

  .provider-info p {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.configured {
    background: var(--color-success);
    color: white;
  }

  .status-badge.not-configured {
    background: var(--color-text-tertiary);
    color: white;
  }

  .provider-actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .key-info {
    padding-top: 1rem;
    border-top: 1px solid var(--color-border-secondary);
  }

  .key-mask {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-secondary);
    font-family: monospace;
    margin-bottom: 0.5rem;
  }

  .key-info small {
    color: var(--color-text-tertiary);
    font-size: 0.875rem;
  }

  .settings-form {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 0.5rem;
  }

  .help-text {
    display: block;
    font-weight: 400;
    font-size: 0.875rem;
    color: var(--color-text-tertiary);
    margin-top: 0.25rem;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border-secondary);
  }

  .docs-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .doc-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .doc-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
  }

  .doc-card p {
    color: var(--color-text-secondary);
    margin: 0 0 1rem 0;
  }

  .doc-link {
    display: inline-flex;
    align-items: center;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
  }

  .doc-link:hover {
    text-decoration: underline;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: var(--color-bg-primary);
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--color-text-secondary);
  }

  .close-btn:hover {
    color: var(--color-text-primary);
  }

  .modal-form {
    padding: 1.5rem;
  }

  .info-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg-accent);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }

  .info-box svg {
    flex-shrink: 0;
    color: var(--color-primary);
  }

  .info-box p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
    border: none;
    font-size: 1rem;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-accent);
  }

  .btn-danger-outline {
    background: transparent;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
  }

  .btn-danger-outline:hover {
    background: var(--color-danger);
    color: white;
  }

  /* Toggle section styles */
  .toggle-section {
    margin-bottom: 2rem;
  }

  .toggle-container {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .toggle-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .toggle-content > div h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.25rem 0;
  }

  .toggle-content > div p {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  @media (max-width: 768px) {
    .ai-settings-page {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .provider-cards {
      grid-template-columns: 1fr;
    }

    .docs-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
