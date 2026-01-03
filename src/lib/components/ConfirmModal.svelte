<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { confirmStore } from '../stores/confirm';

  let confirmButtonRef: HTMLButtonElement | null = null;

  function handleConfirm(): void {
    confirmStore.confirm();
  }

  function handleCancel(): void {
    confirmStore.cancel();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!$confirmStore) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }

  function getButtonClass(variant: 'default' | 'danger' | 'warning'): string {
    switch (variant) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      default:
        return 'btn-primary';
    }
  }

  // Focus confirm button when modal opens
  $: if ($confirmStore && confirmButtonRef) {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => confirmButtonRef?.focus(), 0);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $confirmStore}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    class="modal-overlay"
    data-testid="confirm-overlay"
    transition:fade={{ duration: 150 }}
    on:click={handleCancel}
    on:keydown={(e) => e.key === 'Enter' && handleCancel()}
    role="button"
    tabindex="-1"
    aria-label="Close dialog"
  >
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      transition:fly={{ y: -20, duration: 200 }}
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="modal-header">
        <h2 id="confirm-title">{$confirmStore.title}</h2>
      </div>

      <div class="modal-body">
        <p class="confirm-message">{$confirmStore.message}</p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-secondary" on:click={handleCancel}>
          {$confirmStore.cancelText}
        </button>
        <button
          bind:this={confirmButtonRef}
          type="button"
          class={getButtonClass($confirmStore.variant)}
          on:click={handleConfirm}
        >
          {$confirmStore.confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
  }

  .modal-content {
    background: var(--color-bg-primary, #ffffff);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    width: 100%;
    overflow: hidden;
  }

  .modal-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary, #1f2937);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .confirm-message {
    margin: 0;
    color: var(--color-text-secondary, #4b5563);
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
    background: var(--color-bg-secondary, #f9fafb);
  }

  .btn-secondary,
  .btn-primary,
  .btn-danger,
  .btn-warning {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .btn-secondary {
    background: var(--color-bg-tertiary, #e5e7eb);
    color: var(--color-text-primary, #1f2937);
  }

  .btn-secondary:hover {
    background: var(--color-border, #d1d5db);
  }

  .btn-primary {
    background: var(--color-primary, #3b82f6);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover, #2563eb);
  }

  .btn-danger {
    background: var(--color-error, #ef4444);
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  .btn-warning {
    background: var(--color-warning, #f59e0b);
    color: white;
  }

  .btn-warning:hover {
    background: #d97706;
  }

  .btn-secondary:focus,
  .btn-primary:focus,
  .btn-danger:focus,
  .btn-warning:focus {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: 2px;
  }
</style>
