<script lang="ts">
  /**
   * Dev-only quick logins, embedded on the login screens. Renders nothing
   * outside `vite dev`; the API it calls (/api/dev/login-as) 404s in
   * production builds regardless.
   */
  import { dev } from '$app/environment';
  import { invalidateAll, goto } from '$app/navigation';

  let busy = '';

  async function loginAs(as: 'new' | 'existing' | 'superadmin') {
    busy = as;
    try {
      const response = await fetch('/api/dev/login-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ as })
      });
      const result = (await response.json()) as { success: boolean; goto?: string };
      if (result.success) {
        await invalidateAll();
        if (result.goto) {
          await goto(result.goto);
        }
      }
    } finally {
      busy = '';
    }
  }
</script>

{#if dev}
  <div class="dev-logins">
    <span class="dev-label">DEV</span>
    <div class="dev-buttons">
      <button type="button" disabled={!!busy} on:click={() => loginAs('new')}>
        {busy === 'new' ? '…' : 'New user'}
      </button>
      <button type="button" disabled={!!busy} on:click={() => loginAs('existing')}>
        {busy === 'existing' ? '…' : 'Existing user'}
      </button>
      <button type="button" disabled={!!busy} on:click={() => loginAs('superadmin')}>
        {busy === 'superadmin' ? '…' : 'Superadmin'}
      </button>
    </div>
  </div>
{/if}

<style>
  .dev-logins {
    margin-top: 1.5rem;
    padding: 0.9rem;
    border: 1px dashed #f59e0b;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dev-label {
    font-family: monospace;
    font-weight: 700;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: #f59e0b;
  }

  .dev-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .dev-buttons button {
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    font-size: 0.8rem;
    padding: 0.35rem 0.7rem;
    cursor: pointer;
  }

  .dev-buttons button:hover:not(:disabled) {
    border-color: #f59e0b;
  }

  .dev-buttons button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
</style>
