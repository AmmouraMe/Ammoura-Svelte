<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { browser } from '$app/environment';
  import { authStore } from '$lib/stores/auth';
  import Button from '$lib/components/Button.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  let isLoggingOut = false;
  let logoutComplete = false;
  let logoutError = false;

  // Determine if we need to show the confirmation dialog
  $: needsConfirmation = !data.isInternalRequest && data.isLoggedIn;

  // If internal request and user is logged in, log out immediately and redirect
  $: if (
    browser &&
    data.isInternalRequest &&
    data.isLoggedIn &&
    !isLoggingOut &&
    !logoutComplete &&
    !logoutError
  ) {
    performLogout();
  }

  // If not logged in and external request, just redirect to home
  $: if (browser && !data.isLoggedIn && !data.isInternalRequest) {
    goto('/');
  }

  async function performLogout(): Promise<void> {
    if (isLoggingOut || logoutComplete || logoutError) return;

    isLoggingOut = true;

    try {
      // Call the logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Clear local auth store regardless of response
      authStore.logout();
      logoutComplete = true;

      // Invalidate all data to refresh server state, then redirect
      await invalidateAll();
      goto('/');
    } catch (error) {
      console.error('Logout failed:', error);
      logoutError = true;
      // Still clear the local store and redirect on error
      authStore.logout();
      await invalidateAll();
      goto('/');
    } finally {
      isLoggingOut = false;
    }
  }

  function handleCancel(): void {
    // Go back to previous page or home
    if (browser && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  }
</script>

<svelte:head>
  <title>Logout</title>
</svelte:head>

<!-- Only show UI when confirmation is needed (external request + logged in) -->
{#if needsConfirmation}
  <div class="logout-container">
    <div class="logout-card">
      <div class="logout-content">
        <div class="icon warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>
        <h1>Sign Out?</h1>
        {#if data.userName}
          <p>You are signed in as <strong>{data.userName}</strong>.</p>
        {/if}
        <p>Are you sure you want to sign out?</p>
        <div class="actions">
          <Button on:click={performLogout} variant="danger" disabled={isLoggingOut}>
            {#if isLoggingOut}
              Signing Out...
            {:else}
              Yes, Sign Out
            {/if}
          </Button>
          <Button on:click={handleCancel} variant="secondary" disabled={isLoggingOut}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .logout-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .logout-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    padding: 3rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }

  .logout-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .icon svg {
    width: 40px;
    height: 40px;
  }

  .icon.warning {
    background: #fef3c7;
    color: #d97706;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  p {
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  }

  p strong {
    color: #1f2937;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  @media (max-width: 480px) {
    .logout-card {
      padding: 2rem;
    }

    .actions {
      flex-direction: column;
      width: 100%;
    }

    .actions :global(button) {
      width: 100%;
    }
  }
</style>
