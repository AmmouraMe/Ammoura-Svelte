<script lang="ts">
  /**
   * Storefront language switcher. Reads the site's enabled locales from
   * layout data ($page.data), so it can be dropped anywhere without props.
   * Renders nothing when the site only has one language.
   */
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  import { getLocaleInfo, t } from '$lib/i18n';

  $: enabled = ($page.data.i18n?.enabledLocales as string[] | undefined) ?? ['en'];
  $: current = ($page.data.locale as string | undefined) ?? 'en';

  let switching = false;

  async function switchLocale(code: string) {
    if (code === current || switching) return;
    switching = true;
    try {
      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: code })
      });
      if (response.ok) {
        await invalidateAll();
      }
    } finally {
      switching = false;
    }
  }
</script>

{#if enabled.length > 1}
  <select
    class="language-switcher"
    value={current}
    disabled={switching}
    aria-label={$t('nav.language')}
    on:change={(e) => switchLocale(e.currentTarget.value)}
  >
    {#each enabled as code (code)}
      <option value={code}>{getLocaleInfo(code)?.nativeName ?? code}</option>
    {/each}
  </select>
{/if}

<style>
  .language-switcher {
    background: transparent;
    color: inherit;
    border: 1px solid var(--color-border-secondary, currentColor);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .language-switcher:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .language-switcher option {
    color: var(--color-text-primary, #111);
    background: var(--color-bg-primary, #fff);
  }
</style>
