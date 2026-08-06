<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';

  $: status = $page.status;
  // A 404 is an ordinary event (stale product link, mistyped URL) and gets its
  // own copy; anything else falls back to the generic message. SvelteKit's
  // default error text is internal wording, so it is never shown to shoppers.
  $: isNotFound = status === 404;
  $: heading = isNotFound ? $t('error.notFoundTitle') : $t('error.title');
  $: description = isNotFound ? $t('error.notFoundBody') : $t('error.body');
</script>

<svelte:head>
  <title>{heading}</title>
</svelte:head>

<div class="error-page">
  <div class="error-content">
    <p class="error-code">{status}</p>
    <h1 class="error-heading">{heading}</h1>
    <p class="error-description">{description}</p>
    <div class="error-actions">
      <a class="btn btn-primary" href="/">{$t('error.backHome')}</a>
      <a class="btn btn-outline" href="/cart">{$t('nav.cart')}</a>
    </div>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 3rem 1.5rem;
  }

  .error-content {
    text-align: center;
    max-width: 32rem;
  }

  .error-code {
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    margin: 0 0 0.75rem;
  }

  .error-heading {
    font-size: clamp(1.5rem, 5vw, 2rem);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 0.75rem;
  }

  .error-description {
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0 0 2rem;
  }

  .error-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* 44px min target — matches the tap-target rule the builder lints for */
    min-height: 44px;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-md, 0.5rem);
    font-weight: 600;
    text-decoration: none;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse, #fff);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
  }

  .btn-outline {
    border: 1px solid var(--color-border-primary);
    color: var(--color-text-primary);
  }

  .btn-outline:hover {
    background: var(--color-bg-secondary);
  }
</style>
