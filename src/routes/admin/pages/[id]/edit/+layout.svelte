<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // Check authentication and role on mount
    if (!$authStore.isAuthenticated) {
      goto('/auth/login', { replaceState: true });
    } else if (!authStore.canAccessAdmin()) {
      goto('/', { replaceState: true });
    }
  });
</script>

<svelte:head>
  <style>
    /* Override any inherited body styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
  </style>
</svelte:head>

{#if $authStore.isAuthenticated}
  <!-- Full-screen editor layout - overrides admin layout -->
  <div class="editor-layout-reset">
    <slot />
  </div>
{/if}

<style>
  .editor-layout-reset {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--color-bg-secondary);
    z-index: 1000;
  }
</style>
