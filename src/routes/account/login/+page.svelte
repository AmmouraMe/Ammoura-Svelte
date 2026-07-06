<script lang="ts">
  import { goto } from '$app/navigation';
  import DevLoginPanel from '$lib/components/dev/DevLoginPanel.svelte';

  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';

  async function handleLogin() {
    error = '';
    if (!email || !password) {
      error = 'Please enter both email and password';
      return;
    }

    isLoading = true;
    try {
      const response = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = (await response.json()) as { success: boolean; error?: string };

      if (result.success) {
        await goto('/account');
      } else {
        error = result.error || 'Login failed';
      }
    } catch {
      error = 'An error occurred. Please try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign in to your account</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>Sign in</h1>
      <p>Manage your sites and domains</p>
    </div>

    <form on:submit|preventDefault={handleLogin}>
      {#if error}
        <div class="form-error" role="alert">{error}</div>
      {/if}

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          autocomplete="email"
          disabled={isLoading}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          disabled={isLoading}
        />
      </div>

      <button type="submit" class="submit-button" disabled={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="alt-action">
      New here? <a href="/signup">Create an account</a>
    </p>

    <DevLoginPanel />
  </div>
</div>

<style>
  .login-container {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: var(--color-bg-primary);
    border-radius: 12px;
    box-shadow: 0 4px 20px var(--color-shadow-medium);
    padding: 2.5rem;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-header h1 {
    color: var(--color-primary);
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
  }

  .login-header p {
    color: var(--color-text-secondary);
    margin: 0;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  label {
    color: var(--color-text-primary);
    font-weight: 500;
    font-size: 0.9rem;
  }

  input {
    padding: 0.65rem 0.8rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: var(--color-border-focus);
  }

  .form-error {
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }

  .submit-button {
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .alt-action {
    text-align: center;
    margin: 1.5rem 0 0 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .alt-action a {
    color: var(--color-primary);
  }
</style>
