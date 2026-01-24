<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RevisionNode } from '$lib/types/pages';

  export let revisions: RevisionNode[] = [];
  export let currentRevisionId: string | null = null;
  export let compact = false;

  const dispatch = createEventDispatcher();

  // Get latest revisions (max 5 for compact view)
  $: displayRevisions = compact ? revisions.slice(0, 5) : revisions;

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  function handleRevisionClick(revision: RevisionNode) {
    dispatch('select', revision.id);
  }

  function handleViewAll() {
    dispatch('viewAll');
  }
</script>

<div class="revision-timeline" class:compact>
  <div class="timeline-header">
    <span class="timeline-title">Recent Changes</span>
    {#if compact && revisions.length > displayRevisions.length}
      <button class="view-all-btn" on:click={handleViewAll}>
        +{revisions.length - displayRevisions.length} more
      </button>
    {/if}
  </div>

  <div class="timeline-items">
    {#each displayRevisions as revision (revision.id)}
      <button
        class="timeline-item"
        class:current={revision.id === currentRevisionId}
        class:published={revision.is_published}
        on:click={() => handleRevisionClick(revision)}
        title={revision.notes || `Revision ${revision.revision_hash.slice(0, 7)}`}
      >
        <div class="timeline-dot">
          {#if revision.is_published}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" stroke-width="3" stroke-linecap="round" />
            </svg>
          {/if}
        </div>
        <div class="timeline-content">
          <div class="timeline-message">
            {revision.notes || `${revision.revision_hash.slice(0, 7)} - ${revision.title}`}
          </div>
          <div class="timeline-time">{formatTime(revision.created_at)}</div>
        </div>
      </button>
    {/each}
  </div>

  {#if !compact}
    <div class="timeline-footer">
      <button class="timeline-action" on:click={handleViewAll}>View Full History</button>
    </div>
  {/if}
</div>

<style>
  .revision-timeline {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    overflow: hidden;
    min-width: 280px;
    max-width: 320px;
    max-height: 400px;
  }

  .revision-timeline.compact {
    min-width: 240px;
    max-width: 280px;
    max-height: 300px;
  }

  .timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .timeline-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .view-all-btn {
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    color: var(--color-primary);
    cursor: pointer;
    transition: background 0.2s;
  }

  .view-all-btn:hover {
    background: var(--color-bg-tertiary);
  }

  .timeline-items {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    max-height: 300px;
  }

  .timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-border-secondary);
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
    position: relative;
  }

  .timeline-item:last-child {
    border-bottom: none;
  }

  .timeline-item:hover {
    background: var(--color-bg-secondary);
  }

  .timeline-item.current {
    background: var(--color-bg-tertiary);
  }

  .timeline-item.current::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--color-primary);
  }

  .timeline-item.published .timeline-dot {
    background: var(--color-success);
    color: white;
  }

  .timeline-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-border-secondary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .timeline-content {
    flex: 1;
    min-width: 0;
  }

  .timeline-message {
    font-size: 0.875rem;
    color: var(--color-text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.25rem;
  }

  .timeline-time {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .timeline-footer {
    padding: 0.75rem;
    border-top: 1px solid var(--color-border-secondary);
    background: var(--color-bg-secondary);
  }

  .timeline-action {
    width: 100%;
    padding: 0.5rem;
    background: var(--color-primary);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .timeline-action:hover {
    opacity: 0.9;
  }
</style>
