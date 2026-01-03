<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { promptStore } from '../stores/prompt';

  let inputValue = '';
  let inputRef: HTMLInputElement | null = null;

  // Update inputValue when prompt state changes
  $: if ($promptStore) {
    inputValue = $promptStore.defaultValue;
  }

  // Focus input when modal opens
  $: if ($promptStore && inputRef) {
    setTimeout(() => inputRef?.focus(), 50);
  }

  function handleConfirm(): void {
    promptStore.confirm(inputValue);
    inputValue = '';
  }

  function handleCancel(): void {
    promptStore.cancel();
    inputValue = '';
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  function handleOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).dataset.testid === 'prompt-overlay') {
      handleCancel();
    }
  }
</script>

{#if $promptStore}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="modal-overlay"
    data-testid="prompt-overlay"
    on:click={handleOverlayClick}
    transition:fade={{ duration: 150 }}
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-title"
      transition:fly={{ y: -20, duration: 200 }}
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h2 id="prompt-title">{$promptStore.title}</h2>
        <button type="button" class="close-btn" on:click={handleCancel} aria-label="Close dialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <label for="prompt-input" class="prompt-message">{$promptStore.message}</label>
        {#if $promptStore.inputType === 'number'}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            id="prompt-input"
            type="number"
            placeholder={$promptStore.placeholder}
            required={$promptStore.required}
            class="prompt-input"
            on:keydown={handleKeydown}
          />
        {:else if $promptStore.inputType === 'email'}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            id="prompt-input"
            type="email"
            placeholder={$promptStore.placeholder}
            required={$promptStore.required}
            maxlength={$promptStore.maxLength}
            minlength={$promptStore.minLength}
            pattern={$promptStore.pattern}
            class="prompt-input"
            on:keydown={handleKeydown}
          />
        {:else if $promptStore.inputType === 'password'}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            id="prompt-input"
            type="password"
            placeholder={$promptStore.placeholder}
            required={$promptStore.required}
            maxlength={$promptStore.maxLength}
            minlength={$promptStore.minLength}
            pattern={$promptStore.pattern}
            class="prompt-input"
            on:keydown={handleKeydown}
          />
        {:else if $promptStore.inputType === 'url'}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            id="prompt-input"
            type="url"
            placeholder={$promptStore.placeholder}
            required={$promptStore.required}
            maxlength={$promptStore.maxLength}
            minlength={$promptStore.minLength}
            pattern={$promptStore.pattern}
            class="prompt-input"
            on:keydown={handleKeydown}
          />
        {:else if $promptStore.inputType === 'tel'}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            id="prompt-input"
            type="tel"
            placeholder={$promptStore.placeholder}
            required={$promptStore.required}
            maxlength={$promptStore.maxLength}
            minlength={$promptStore.minLength}
            pattern={$promptStore.pattern}
            class="prompt-input"
            on:keydown={handleKeydown}
          />
        {:else}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            id="prompt-input"
            type="text"
            placeholder={$promptStore.placeholder}
            required={$promptStore.required}
            maxlength={$promptStore.maxLength}
            minlength={$promptStore.minLength}
            pattern={$promptStore.pattern}
            class="prompt-input"
            on:keydown={handleKeydown}
          />
        {/if}
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-secondary" on:click={handleCancel}>
          {$promptStore.cancelText}
        </button>
        <button type="button" class="btn-primary" on:click={handleConfirm}>
          {$promptStore.confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay, rgba(0, 0, 0, 0.5));
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  }

  .modal-content {
    background: var(--color-bg-primary, #ffffff);
    border-radius: 12px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 480px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem 1rem;
    border-bottom: 1px solid var(--color-border-secondary, #e5e7eb);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary, #1f2937);
  }

  .close-btn {
    padding: 0.25rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--color-text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text-primary, #1f2937);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .prompt-message {
    display: block;
    margin-bottom: 0.75rem;
    font-size: 0.9375rem;
    color: var(--color-text-primary, #1f2937);
    line-height: 1.5;
  }

  .prompt-input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--color-border-secondary, #d1d5db);
    border-radius: 8px;
    background: var(--color-bg-primary, #ffffff);
    color: var(--color-text-primary, #1f2937);
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .prompt-input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 3px var(--color-primary-alpha, rgba(59, 130, 246, 0.1));
  }

  .prompt-input::placeholder {
    color: var(--color-text-tertiary, #9ca3af);
  }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem 1.5rem;
    justify-content: flex-end;
  }

  .btn-secondary,
  .btn-primary {
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 0.875rem;
  }

  .btn-secondary {
    background: var(--color-bg-secondary, #f3f4f6);
    border: 1px solid var(--color-border-secondary, #d1d5db);
    color: var(--color-text-primary, #1f2937);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary, #e5e7eb);
  }

  .btn-primary {
    background: var(--color-primary, #3b82f6);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-dark, #2563eb);
  }

  @media (max-width: 640px) {
    .modal-content {
      width: 95%;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .btn-secondary,
    .btn-primary {
      width: 100%;
    }
  }
</style>
