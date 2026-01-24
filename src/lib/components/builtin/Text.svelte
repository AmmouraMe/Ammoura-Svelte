<script lang="ts">
  import type { WidgetConfig, TypographyConfig } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { substituteTemplate, createUserContext } from '$lib/utils/templateSubstitution';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;
  export let colorTheme: string = 'vibrant';

  $: rawText = config.text || '';
  $: rawHtml = config.html as string | undefined;
  $: userContext = createUserContext(user);
  $: text = siteContext
    ? substituteTemplate(rawText, { site: siteContext, user: userContext })
    : rawText;
  $: html =
    rawHtml && siteContext
      ? substituteTemplate(rawHtml, { site: siteContext, user: userContext })
      : rawHtml;
  $: alignment = config.alignment || 'left';

  // Custom styling props
  $: textColor = config.textColor
    ? resolveThemeColor(config.textColor, colorTheme, 'inherit', true)
    : 'inherit';
  $: fontSize = getResponsiveValue(config.fontSize);
  $: typography = (config.typography || {}) as TypographyConfig;

  // Helper to get responsive value (desktop by default for SSR)
  function getResponsiveValue<T>(
    value: T | { mobile?: T; tablet?: T; desktop: T } | undefined
  ): T | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'object' && value !== null && 'desktop' in value) {
      return (value as { desktop: T }).desktop;
    }
    return value as T;
  }

  // Build inline style string
  $: customStyle = (() => {
    const styles: string[] = [`text-align: ${alignment}`];
    if (textColor && textColor !== 'inherit') styles.push(`color: ${textColor}`);
    if (fontSize) styles.push(`font-size: ${fontSize}px`);
    if (typography.fontWeight) styles.push(`font-weight: ${typography.fontWeight}`);
    if (typography.fontStyle) styles.push(`font-style: ${typography.fontStyle}`);
    if (typography.lineHeight) styles.push(`line-height: ${typography.lineHeight}`);
    if (typography.letterSpacing) styles.push(`letter-spacing: ${typography.letterSpacing}px`);
    if (typography.textTransform) styles.push(`text-transform: ${typography.textTransform}`);
    if (typography.textDecoration) styles.push(`text-decoration: ${typography.textDecoration}`);
    return styles.join('; ');
  })();
</script>

<div class="text-widget" id={config.anchorName || undefined} style={customStyle}>
  {#if html}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  {:else}
    {text}
  {/if}
</div>

<style>
  .text-widget {
    padding: 0;
    line-height: 1.6;
    white-space: pre-wrap;
  }
</style>
