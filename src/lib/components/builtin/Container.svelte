<script lang="ts">
  import type { WidgetConfig } from '$lib/types/pages';
  import { responsiveStyle } from '$lib/utils/responsiveStyle';

  export let config: WidgetConfig;

  $: containerPadding = config.containerPadding || {
    desktop: { top: 40, right: 40, bottom: 40, left: 40 }
  };
  $: containerMargin = config.containerMargin || {
    desktop: { top: 0, right: 0, bottom: 0, left: 0 }
  };
  $: containerBackground = config.containerBackground || 'transparent';
  $: containerBorderRadius = config.containerBorderRadius || 0;
  $: containerMaxWidth = config.containerMaxWidth || '1200px';
  $: children = config.children || [];

  // Padding now responds per breakpoint via the shared .rs class instead of a
  // desktop-only inline value. Margin keeps its bespoke horizontal auto-centering
  // inline (inline wins over .rs, so its margin fallback is harmless).
  $: rs = responsiveStyle({ padding: containerPadding });

  // Check if slot content is provided (used when Container wraps other content)
  $: hasSlotContent = $$slots.default;
</script>

<div
  class="container-widget {rs.className}"
  id={config.anchorName || undefined}
  style="
    max-width: {containerMaxWidth};
    background: {containerBackground};
    border-radius: {containerBorderRadius}px;
    margin: {containerMargin.desktop.top}px auto {containerMargin.desktop.bottom}px;
    {rs.style}
  "
>
  {#if hasSlotContent || children.length > 0}
    <slot />
  {:else}
    <div class="container-placeholder">
      <p>Drop widgets here</p>
    </div>
  {/if}
</div>

<style>
  .container-widget {
    width: 100%;
    box-sizing: border-box;
  }

  .container-placeholder {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-tertiary);
  }

  .container-placeholder p {
    margin: 0;
  }
</style>
