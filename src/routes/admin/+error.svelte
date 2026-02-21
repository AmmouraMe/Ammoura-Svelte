<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  $: status = $page.status;
  $: message = $page.error?.message || 'An unexpected error occurred';
</script>

<svelte:head>
  <title>Error {status} - Admin</title>
</svelte:head>

<div class="error-page">
  <div class="error-content">
    <h1 class="error-code">{status}</h1>
    <p class="error-message">{message}</p>
    <div class="error-actions">
      <button class="btn btn-primary" on:click={() => history.back()}> Go Back </button>
      <button class="btn btn-outline" on:click={() => goto('/admin/dashboard')}> Dashboard </button>
    </div>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    max-width: 480px;
  }

  .error-code {
    font-size: 4rem;
    font-weight: 800;
    color: var(--color-text-muted);
    margin: 0 0 0.5rem;
    line-height: 1;
  }

  .error-message {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    margin: 0 0 2rem;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 1.25rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal),
      border-color var(--transition-normal);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
  }

  .btn-outline {
    background: transparent;
    border-color: var(--color-border-primary);
    color: var(--color-text-primary);
  }

  .btn-outline:hover {
    background: var(--color-bg-secondary);
  }
</style>
