<script lang="ts">
  import type { WidgetConfig, ColorTheme } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { substituteTemplate, createUserContext } from '$lib/utils/templateSubstitution';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let colorTheme: ColorTheme = 'vibrant';
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;

  // Helper to substitute templates if site context is available
  $: userContext = createUserContext(user);
  const sub = (text: string): string =>
    siteContext ? substituteTemplate(text, { site: siteContext, user: userContext }) : text;

  $: title = sub(config.title || 'Features');
  $: subtitle = sub(config.subtitle || '');
  $: allFeatures = config.features || [];
  $: cardBackground = resolveThemeColor(config.cardBackground, colorTheme, 'theme:surface', true);
  $: cardBorderColor = resolveThemeColor(config.cardBorderColor, colorTheme, 'theme:border', true);
  $: cardBorderWidth = config.cardBorderWidth !== undefined ? config.cardBorderWidth : 1;
  $: cardBorderRadius = config.cardBorderRadius !== undefined ? config.cardBorderRadius : 12;

  // Responsive column and gap values
  $: desktopColumns =
    typeof config.featuresColumns === 'object' ? config.featuresColumns.desktop : 3;
  $: tabletColumns = typeof config.featuresColumns === 'object' ? config.featuresColumns.tablet : 2;
  $: mobileColumns = typeof config.featuresColumns === 'object' ? config.featuresColumns.mobile : 1;

  $: desktopGap = typeof config.featuresGap === 'object' ? config.featuresGap.desktop : 32;
  $: tabletGap = typeof config.featuresGap === 'object' ? config.featuresGap.tablet : 24;
  $: mobileGap = typeof config.featuresGap === 'object' ? config.featuresGap.mobile : 16;

  // Responsive limits - default to showing all if not specified
  $: desktopLimit =
    typeof config.featuresLimit === 'object' ? config.featuresLimit.desktop : undefined;
  $: tabletLimit =
    typeof config.featuresLimit === 'object' ? config.featuresLimit.tablet : undefined;
  $: mobileLimit =
    typeof config.featuresLimit === 'object' ? config.featuresLimit.mobile : undefined;

  // Apply limits to the features array
  $: displayedFeatures = allFeatures;

  $: gridStyle = `
    --desktop-columns: ${desktopColumns};
    --tablet-columns: ${tabletColumns};
    --mobile-columns: ${mobileColumns};
    --desktop-gap: ${desktopGap}px;
    --tablet-gap: ${tabletGap}px;
    --mobile-gap: ${mobileGap}px;
  `;
</script>

<div class="features-widget" id={config.anchorName || undefined}>
  <div class="section-header">
    <h2>{title}</h2>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
  </div>

  <div class="features-grid" style={gridStyle}>
    {#each displayedFeatures as feature, index}
      <div
        class="feature-card"
        class:desktop-hidden={desktopLimit && index >= desktopLimit}
        class:tablet-hidden={tabletLimit && index >= tabletLimit}
        class:mobile-hidden={mobileLimit && index >= mobileLimit}
        style="background: {cardBackground}; border: {cardBorderWidth}px solid {cardBorderColor}; border-radius: {cardBorderRadius}px;"
      >
        <div class="feature-icon">{feature.icon}</div>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .features-widget {
    padding: 4rem 0;
  }

  .section-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .section-header h2 {
    color: var(--color-text-primary);
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
  }

  .section-header p {
    color: var(--color-text-secondary);
    font-size: 1.125rem;
    margin: 0;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(var(--desktop-columns, 3), 1fr);
    gap: var(--desktop-gap, 32px);
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature-card {
    padding: 2rem;
    text-align: center;
    transition: all 0.3s ease;
  }

  /* Hide features beyond the limit for desktop */
  .feature-card.desktop-hidden {
    display: none;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border-color: var(--color-primary);
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    color: var(--color-text-primary);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
  }

  .feature-card p {
    color: var(--color-text-secondary);
    font-size: 1rem;
    line-height: 1.6;
    margin: 0;
  }

  @media (max-width: 1024px) {
    .features-grid {
      grid-template-columns: repeat(var(--tablet-columns, 2), 1fr);
      gap: var(--tablet-gap, 24px);
    }

    /* Show desktop-hidden items on tablet, then apply tablet limit */
    .feature-card.desktop-hidden {
      display: block;
    }
    .feature-card.tablet-hidden {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .features-widget {
      padding: 2rem 0;
    }

    .section-header h2 {
      font-size: 2rem;
    }

    .features-grid {
      grid-template-columns: repeat(var(--mobile-columns, 1), 1fr);
      gap: var(--mobile-gap, 16px);
    }

    .feature-card {
      padding: 1.5rem;
    }

    /* Show tablet-hidden items on mobile, then apply mobile limit */
    .feature-card.tablet-hidden {
      display: block;
    }
    .feature-card.mobile-hidden {
      display: none;
    }
  }
</style>
