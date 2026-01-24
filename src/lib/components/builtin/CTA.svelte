<script lang="ts">
  import type { WidgetConfig, ColorTheme } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { substituteTemplate, createUserContext } from '$lib/utils/templateSubstitution';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let colorTheme: ColorTheme = 'vibrant';
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;
  // When true, prevents navigation for links (used in builder preview)
  export let isEditable = false;

  // Helper to substitute templates if site context is available
  $: userContext = createUserContext(user);
  const sub = (text: string): string =>
    siteContext ? substituteTemplate(text, { site: siteContext, user: userContext }) : text;

  // Prevents link navigation when in edit mode (builder preview)
  function handleLinkClick(event: MouseEvent): void {
    if (isEditable) {
      event.preventDefault();
    }
  }

  $: title = sub(config.title || 'Ready to Get Started?');
  $: subtitle = sub(config.subtitle || '');
  $: primaryCtaText = sub(config.primaryCtaText || 'Get Started');
  $: primaryCtaLink = config.primaryCtaLink || '#';
  $: secondaryCtaText = sub(config.secondaryCtaText || '');
  $: secondaryCtaLink = config.secondaryCtaLink || '#';
  $: backgroundColor = resolveThemeColor(config.backgroundColor, colorTheme, '', true);
</script>

<div
  class="cta-widget"
  id={config.anchorName || undefined}
  style={backgroundColor ? `background: ${backgroundColor};` : ''}
>
  <div class="cta-content">
    <h2>{title}</h2>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
    <div class="cta-actions">
      <a href={primaryCtaLink} class="btn btn-primary btn-lg" on:click={handleLinkClick}>
        <span>{primaryCtaText}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M5 12h14M12 5l7 7-7 7"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </a>
      {#if secondaryCtaText}
        <a href={secondaryCtaLink} class="btn btn-secondary btn-lg" on:click={handleLinkClick}>
          {secondaryCtaText}
        </a>
      {/if}
    </div>
  </div>
</div>

<style>
  .cta-widget {
    padding: 4rem 0;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  }

  .cta-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 0 1rem;
  }

  .cta-content h2 {
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
  }

  .cta-content p {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.25rem;
    line-height: 1.6;
    margin: 0 0 2rem 0;
  }

  .cta-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: white;
    color: var(--color-primary);
  }

  .btn-primary:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .btn-lg {
    padding: 1rem 2rem;
    font-size: 1.125rem;
  }

  @media (max-width: 768px) {
    .cta-widget {
      padding: 2rem 0;
    }

    .cta-content h2 {
      font-size: 2rem;
    }

    .cta-content p {
      font-size: 1.125rem;
    }

    .cta-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
