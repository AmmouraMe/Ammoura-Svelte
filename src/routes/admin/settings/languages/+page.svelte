<script lang="ts">
  import { enhance } from '$app/forms';
  import { toastStore } from '$lib/stores/toast';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: if (form?.success) {
    toastStore.success(form.message || 'Language settings saved');
  }
  $: if (form?.error) {
    toastStore.error(form.error);
  }

  let defaultLocale = data.settings.defaultLocale;
  let enabled: Record<string, boolean> = Object.fromEntries(
    data.availableLocales.map((l) => [l.code, data.settings.enabledLocales.includes(l.code)])
  );
  let isSubmitting = false;

  // The default language is always enabled
  $: enabled[defaultLocale] = true;
</script>

<svelte:head>
  <title>Languages - Admin</title>
</svelte:head>

<div class="settings-page">
  <div class="page-header">
    <h1>Languages</h1>
    <p>
      Choose your site's default language and any additional languages visitors can switch to.
      Storefront menus, cart, and checkout are translated automatically; your own content can be
      translated per language.
    </p>
  </div>

  <div class="settings-card">
    <form
      method="POST"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
        };
      }}
    >
      <div class="form-group">
        <label for="defaultLocale">Default language</label>
        <select id="defaultLocale" name="defaultLocale" bind:value={defaultLocale}>
          {#each data.availableLocales as locale (locale.code)}
            <option value={locale.code}>{locale.name} ({locale.nativeName})</option>
          {/each}
        </select>
        <p class="help-text">
          What first-time visitors see, unless their browser prefers another enabled language.
        </p>
      </div>

      <div class="form-group">
        <span class="group-label">Enabled languages</span>
        {#each data.availableLocales as locale (locale.code)}
          <label class="checkbox-label">
            <input
              type="checkbox"
              name={`enabled_${locale.code}`}
              bind:checked={enabled[locale.code]}
              disabled={locale.code === defaultLocale}
            />
            <span>{locale.name} <span class="native">({locale.nativeName})</span></span>
          </label>
        {/each}
        <p class="help-text">
          Visitors can switch between enabled languages when the navbar's language switcher is
          turned on (Builder → Navigation Bar → Show Language Switcher).
        </p>
      </div>

      <button type="submit" class="save-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  </div>
</div>

<style>
  .settings-page {
    width: 100%;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  h1 {
    color: var(--color-text-primary);
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    transition: color var(--transition-normal);
  }

  .page-header p {
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 640px;
    transition: color var(--transition-normal);
  }

  .settings-card {
    background: var(--color-bg-primary);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px var(--color-shadow-light);
    transition:
      background-color var(--transition-normal),
      box-shadow var(--transition-normal);
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label,
  .group-label {
    display: block;
    color: var(--color-text-primary);
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  select {
    width: 100%;
    max-width: 320px;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 400;
    margin-bottom: 0.4rem;
    cursor: pointer;
  }

  .checkbox-label input:disabled {
    cursor: not-allowed;
  }

  .native {
    color: var(--color-text-secondary);
  }

  .help-text {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    margin: 0.5rem 0 0 0;
  }

  .save-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1.4rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
