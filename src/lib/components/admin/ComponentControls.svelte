<script lang="ts">
  export let componentType: string;
  export let canMoveUp: boolean;
  export let canMoveDown: boolean;

  interface Events {
    moveUp: () => void;
    moveDown: () => void;
    duplicate: () => void;
    delete: () => void;
  }

  export let events: Events;

  function getComponentLabel(type: string): string {
    const labels: Record<string, string> = {
      text: 'Text Content',
      heading: 'Heading',
      image: 'Image',
      hero: 'Hero Section',
      button: 'Button',
      spacer: 'Spacer',
      divider: 'Divider',
      columns: 'Columns',
      single_product: 'Single Product',
      product_list: 'Product List'
    };
    return labels[type] || type;
  }
</script>

<div class="component-controls">
  <div class="component-label">{getComponentLabel(componentType)}</div>
  <div class="component-actions">
    <button
      type="button"
      class="icon-btn-sm"
      title="Move Up"
      on:click|stopPropagation={events.moveUp}
      disabled={!canMoveUp}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 15l-6-6-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button
      type="button"
      class="icon-btn-sm"
      title="Move Down"
      on:click|stopPropagation={events.moveDown}
      disabled={!canMoveDown}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button
      type="button"
      class="icon-btn-sm"
      title="Duplicate"
      on:click|stopPropagation={events.duplicate}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2" />
      </svg>
    </button>
    <button
      type="button"
      class="icon-btn-sm"
      title="Delete"
      on:click|stopPropagation={events.delete}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14M10 11v6M14 11v6"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</div>

<style>
  .component-controls {
    display: flex;
    position: absolute;
    top: -2.5rem;
    left: 0;
    right: 0;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px 6px 0 0;
    padding: 0.5rem;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
  }

  .component-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .component-actions {
    display: flex;
    gap: 0.25rem;
  }

  .icon-btn-sm {
    padding: 0.25rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn-sm:hover:not(:disabled) {
    background: var(--color-bg-secondary);
    border-color: var(--color-border-secondary);
    color: #3b82f6;
  }

  .icon-btn-sm:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
