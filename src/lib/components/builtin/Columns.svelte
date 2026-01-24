<script lang="ts">
  import type { WidgetConfig } from '$lib/types/pages';

  export let config: WidgetConfig;

  $: columnCount = config.columnCount || 2;
  $: gap = config.gap || 20;
  $: verticalAlign = config.verticalAlign || 'stretch';
  $: children = config.children || [];
</script>

<div
  class="columns-widget"
  id={config.anchorName || undefined}
  style="
    display: grid;
    grid-template-columns: repeat({columnCount}, 1fr);
    gap: {gap}px;
    align-items: {verticalAlign};
  "
>
  {#if children && children.length > 0}
    {#each children as _child}
      <div class="column">
        <!-- Nested widget rendering would go here -->
        <!-- For now, just show column placeholders -->
        <div class="column-content">
          <p>Column content</p>
        </div>
      </div>
    {/each}
  {:else}
    {#each Array(columnCount) as _, i}
      <div class="column-placeholder">
        <p>Column {i + 1}</p>
      </div>
    {/each}
  {/if}
</div>

<style>
  .columns-widget {
    width: 100%;
  }

  .column {
    min-height: 50px;
  }

  .column-content {
    padding: 1rem;
    background: var(--theme-surface, var(--color-bg-secondary));
    border-radius: 4px;
  }

  .column-placeholder {
    padding: 2rem 1rem;
    background: var(--theme-background, var(--color-bg-tertiary, #f5f5f5));
    border: 2px dashed var(--theme-border, var(--color-border-secondary, #e0e0e0));
    border-radius: 4px;
    text-align: center;
    color: var(--theme-text-secondary, var(--color-text-secondary));
  }

  @media (max-width: 768px) {
    .columns-widget {
      grid-template-columns: 1fr !important;
    }
  }
</style>
