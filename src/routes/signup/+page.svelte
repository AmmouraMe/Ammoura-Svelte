<script lang="ts">
  import { goto } from '$app/navigation';

  let name = '';
  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';

  async function handleSignup() {
    error = '';
    if (!name || !email || !password) {
      error = 'Please fill in all fields';
      return;
    }
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    isLoading = true;
    try {
      const response = await fetch('/api/account/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const result = (await response.json()) as { success: boolean; error?: string };

      if (result.success) {
        await goto('/account');
      } else {
        error = result.error || 'Signup failed';
      }
    } catch {
      error = 'An error occurred. Please try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Create your account</title>
</svelte:head>

<div class="signup-container">
  <div class="signup-card">
    <div class="signup-header">
      <h1>Create your account</h1>
      <p>Build one or more websites with their own domains</p>
    </div>

    <form on:submit|preventDefault={handleSignup}>
      {#if error}
        <div class="form-error" role="alert">{error}</div>
      {/if}

      <div class="form-group">
        <label for="name">Your name</label>
        <input id="name" type="text" bind:value={name} autocomplete="name" disabled={isLoading} />
      </div>

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
          autocomplete="new-password"
          minlength="8"
          disabled={isLoading}
        />
        <span class="hint">At least 8 characters</span>
      </div>

      <button type="submit" class="submit-button" disabled={isLoading}>
        {isLoading ? 'Creating account…' : 'Create account'}
      </button>
    </form>

    <p class="alt-action">
      Already have an account? <a href="/account/login">Sign in</a>
    </p>
  </div>
</div>

<style>
  .signup-container {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .signup-card {
    width: 100%;
    max-width: 420px;
    background: var(--color-bg-primary);
    border-radius: 12px;
    box-shadow: 0 4px 20px var(--color-shadow-medium);
    padding: 2.5rem;
  }

  .signup-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .signup-header h1 {
    color: var(--color-primary);
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
  }

  .signup-header p {
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

  .hint {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
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
