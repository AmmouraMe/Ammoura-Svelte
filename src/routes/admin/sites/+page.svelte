<script lang="ts">
  import { dev } from '$app/environment';
  import type { PageData } from './$types';

  export let data: PageData;

  function siteUrl(site: { slug: string | null; hostnames: string | null }): string {
    // In dev there's no wildcard DNS; use the /subdomain/NAME simulation.
    if (dev && site.slug) return `/subdomain/${site.slug}`;
    const primary = site.hostnames?.split(', ')[0];
    return primary ? `https://${primary}` : '';
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>All Sites - Admin</title>
</svelte:head>

<div class="sites-page">
  <div class="page-header">
    <div class="header-content">
      <h1>All Sites</h1>
      <p class="subtitle">
        Every site on the platform: {data.sites.length}
        {data.sites.length === 1 ? 'site' : 'sites'} total, with their domains, owners, and status.
      </p>
    </div>
    <div class="user-badge">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
        <path
          d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
          stroke-width="2"
        ></path>
      </svg>
      <span>Platform Engineer Access</span>
    </div>
  </div>

  <div class="table-wrap">
    {#if data.sites.length === 0}
      <p class="empty">No sites have been created yet.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Site</th>
            <th>Domains</th>
            <th>Owner</th>
            <th>Members</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {#each data.sites as site (site.id)}
            <tr>
              <td>
                <div class="site-name">{site.name}</div>
                {#if site.slug}
                  <div class="site-slug">{site.slug}</div>
                {/if}
              </td>
              <td>
                {#if siteUrl(site)}
                  <a class="site-link" href={siteUrl(site)} target="_blank" rel="noopener">
                    {site.hostnames || site.domain}
                  </a>
                {:else}
                  <span class="muted">{site.hostnames || site.domain || '—'}</span>
                {/if}
              </td>
              <td>{site.owner_email || '—'}</td>
              <td class="numeric">{site.member_count}</td>
              <td>
                <span class="status status-{site.status}">{site.status}</span>
              </td>
              <td class="muted">{formatDate(site.created_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .sites-page {
    min-height: 100vh;
    background: var(--color-bg-primary);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem 1.5rem 1rem;
    width: 100%;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .header-content h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    font-size: 0.95rem;
    color: var(--color-text-secondary);
    max-width: 600px;
    margin: 0;
    line-height: 1.5;
  }

  .user-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: linear-gradient(
      135deg,
      var(--color-engineer-gradient-start) 0%,
      var(--color-engineer-gradient-end) 100%
    );
    color: var(--color-engineer-text);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: 0 4px 6px var(--color-shadow-medium);
  }

  .user-badge svg {
    color: var(--color-engineer-text);
  }

  .table-wrap {
    padding: 1.5rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  th {
    text-align: left;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
    color: var(--color-text-primary);
    font-size: 0.9rem;
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--color-bg-tertiary);
  }

  .site-name {
    font-weight: 600;
  }

  .site-slug {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    font-family: monospace;
  }

  .site-link {
    color: var(--color-primary);
    text-decoration: none;
  }

  .site-link:hover {
    text-decoration: underline;
  }

  .muted {
    color: var(--color-text-secondary);
  }

  .numeric {
    text-align: center;
  }

  .status {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-active {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .status-inactive {
    background: color-mix(in srgb, var(--color-text-secondary) 15%, transparent);
    color: var(--color-text-secondary);
  }

  .status-maintenance {
    background: color-mix(in srgb, var(--color-warning, #f59e0b) 15%, transparent);
    color: var(--color-warning, #f59e0b);
  }

  .empty {
    color: var(--color-text-secondary);
    padding: 2rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      gap: 1rem;
    }

    .header-content h1 {
      font-size: 1.5rem;
    }

    .user-badge {
      align-self: flex-start;
    }
  }
</style>
