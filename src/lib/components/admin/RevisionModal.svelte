<script lang="ts">
  import RevisionHistoryGraph from './RevisionHistoryGraph.svelte';

  // Accept any revision node type that has the common fields
  interface RevisionNodeLike {
    id: string;
    revision_hash: string;
    created_at: number;
    is_current?: boolean;
    is_published?: boolean;
    message?: string;
    notes?: string;
    user_id?: string;
    created_by?: string;
    children: RevisionNodeLike[];
    depth: number;
    branch: number;
  }

  export let isOpen = false;
  export let revisions: RevisionNodeLike[] = [];
  export let currentRevisionId: string | null = null;
  export let onSelect: (revisionId: string) => void;
  export let onClose: () => void;

  function handleRevisionSelect(revisionId: string) {
    onSelect(revisionId);
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={onClose}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-modal-title"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h2 id="revision-modal-title">Revision History</h2>
        <div class="header-controls">
          <button type="button" class="close-btn" on:click={onClose} aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-body">
        {#if revisions.length === 0}
          <div class="empty-state">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="empty-icon"
            >
              <path
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <p>No revision history available</p>
          </div>
        {:else}
          <RevisionHistoryGraph
            {revisions}
            {currentRevisionId}
            onSelectRevision={handleRevisionSelect}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--color-bg-primary);
    border-radius: 12px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 800px;
    width: 90%;
    max-height: 85vh;
    max-height: 85dvh; /* Dynamic viewport height for iOS */
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
    /* Prevent content from pushing modal off-screen */
    overflow: hidden;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1rem 0.75rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .header-controls {
    display: flex;
    align-items: center;
  }

  .close-btn {
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-icon {
    color: var(--color-text-tertiary);
    margin-bottom: 1rem;
  }

  .empty-state p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  @media (max-width: 640px) {
    .modal-overlay {
      /* Use safe-area insets for notched devices */
      padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0)
        env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
    }

    .modal-content {
      width: calc(100% - 1rem);
      max-width: 100%;
      max-height: 90vh;
      max-height: 90dvh; /* Dynamic viewport height for iOS */
      max-height: calc(100dvh - 2rem); /* Ensure some margin */
      border-radius: 8px;
      margin: 0.5rem;
    }

    .modal-header {
      padding: 0.75rem;
      flex-shrink: 0;
    }

    .modal-header h2 {
      font-size: 1rem;
    }

    .modal-body {
      padding: 0.5rem;
      min-height: 0; /* Allow flexbox shrinking */
      /* Ensure scrolling works on iOS */
      -webkit-overflow-scrolling: touch;
    }
  }
</style>
