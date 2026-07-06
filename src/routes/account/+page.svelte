<script lang="ts">
  import { invalidateAll, goto } from '$app/navigation';
  import type { PageData } from './$types';

  export let data: PageData;

  let siteName = '';
  let slug = '';
  let slugEdited = false;
  let isCreating = false;
  let error = '';
  let slugStatus: 'idle' | 'checking' | 'available' | 'unavailable' = 'idle';
  let slugReason = '';
  let checkTimer: ReturnType<typeof setTimeout> | undefined;

  $: hasSites = data.sites.length > 0;

  function suggestFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 63);
  }

  function onNameInput() {
    if (!slugEdited) {
      slug = suggestFromName(siteName);
      scheduleSlugCheck();
    }
  }

  function onSlugInput() {
    slugEdited = true;
    slug = slug.toLowerCase();
    scheduleSlugCheck();
  }

  function scheduleSlugCheck() {
    clearTimeout(checkTimer);
    if (!slug) {
      slugStatus = 'idle';
      return;
    }
    slugStatus = 'checking';
    checkTimer = setTimeout(checkSlug, 350);
  }

  async function checkSlug() {
    try {
      const response = await fetch(
        `/api/account/sites/check-slug?slug=${encodeURIComponent(slug)}`
      );
      const result = (await response.json()) as {
        available?: boolean;
        reason?: string;
      };
      slugStatus = result.available ? 'available' : 'unavailable';
      slugReason = result.reason || '';
    } catch {
      slugStatus = 'idle';
    }
  }

  async function createSite() {
    error = '';
    if (!siteName || !slug) {
      error = 'Please provide a site name';
      return;
    }

    isCreating = true;
    try {
      const response = await fetch('/api/account/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName, slug })
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        hostname?: string;
      };

      if (result.success) {
        siteName = '';
        slug = '';
        slugEdited = false;
        slugStatus = 'idle';
        await invalidateAll();
      } else {
        error = result.error || 'Could not create the site';
      }
    } catch {
      error = 'An error occurred. Please try again.';
    } finally {
      isCreating = false;
    }
  }

  async function logout() {
    await fetch('/api/account/logout', { method: 'POST' });
    await goto('/account/login');
  }

  function siteUrl(site: { slug: string | null }): string {
    if (!site.slug) return '';
    const host = `${site.slug}.${data.platformSitesDomain}`;
    return data.platformSitesDomain === 'localhost' ? `http://${host}:4236` : `https://${host}`;
  }
</script>

<svelte:head>
  <title>Your sites</title>
</svelte:head>

<div class="account-container">
  <div class="account-header">
    <div>
      <h1>Your sites</h1>
      <p>Signed in as {data.account.email}</p>
    </div>
    <button class="link-button" on:click={logout}>Sign out</button>
  </div>

  {#if hasSites}
    <ul class="site-list">
      {#each data.sites as site (site.id)}
        <li class="site-card">
          <div class="site-info">
            <span class="site-name">{site.name}</span>
            <span class="site-role">{site.member_role}</span>
          </div>
          <div class="site-actions">
            {#if site.slug}
              <a class="site-link" href={siteUrl(site)} target="_blank" rel="noopener">
                {site.slug}.{data.platformSitesDomain}
              </a>
            {/if}
            <a class="site-link" href={`/account/sites/${site.id}/domains`}>Domains</a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="create-card">
    <h2>{hasSites ? 'Create another site' : 'Name your first site'}</h2>
    <p class="create-intro">
      Your site goes live immediately on a free subdomain. You can connect your own domain any time
      after.
    </p>

    <form on:submit|preventDefault={createSite}>
      {#if error}
        <div class="form-error" role="alert">{error}</div>
      {/if}

      <div class="form-group">
        <label for="site-name">Site name</label>
        <input
          id="site-name"
          type="text"
          bind:value={siteName}
          on:input={onNameInput}
          placeholder="My Store"
          disabled={isCreating}
        />
      </div>

      <div class="form-group">
        <label for="site-slug">Web address</label>
        <div class="slug-row">
          <input
            id="site-slug"
            type="text"
            bind:value={slug}
            on:input={onSlugInput}
            placeholder="my-store"
            disabled={isCreating}
          />
          <span class="slug-suffix">.{data.platformSitesDomain}</span>
        </div>
        {#if slugStatus === 'checking'}
          <span class="slug-hint">Checking availability…</span>
        {:else if slugStatus === 'available'}
          <span class="slug-hint available">Available</span>
        {:else if slugStatus === 'unavailable'}
          <span class="slug-hint unavailable">{slugReason || 'Not available'}</span>
        {/if}
      </div>

      <button
        type="submit"
        class="submit-button"
        disabled={isCreating || slugStatus === 'unavailable'}
      >
        {isCreating ? 'Creating…' : 'Create site'}
      </button>
    </form>
  </div>
</div>

<style>
  .account-container {
    max-width: 720px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem;
  }

  .account-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .account-header h1 {
    margin: 0 0 0.25rem 0;
    color: var(--color-text-primary);
  }

  .account-header p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .link-button {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.25rem 0;
  }

  .site-list {
    list-style: none;
    margin: 0 0 2rem 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .site-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 10px;
    padding: 1rem 1.25rem;
  }

  .site-info {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .site-name {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .site-role {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .site-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .site-link {
    color: var(--color-primary);
    font-size: 0.9rem;
  }

  .create-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 12px;
    padding: 1.75rem;
  }

  .create-card h2 {
    margin: 0 0 0.4rem 0;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  .create-intro {
    margin: 0 0 1.25rem 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  label {
    color: var(--color-text-primary);
    font-weight: 500;
    font-size: 0.9rem;
  }

  input {
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 1rem;
    flex: 1;
  }

  input:focus {
    outline: none;
    border-color: var(--color-border-focus);
  }

  .slug-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .slug-suffix {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    white-space: nowrap;
  }

  .slug-hint {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .slug-hint.available {
    color: var(--color-success);
  }

  .slug-hint.unavailable {
    color: var(--color-danger);
  }

  .form-error {
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }

  .submit-button {
    align-self: flex-start;
    padding: 0.7rem 1.4rem;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
