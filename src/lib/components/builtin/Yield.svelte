<script lang="ts">
  /**
   * YieldWidget - Special widget for layouts that renders page content
   * This is where the page's widgets are inserted within a layout
   */
  import type { PageWidget } from '$lib/types/pages';

  export let widgets: PageWidget[] = [];
</script>

<div class="yield-container">
  {#if widgets && widgets.length > 0}
    {#each widgets as widget (widget.id)}
      <div class="yield-widget-item">
        <p>Widget: {widget.type}</p>
        <span>Position: {widget.position}</span>
      </div>
    {/each}
  {:else}
    <div class="yield-empty">
      <p>Page content will appear here</p>
    </div>
  {/if}
</div>

<style>
  .yield-container {
    width: 100%;
    min-height: 200px;
  }

  .yield-widget-item {
    padding: 1rem;
    border: 1px dashed var(--border-color, #ddd);
    border-radius: 4px;
    margin-bottom: 1rem;
    background: var(--surface-color, #f9f9f9);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .yield-widget-item p {
    margin: 0;
    font-weight: 600;
  }

  .yield-widget-item span {
    font-size: 0.875rem;
    color: var(--text-secondary-color, #666);
  }

  .yield-empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary-color, #666);
    border: 2px dashed var(--border-color, #ddd);
    border-radius: 8px;
    background: var(--surface-color, #f9f9f9);
  }

  .yield-empty p {
    margin: 0;
    font-style: italic;
  }
</style>
