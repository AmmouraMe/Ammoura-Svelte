<script lang="ts">
  import type { WidgetConfig, ColorTheme } from '$lib/types/pages';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let colorTheme: ColorTheme = 'vibrant';

  $: thickness = config.thickness || 1;
  $: dividerStyle = config.dividerStyle || 'solid';
  $: dividerColor = resolveThemeColor(config.dividerColor, colorTheme, '#e0e0e0', true);
  $: spacing = config.spacing || 20;
</script>

<div
  class="divider-widget"
  id={config.anchorName || undefined}
  style="
    border-top: {thickness}px {dividerStyle} {dividerColor};
    margin: {spacing}px 0;
  "
/>

<style>
  .divider-widget {
    width: 100%;
  }
</style>
