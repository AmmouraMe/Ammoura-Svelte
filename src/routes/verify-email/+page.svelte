<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>Email verification</title>
</svelte:head>

<div class="verify-container">
  <div class="verify-card">
    {#if data.verified}
      <h1>Email verified ✓</h1>
      <p>{data.email} is confirmed. You're all set.</p>
      <a class="button" href="/account">Go to your sites</a>
    {:else if data.reason === 'missing'}
      <h1>Missing link</h1>
      <p>This page needs the verification link from your email.</p>
      <a class="button" href="/account">Back to your account</a>
    {:else}
      <h1>Link expired or invalid</h1>
      <p>Verification links only work once and expire after 24 hours.</p>
      <a class="button" href="/account?resend-verification=1">Request a new link</a>
    {/if}
  </div>
</div>

<style>
  .verify-container {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .verify-card {
    width: 100%;
    max-width: 420px;
    background: var(--color-bg-primary);
    border-radius: 12px;
    box-shadow: 0 4px 20px var(--color-shadow-medium);
    padding: 2.5rem;
    text-align: center;
  }

  h1 {
    color: var(--color-text-primary);
    font-size: 1.5rem;
    margin: 0 0 0.75rem 0;
  }

  p {
    color: var(--color-text-secondary);
    margin: 0 0 1.5rem 0;
  }

  .button {
    display: inline-block;
    padding: 0.65rem 1.3rem;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    font-weight: 600;
    text-decoration: none;
  }
</style>
