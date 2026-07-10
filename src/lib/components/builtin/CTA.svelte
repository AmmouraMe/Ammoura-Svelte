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
    /* Mobile-first fluid section padding. */
    padding: clamp(var(--space-6), 6vw, var(--space-9)) 0;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  }

  .cta-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 0 var(--space-4);
  }

  /* White text is intentional: it sits on the saturated primary gradient in
     both light and dark themes, so it must NOT follow the theme text color. */
  .cta-content h2 {
    color: #fff;
    font-size: clamp(2rem, 4vw + 1rem, 2.5rem);
    line-height: var(--leading-tight);
    font-weight: 700;
    margin: 0 0 var(--space-4) 0;
  }

  .cta-content p {
    color: rgba(255, 255, 255, 0.9);
    font-size: clamp(1.125rem, 2vw + 0.5rem, 1.25rem);
    line-height: var(--leading-normal);
    margin: 0 0 var(--space-6) 0;
  }

  .cta-actions {
    display: flex;
    gap: var(--space-4);
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    /* Accessible tap target (F0 --touch-target, 44px). */
    min-height: var(--touch-target);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    text-decoration: none;
    font-weight: 600;
    transition:
      transform var(--motion-fast),
      background var(--motion-fast);
    border: none;
  }

  .btn-primary {
    background: #fff;
    color: var(--color-primary);
  }

  .btn-primary:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: transparent;
    color: #fff;
    border: 2px solid #fff;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .btn-lg {
    padding: var(--space-4) var(--space-6);
    font-size: 1.125rem;
  }

  /* Type scales fluidly via clamp(); mobile only needs the actions to stack. */
  @media (max-width: 768px) {
    .cta-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
