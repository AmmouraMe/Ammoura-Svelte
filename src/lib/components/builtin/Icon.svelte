<script lang="ts">
  import type { WidgetConfig } from '$lib/types/pages';
  import type { ComponentType, SvelteComponent } from 'svelte';
  import * as icons from 'lucide-svelte';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let colorTheme: string = 'default';

  // Get all available icons for dynamic lookup
  const allIcons: Record<string, ComponentType<SvelteComponent>> = Object.fromEntries(
    Object.entries(icons).filter(([name]) => !name.includes('Lucide'))
  ) as Record<string, ComponentType<SvelteComponent>>;

  // Extract config values
  $: iconName = (config.iconName as string) || 'Star';
  $: iconSize = (config.iconSize as number) || 24;
  $: rawIconColor = (config.iconColor as string) || 'theme:text';
  $: iconColor = resolveThemeColor(rawIconColor, colorTheme, 'currentColor', true);
  $: strokeWidth = (config.strokeWidth as number) || 2;
  $: alignment = (config.alignment as 'left' | 'center' | 'right') || 'center';

  // Get the icon component dynamically
  $: IconComponent = allIcons[iconName] || allIcons['Star'];

  // Build alignment style
  $: alignmentStyle = (() => {
    switch (alignment) {
      case 'left':
        return 'justify-content: flex-start;';
      case 'right':
        return 'justify-content: flex-end;';
      default:
        return 'justify-content: center;';
    }
  })();
</script>

<div
  class="icon-widget"
  id={config.anchorName || undefined}
  style="display: flex; {alignmentStyle}"
>
  {#if IconComponent}
    <svelte:component this={IconComponent} size={iconSize} color={iconColor} {strokeWidth} />
  {:else}
    <span class="icon-placeholder">Icon not found: {iconName}</span>
  {/if}
</div>

<style>
  .icon-widget {
    padding: 0.25rem;
  }

  .icon-placeholder {
    font-size: 0.75rem;
    color: #b91c1c;
    background: #fef2f2;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }
</style>
