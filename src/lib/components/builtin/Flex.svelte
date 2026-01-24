<script lang="ts">
  import type { WidgetConfig, ResponsiveValue } from '$lib/types/pages';

  export let config: WidgetConfig;
  export let currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  // Helper to resolve responsive values
  function resolveResponsive<T>(value: ResponsiveValue<T> | T | undefined | null, fallback: T): T {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'object' && value !== null && 'desktop' in value) {
      return value[currentBreakpoint] ?? value.desktop ?? fallback;
    }
    return value as T;
  }

  $: useGrid = config.useGrid || false;
  $: children = config.children || [];

  // Check if slot content is provided (used when Flex wraps other content)
  $: hasSlotContent = $$slots.default;

  // Flex properties
  $: flexDirection = resolveResponsive(config.flexDirection, 'row');
  $: flexWrap = resolveResponsive(config.flexWrap, 'wrap');
  $: flexJustifyContent = resolveResponsive(config.flexJustifyContent, 'flex-start');
  $: flexAlignItems = resolveResponsive(config.flexAlignItems, 'stretch');
  $: flexAlignContent = resolveResponsive(config.flexAlignContent, 'stretch');
  $: flexGap = resolveResponsive(config.flexGap, 16);
  $: flexGapX = resolveResponsive(config.flexGapX, flexGap);
  $: flexGapY = resolveResponsive(config.flexGapY, flexGap);
  $: flexPadding = resolveResponsive(config.flexPadding, {
    top: 16,
    right: 16,
    bottom: 16,
    left: 16
  });
  $: flexMargin = resolveResponsive(config.flexMargin, { top: 0, right: 0, bottom: 0, left: 0 });
  $: flexBackground = config.flexBackground || 'transparent';
  $: flexBorderRadius = config.flexBorderRadius || 0;
  $: flexWidth = resolveResponsive(config.flexWidth, '100%');
  $: flexHeight = resolveResponsive(config.flexHeight, 'auto');
  $: flexMinHeight = resolveResponsive(config.flexMinHeight, 'auto');
  $: flexMaxWidth = resolveResponsive(config.flexMaxWidth, 'none');

  // Grid properties
  $: gridColumns = resolveResponsive(config.gridColumns, 3);
  $: gridRows = resolveResponsive(config.gridRows, 'auto');
  $: gridAutoFlow = resolveResponsive(config.gridAutoFlow, 'row');
  $: gridAutoColumns = resolveResponsive(config.gridAutoColumns, 'auto');
  $: gridAutoRows = resolveResponsive(config.gridAutoRows, 'auto');
  $: gridColumnGap = resolveResponsive(config.gridColumnGap, flexGap);
  $: gridRowGap = resolveResponsive(config.gridRowGap, flexGap);
  $: gridJustifyItems = resolveResponsive(config.gridJustifyItems, 'stretch');
  $: gridAlignItems = resolveResponsive(config.gridAlignItems, 'stretch');
  $: gridJustifyContent = resolveResponsive(config.gridJustifyContent, 'start');
  $: gridAlignContent = resolveResponsive(config.gridAlignContent, 'start');

  // Convert gridColumns to CSS value
  $: gridColumnsCSS = typeof gridColumns === 'number' ? `repeat(${gridColumns}, 1fr)` : gridColumns;
  $: gridRowsCSS = typeof gridRows === 'number' ? `repeat(${gridRows}, 1fr)` : gridRows;

  // Border configuration
  $: border = config.flexBorder;

  // Generate styles based on useGrid flag
  $: displayStyle = useGrid
    ? `
    display: grid;
    grid-template-columns: ${gridColumnsCSS};
    grid-template-rows: ${gridRowsCSS};
    grid-auto-flow: ${gridAutoFlow};
    grid-auto-columns: ${gridAutoColumns};
    grid-auto-rows: ${gridAutoRows};
    column-gap: ${gridColumnGap}px;
    row-gap: ${gridRowGap}px;
    justify-items: ${gridJustifyItems};
    align-items: ${gridAlignItems};
    justify-content: ${gridJustifyContent};
    align-content: ${gridAlignContent};
  `
    : `
    display: flex;
    flex-direction: ${flexDirection};
    flex-wrap: ${flexWrap};
    justify-content: ${flexJustifyContent};
    align-items: ${flexAlignItems};
    align-content: ${flexAlignContent};
    column-gap: ${flexGapX}px;
    row-gap: ${flexGapY}px;
  `;

  // Ensure padding and margin are objects
  $: paddingObj =
    typeof flexPadding === 'object'
      ? flexPadding
      : {
          top: 16,
          right: 16,
          bottom: 16,
          left: 16
        };
  $: marginObj =
    typeof flexMargin === 'object' ? flexMargin : { top: 0, right: 0, bottom: 0, left: 0 };

  $: containerStyle = `
    ${displayStyle}
    width: ${flexWidth};
    height: ${flexHeight};
    min-height: ${flexMinHeight};
    max-width: ${flexMaxWidth};
    padding: ${paddingObj.top}px ${paddingObj.right}px ${paddingObj.bottom}px ${paddingObj.left}px;
    margin: ${marginObj.top}px ${marginObj.right}px ${marginObj.bottom}px ${marginObj.left}px;
    background: ${flexBackground};
    border-radius: ${flexBorderRadius}px;
    ${
      border
        ? `
      border-width: ${border.width || 0}px;
      border-style: ${border.style || 'solid'};
      border-color: ${border.color || 'transparent'};
    `
        : ''
    }
    box-sizing: border-box;
  `;
</script>

<div class="flex-component" id={config.anchorName || undefined} style={containerStyle}>
  {#if hasSlotContent || children.length > 0}
    <slot />
  {:else}
    <div class="flex-placeholder">
      <p>{useGrid ? 'Add elements to this grid' : 'Add elements to this flex container'}</p>
    </div>
  {/if}
</div>

<style>
  .flex-component {
    width: 100%;
    box-sizing: border-box;
  }

  .flex-placeholder {
    flex: 1;
    grid-column: 1 / -1;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-tertiary);
  }

  .flex-placeholder p {
    margin: 0;
  }
</style>
