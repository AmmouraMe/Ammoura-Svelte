<script lang="ts">
  import type { WidgetConfig } from '$lib/types/pages';

  export let config: WidgetConfig;

  $: rowGap = config.rowGap || { desktop: 16 };
  $: rowJustifyContent = config.rowJustifyContent || 'flex-start';
  $: rowAlignItems = config.rowAlignItems || 'center';
  $: rowFlexWrap = config.rowFlexWrap || 'nowrap';
  $: rowPadding = config.rowPadding || { desktop: { top: 16, right: 16, bottom: 16, left: 16 } };
  $: rowBackground = config.rowBackground || 'transparent';
  $: children = config.children || [];

  // Check if slot content is provided (used when Row wraps other content)
  $: hasSlotContent = $$slots.default;
</script>

<div
  class="row-widget"
  id={config.anchorName || undefined}
  style="
    display: flex;
    gap: {rowGap.desktop}px;
    justify-content: {rowJustifyContent};
    align-items: {rowAlignItems};
    flex-wrap: {rowFlexWrap};
    padding: {rowPadding.desktop.top}px {rowPadding.desktop.right}px {rowPadding.desktop
    .bottom}px {rowPadding.desktop.left}px;
    background: {rowBackground};
  "
>
  {#if hasSlotContent || children.length > 0}
    <slot />
  {:else}
    <div class="row-placeholder">
      <p>Add elements to this row</p>
    </div>
  {/if}
</div>

<style>
  .row-widget {
    width: 100%;
    box-sizing: border-box;
  }

  .row-placeholder {
    flex: 1;
    padding: 1.5rem;
    text-align: center;
    color: var(--color-text-secondary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-tertiary);
  }

  .row-placeholder p {
    margin: 0;
  }

  @media (max-width: 768px) {
    .row-widget {
      flex-wrap: wrap;
    }
  }
</style>
