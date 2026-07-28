<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  export let data: PageData;

  function selectLocale(event: Event) {
    const code = (event.currentTarget as HTMLSelectElement).value;
    goto(`/admin/translations?locale=${encodeURIComponent(code)}`);
  }
</script>

<svelte:head>
  <title>Translations - Admin</title>
</svelte:head>

<div class="translations-page">
  <div class="page-header">
    <h1>Translations</h1>
    <p>
      Translate your own content — pages, products, and store details — into your site's other
      languages. Anything left untranslated shows the original ({data.defaultLocale}) text.
    </p>
  </div>

  {#if data.targetLocales.length === 0}
    <div class="empty-card">
      <p>
        Your site only has one language enabled. Add more under
        <a href="/admin/settings/languages">Settings → Languages</a> to start translating content.
      </p>
    </div>
  {:else if data.activeLocale}
    <div class="locale-bar">
      <label for="locale-select">Translating into</label>
      <select id="locale-select" value={data.activeLocale} on:change={selectLocale}>
        {#each data.targetLocales as locale (locale.code)}
          <option value={locale.code}>{locale.name} ({locale.nativeName})</option>
        {/each}
      </select>
    </div>

    <div class="section-card">
      <h2>Store details</h2>
      <div class="entity-row">
        <div class="entity-info">
          <span class="entity-name">Store name, tagline &amp; description</span>
          <span class="entity-meta"
            >{data.settingsCount > 0 ? `${data.settingsCount} translated` : 'Not translated'}</span
          >
        </div>
        <a class="edit-link" href={`/admin/translations/${data.activeLocale}/settings`}>Translate</a
        >
      </div>
    </div>

    <div class="section-card">
      <h2>Pages</h2>
      {#if data.pages.length === 0}
        <p class="empty">No pages yet.</p>
      {:else}
        {#each data.pages as page (page.id)}
          <div class="entity-row">
            <div class="entity-info">
              <span class="entity-name">{page.title}</span>
              <span class="entity-meta">
                {page.slug} · {page.status} ·
                {page.translatedCount > 0
                  ? `${page.translatedCount} fields translated`
                  : 'Not translated'}
              </span>
            </div>
            <a class="edit-link" href={`/admin/translations/${data.activeLocale}/page/${page.id}`}
              >Translate</a
            >
          </div>
        {/each}
      {/if}
    </div>

    <div class="section-card">
      <h2>Products</h2>
      {#if data.products.length === 0}
        <p class="empty">No products yet.</p>
      {:else}
        {#each data.products as product (product.id)}
          <div class="entity-row">
            <div class="entity-info">
              <span class="entity-name">{product.name}</span>
              <span class="entity-meta">
                {product.translatedCount > 0
                  ? `${product.translatedCount} fields translated`
                  : 'Not translated'}
              </span>
            </div>
            <a
              class="edit-link"
              href={`/admin/translations/${data.activeLocale}/product/${product.id}`}>Translate</a
            >
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .translations-page {
    width: 100%;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  h1 {
    color: var(--color-text-primary);
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
  }

  .page-header p {
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 640px;
  }

  .locale-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .locale-bar label {
    color: var(--color-text-primary);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .locale-bar select {
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .section-card,
  .empty-card {
    background: var(--color-bg-primary);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 2px 8px var(--color-shadow-light);
    margin-bottom: 1.25rem;
  }

  .section-card h2 {
    color: var(--color-text-primary);
    font-size: 1.1rem;
    margin: 0 0 0.75rem 0;
  }

  .entity-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .entity-row:last-child {
    border-bottom: none;
  }

  .entity-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .entity-name {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .entity-meta {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }

  .edit-link {
    color: var(--color-primary);
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .empty {
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
