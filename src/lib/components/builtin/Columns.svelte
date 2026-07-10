<script lang="ts">
  import type { WidgetConfig, ResponsiveValue } from '$lib/types/pages';
  import { responsiveStyle } from '$lib/utils/responsiveStyle';

  export let config: WidgetConfig;

  // columnCount/gap are typed ResponsiveValue<number> but legacy data stored them
  // as plain scalars (and this component used to read them as scalars, ignoring
  // any per-breakpoint values). Normalize both shapes to a ResponsiveValue.
  function toResponsive(
    value: ResponsiveValue<number> | number | undefined,
    fallback: number
  ): ResponsiveValue<number> {
    if (value == null) return { desktop: fallback };
    if (typeof value === 'object') return value;
    return { desktop: value };
  }

  $: columnCount = toResponsive(config.columnCount, 2);
  $: gap = toResponsive(config.gap, 20);
  $: verticalAlign = config.verticalAlign || 'stretch';
  $: children = config.children || [];

  // Collapse to a single column on mobile unless the config sets one explicitly
  // (replaces the old `grid-template-columns: 1fr !important` media query).
  $: rs = responsiveStyle({
    display: { desktop: 'grid' },
    gridColumns: { ...columnCount, mobile: columnCount.mobile ?? 1 },
    gap,
    alignItems: { desktop: verticalAlign }
  });

  // Placeholder count uses the desktop column count.
  $: placeholderCount = columnCount.desktop;
</script>

<div class="columns-widget {rs.className}" id={config.anchorName || undefined} style={rs.style}>
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
    {#each Array(placeholderCount) as _, i}
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
</style>
