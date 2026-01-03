<script lang="ts">
  import PageWithLayout from '$lib/components/PageWithLayout.svelte';
  import { browser } from '$app/environment';
  import { page as pageStore } from '$app/stores';
  import type { PageData } from './$types';

  export let data: PageData;

  // Use reactive declarations to ensure data updates on client-side navigation
  $: ({ page, components, layoutComponents, isPreview, isAdmin: _isAdmin } = data);

  // Get the site context from the parent layout data for template substitution
  $: siteContext = $pageStore.data.siteContext;

  // Get theme IDs from parent layout
  $: systemLightThemeId = $pageStore.data.systemLightThemeId || 'vibrant';
  $: systemDarkThemeId = $pageStore.data.systemDarkThemeId || 'midnight';

  // Get the current applied theme (light or dark) from the document
  const getCurrentTheme = (): 'light' | 'dark' => {
    if (!browser) return 'light';
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? 'dark' : 'light';
  };

  // If no colorTheme is specified, use the site's current theme
  $: colorTheme =
    data.colorTheme ||
    (browser
      ? getCurrentTheme() === 'dark'
        ? systemDarkThemeId
        : systemLightThemeId
      : systemLightThemeId);
</script>

<svelte:head>
  <title>{page.title} - {data.storeName || 'Hermes eCommerce'}</title>
</svelte:head>

{#if isPreview && page.status === 'draft'}
  <div class="preview-banner">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
      <circle cx="12" cy="12" r="3" stroke-width="2"></circle>
    </svg>
    <span>Preview Mode - This is a draft page</span>
  </div>
{/if}

<PageWithLayout
  {layoutComponents}
  pageComponents={components}
  pageTitle={page.title}
  {colorTheme}
  {siteContext}
  user={data.currentUser}
  pageShowPageTitle={data.pageShowPageTitle}
/>

<style>
  .preview-banner {
    position: sticky;
    top: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-warning, #f59e0b);
    color: white;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
</style>
