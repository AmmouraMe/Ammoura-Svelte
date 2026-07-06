<script lang="ts">
  /**
   * Dev-only quick login panel (rendered from +layout.svelte only when
   * `dev` is true). One click logs in as a fresh user, the stable dev
   * user, or a platform engineer — no passwords anywhere.
   */
  import { invalidateAll, goto } from '$app/navigation';

  let busy = '';
  let open = false;

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
        open = false;
      }
    } finally {
      busy = '';
    }
  }

  async function signOut() {
    busy = 'signout';
    try {
      await fetch('/api/dev/login-as', { method: 'DELETE' });
      await invalidateAll();
      await goto('/');
      open = false;
    } finally {
      busy = '';
    }
  }
</script>

<div class="dev-panel" class:open>
  <button class="dev-chip" on:click={() => (open = !open)} aria-expanded={open}> DEV </button>
  {#if open}
    <div class="dev-actions">
      <button disabled={!!busy} on:click={() => loginAs('new')}>
        {busy === 'new' ? '…' : 'Log in as new user'}
      </button>
      <button disabled={!!busy} on:click={() => loginAs('existing')}>
        {busy === 'existing' ? '…' : 'Log in as existing user'}
      </button>
      <button disabled={!!busy} on:click={() => loginAs('superadmin')}>
        {busy === 'superadmin' ? '…' : 'Log in as superadmin'}
      </button>
      <button class="signout" disabled={!!busy} on:click={signOut}>
        {busy === 'signout' ? '…' : 'Sign out'}
      </button>
    </div>
  {/if}
</div>

<style>
  .dev-panel {
    position: fixed;
    bottom: 12px;
    left: 12px;
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: 6px;
    font-family: monospace;
  }

  .dev-chip {
    background: #f59e0b;
    color: #1a1a1a;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 4px 8px;
    cursor: pointer;
    opacity: 0.75;
  }

  .dev-chip:hover,
  .dev-panel.open .dev-chip {
    opacity: 1;
  }

  .dev-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #1a1a1a;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 8px;
  }

  .dev-actions button {
    background: #2a2a2a;
    color: #eee;
    border: 1px solid #444;
    border-radius: 5px;
    font-family: inherit;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
  }

  .dev-actions button:hover:not(:disabled) {
    border-color: #f59e0b;
  }

  .dev-actions button:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .dev-actions .signout {
    color: #f87171;
  }
</style>
