<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

  export let data: PageData;

  interface DnsInstruction {
    type: string;
    name: string;
    value: string;
    purpose: string;
  }

  let hostname = '';
  let isAdding = false;
  let error = '';
  let instructions: DnsInstruction[] = [];
  let onCloudflare = false;
  let busyDomainId = '';

  const statusLabels: Record<string, string> = {
    pending_dns: 'Waiting for DNS',
    pending_validation: 'Validating',
    active: 'Active',
    error: 'Error'
  };

  async function addDomain() {
    error = '';
    instructions = [];
    onCloudflare = false;
    if (!hostname) {
      error = 'Enter a domain';
      return;
    }

    isAdding = true;
    try {
      const response = await fetch(`/api/account/sites/${data.site.id}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname })
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        instructions?: DnsInstruction[];
        dnsProvider?: { cloudflare: boolean };
      };

      if (result.success) {
        hostname = '';
        instructions = result.instructions || [];
        onCloudflare = result.dnsProvider?.cloudflare || false;
        await invalidateAll();
      } else {
        error = result.error || 'Could not add the domain';
      }
    } catch {
      error = 'An error occurred. Please try again.';
    } finally {
      isAdding = false;
    }
  }

  async function refreshDomain(domainId: string) {
    busyDomainId = domainId;
    try {
      await fetch(`/api/account/sites/${data.site.id}/domains/${domainId}`, { method: 'POST' });
      await invalidateAll();
    } finally {
      busyDomainId = '';
    }
  }

  async function removeDomain(domainId: string, domainHostname: string) {
    if (!confirm(`Remove ${domainHostname} from this site?`)) {
      return;
    }
    busyDomainId = domainId;
    try {
      await fetch(`/api/account/sites/${data.site.id}/domains/${domainId}`, { method: 'DELETE' });
      await invalidateAll();
    } finally {
      busyDomainId = '';
    }
  }

  // Assisted Cloudflare DNS connect (per-domain expandable panel)
  interface ConnectInfo {
    cloudflare: boolean;
    zone: string | null;
    tokenCreateUrl: string;
  }
  let connectPanelDomainId = '';
  let connectInfo: ConnectInfo | null = null;
  let connectToken = '';
  let connectBusy = false;
  let connectError = '';
  let connectSuccess = '';

  async function toggleConnectPanel(domainId: string) {
    connectError = '';
    connectSuccess = '';
    connectToken = '';
    if (connectPanelDomainId === domainId) {
      connectPanelDomainId = '';
      connectInfo = null;
      return;
    }
    connectPanelDomainId = domainId;
    connectInfo = null;
    const response = await fetch(
      `/api/account/sites/${data.site.id}/domains/${domainId}/cloudflare-connect`
    );
    const result = (await response.json()) as { success: boolean } & ConnectInfo;
    if (result.success) {
      connectInfo = result;
    }
  }

  async function connectViaCloudflare(domainId: string) {
    connectError = '';
    connectSuccess = '';
    if (!connectToken.trim()) {
      connectError = 'Paste the token first';
      return;
    }
    connectBusy = true;
    try {
      const response = await fetch(
        `/api/account/sites/${data.site.id}/domains/${domainId}/cloudflare-connect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: connectToken })
        }
      );
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        zone?: string;
        outcomes?: Array<{ record: { type: string; name: string }; outcome: string }>;
      };

      if (result.success) {
        const summary = (result.outcomes || [])
          .map((o) => `${o.record.type} ${o.record.name}: ${o.outcome}`)
          .join(', ');
        connectSuccess = `Records set in ${result.zone}. ${summary}. You can delete the token in Cloudflare now.`;
        connectToken = '';
        await invalidateAll();
      } else {
        connectError = result.error || 'Could not connect the domain';
      }
    } catch {
      connectError = 'An error occurred. Please try again.';
    } finally {
      connectBusy = false;
    }
  }
</script>

<svelte:head>
  <title>Domains — {data.site.name}</title>
</svelte:head>

<div class="domains-container">
  <a class="back-link" href="/account">← Your sites</a>
  <h1>Domains for {data.site.name}</h1>
  <p class="intro">
    Connect a domain or subdomain you already own — it's free. Your site stays reachable on its
    platform address too.
  </p>

  <ul class="domain-list">
    {#each data.domains as domain (domain.id)}
      <li class="domain-card">
        <div class="domain-row">
          <div class="domain-main">
            <span class="domain-name">{domain.hostname}</span>
            <span class="badge {domain.status}">{statusLabels[domain.status] || domain.status}</span
            >
            {#if domain.kind === 'platform'}
              <span class="badge kind">Included</span>
            {/if}
          </div>
          {#if domain.kind === 'custom'}
            <div class="domain-actions">
              {#if domain.status !== 'active'}
                <button
                  class="small-button"
                  disabled={busyDomainId === domain.id}
                  on:click={() => toggleConnectPanel(domain.id)}
                >
                  Connect via Cloudflare
                </button>
                <button
                  class="small-button"
                  disabled={busyDomainId === domain.id}
                  on:click={() => refreshDomain(domain.id)}
                >
                  {busyDomainId === domain.id ? 'Checking…' : 'Check status'}
                </button>
              {/if}
              <button
                class="small-button danger"
                disabled={busyDomainId === domain.id}
                on:click={() => removeDomain(domain.id, domain.hostname)}
              >
                Remove
              </button>
            </div>
          {/if}
        </div>

        {#if connectPanelDomainId === domain.id}
          <div class="connect-panel">
            {#if !connectInfo}
              <p class="connect-note">Checking your DNS provider…</p>
            {:else if !connectInfo.cloudflare}
              <p class="connect-note">
                This domain's DNS doesn't appear to be hosted on Cloudflare, so assisted setup isn't
                available — use the DNS records shown when you added the domain. (Moving DNS to
                Cloudflare's free plan enables one-click setup.)
              </p>
            {:else}
              <p class="connect-note">
                Your DNS is on <strong>Cloudflare</strong> ({connectInfo.zone}). We can create the
                records for you:
              </p>
              <ol class="connect-steps">
                <li>
                  <a href={connectInfo.tokenCreateUrl} target="_blank" rel="noopener">
                    Open Cloudflare to create a token
                  </a>
                  — permissions are prefilled (Zone: Read, DNS: Edit). Scope it to
                  <strong>{connectInfo.zone}</strong>, click <em>Create Token</em>, and copy it.
                </li>
                <li>Paste the token here — we use it once and never store it:</li>
              </ol>
              <div class="connect-row">
                <input
                  type="password"
                  bind:value={connectToken}
                  placeholder="Paste your Cloudflare API token"
                  disabled={connectBusy}
                />
                <button
                  class="submit-button"
                  disabled={connectBusy}
                  on:click={() => connectViaCloudflare(domain.id)}
                >
                  {connectBusy ? 'Connecting…' : 'Connect'}
                </button>
              </div>
              <p class="connect-note">
                You can delete the token in Cloudflare right after — certificate renewals need no
                further DNS changes.
              </p>
            {/if}
            {#if connectError}
              <div class="form-error" role="alert">{connectError}</div>
            {/if}
            {#if connectSuccess}
              <div class="connect-success">{connectSuccess}</div>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <div class="add-card">
    <h2>Add your domain</h2>
    <form on:submit|preventDefault={addDomain}>
      {#if error}
        <div class="form-error" role="alert">{error}</div>
      {/if}
      <div class="add-row">
        <input
          type="text"
          bind:value={hostname}
          placeholder="shop.yourdomain.com or yourdomain.com"
          disabled={isAdding}
        />
        <button type="submit" class="submit-button" disabled={isAdding}>
          {isAdding ? 'Adding…' : 'Add domain'}
        </button>
      </div>
    </form>

    {#if instructions.length > 0}
      <div class="instructions">
        <h3>Almost there — add these DNS records</h3>
        {#if onCloudflare}
          <p class="cf-hint">
            Your domain's DNS is hosted on <strong>Cloudflare</strong> — use
            <em>Connect via Cloudflare</em> on the domain above and we'll create these records for
            you. Or add them yourself with the cloud icon set to
            <em>DNS only</em> (grey).
          </p>
        {/if}
        <table>
          <thead>
            <tr><th>Type</th><th>Name</th><th>Value</th><th>Why</th></tr>
          </thead>
          <tbody>
            {#each instructions as record (record.name + record.type)}
              <tr>
                <td class="mono">{record.type}</td>
                <td class="mono">{record.name}</td>
                <td class="mono">{record.value}</td>
                <td>{record.purpose}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="note">
          DNS changes can take a few minutes to spread. Use <em>Check status</em> above — your certificate
          is issued automatically once the records are visible.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .domains-container {
    max-width: 820px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem;
  }

  .back-link {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-decoration: none;
  }

  h1 {
    margin: 0.5rem 0 0.25rem 0;
    color: var(--color-text-primary);
  }

  .intro {
    color: var(--color-text-secondary);
    margin: 0 0 1.75rem 0;
    font-size: 0.95rem;
  }

  .domain-list {
    list-style: none;
    margin: 0 0 2rem 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .domain-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 10px;
    padding: 0.85rem 1.1rem;
  }

  .domain-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .connect-panel {
    margin-top: 0.9rem;
    border-top: 1px solid var(--color-border-secondary);
    padding-top: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .connect-note {
    color: var(--color-text-secondary);
    font-size: 0.88rem;
    margin: 0;
  }

  .connect-steps {
    margin: 0;
    padding-left: 1.2rem;
    color: var(--color-text-secondary);
    font-size: 0.88rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .connect-steps a {
    color: var(--color-primary);
  }

  .connect-row {
    display: flex;
    gap: 0.6rem;
  }

  .connect-success {
    background: color-mix(in srgb, var(--color-success, #22c55e) 12%, transparent);
    color: var(--color-success, #22c55e);
    border: 1px solid var(--color-success, #22c55e);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    font-size: 0.88rem;
  }

  .domain-main {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .domain-name {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .badge {
    font-size: 0.72rem;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--color-border-secondary);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge.active {
    color: var(--color-success, #22c55e);
    border-color: var(--color-success, #22c55e);
  }

  .badge.pending_dns,
  .badge.pending_validation {
    color: var(--color-warning, #f59e0b);
    border-color: var(--color-warning, #f59e0b);
  }

  .badge.error {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .domain-actions {
    display: flex;
    gap: 0.5rem;
  }

  .small-button {
    padding: 0.35rem 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--color-border-secondary);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .small-button.danger {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .small-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .add-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 12px;
    padding: 1.75rem;
  }

  .add-card h2 {
    margin: 0 0 1rem 0;
    color: var(--color-text-primary);
    font-size: 1.2rem;
  }

  .add-row {
    display: flex;
    gap: 0.75rem;
  }

  input {
    flex: 1;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: var(--color-border-focus);
  }

  .form-error {
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.9rem;
  }

  .submit-button {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .instructions {
    margin-top: 1.5rem;
    border-top: 1px solid var(--color-border-secondary);
    padding-top: 1.25rem;
  }

  .instructions h3 {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-primary);
    font-size: 1.05rem;
  }

  .cf-hint {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 0.7rem 0.9rem;
    color: var(--color-text-secondary);
    font-size: 0.88rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }

  th {
    text-align: left;
    color: var(--color-text-secondary);
    font-weight: 500;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  td {
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--color-border-secondary);
    color: var(--color-text-primary);
    word-break: break-all;
  }

  .mono {
    font-family: monospace;
  }

  .note {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin: 0.9rem 0 0 0;
  }
</style>
