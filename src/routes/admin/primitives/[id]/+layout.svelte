<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '$lib/stores/auth';

  let isLoading = true;

  onMount(() => {
    // Check authentication
    if (!$authStore.isAuthenticated) {
      goto('/auth/login', { replaceState: true });
      return;
    }

    if (!authStore.canAccessAdmin()) {
      goto('/', { replaceState: true });
      return;
    }

    isLoading = false;

    // Add builder-active class to body to enable overflow hidden
    if (typeof document !== 'undefined') {
      document.body.classList.add('builder-active');
    }
  });

  onDestroy(() => {
    // Remove builder-active class when leaving the builder
    if (typeof document !== 'undefined') {
      document.body.classList.remove('builder-active');
    }
  });
</script>

{#if isLoading}
  <div class="loading">
    <div class="spinner"></div>
    <p>Loading primitive editor...</p>
  </div>
{:else}
  <div class="builder-layout-wrapper">
    <slot />
  </div>
{/if}

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border-secondary);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  :global(body.builder-active) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .builder-layout-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg-primary);
    z-index: 9999;
  }
</style>
