<script lang="ts">
  /**
   * Footer - Footer component built on Container architecture
   * Uses the actual Container component for consistent layout with the builder system
   *
   * Container Integration:
   * - Uses Container component to wrap inner content
   * - Supports containerPadding, containerMaxWidth, containerBackground
   * - Falls back to footerPadding/footerBackground for backward compatibility
   * - Inner structure uses flexbox layout (logo/tagline, link sections, social, copyright)
   */
  import type { WidgetConfig, SpacingConfig, ResponsiveValue } from '$lib/types/pages';
  import Container from './Container.svelte';
  import {
    substituteTemplate,
    createUserContext,
    currentYear,
    type SiteContext,
    type UserInfo
  } from '$lib/utils/templateSubstitution';

  export let config: WidgetConfig = {};
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | undefined = undefined;
  // When true, prevents navigation for links (used in builder preview)
  export let isEditable = false;

  // Create user context for template substitution
  $: userContext = createUserContext(user);

  // Fallback site context for template substitution
  const fallbackSite: SiteContext = {
    name: '',
    tagline: '',
    description: '',
    email: '',
    supportEmail: '',
    phone: '',
    currency: '',
    year: currentYear()
  };

  // Reactive template variables that update when user or siteContext changes
  $: templateVars = {
    site: siteContext || fallbackSite,
    user: userContext
  };

  // Helper function to substitute templates in text
  // Takes templateVars as a parameter to ensure Svelte tracks the reactive dependency
  function sub(text: string, vars: typeof templateVars): string {
    if (!text) return text;
    return substituteTemplate(text, vars);
  }

  // Prevents link navigation when in edit mode (builder preview)
  function handleLinkClick(event: MouseEvent): void {
    if (isEditable) {
      event.preventDefault();
    }
  }

  // Container configuration - Footer uses Container as its base
  // Supports both new containerPadding and legacy footerPadding
  $: containerPadding = config.containerPadding ||
    config.footerPadding || {
      desktop: { top: 48, right: 24, bottom: 48, left: 24 },
      tablet: { top: 40, right: 20, bottom: 40, left: 20 },
      mobile: { top: 32, right: 16, bottom: 32, left: 16 }
    };
  $: containerMaxWidth = config.containerMaxWidth || '1200px';
  $: containerBorderRadius = config.containerBorderRadius || 0;
  $: containerBackground = config.containerBackground || 'transparent';

  // Build config object for the Container component
  $: containerConfig = {
    containerPadding,
    containerMaxWidth,
    containerBorderRadius,
    containerBackground,
    containerMargin: { desktop: { top: 0, right: 0, bottom: 0, left: 0 } }
  };

  // Get responsive padding for current viewport
  function getResponsivePadding(
    padding: ResponsiveValue<SpacingConfig> | SpacingConfig | undefined
  ): SpacingConfig {
    if (!padding) return { top: 48, right: 24, bottom: 48, left: 24 };
    if ('desktop' in padding) {
      return (padding as ResponsiveValue<SpacingConfig>).desktop;
    }
    return padding as SpacingConfig;
  }

  // Reactive padding value available for component use
  $: _currentPadding = getResponsivePadding(containerPadding);

  // Logo configuration
  $: logo = config.logo || { text: '', url: '/', image: '', imageHeight: 32 };

  // Tagline/description
  $: tagline = config.tagline || '';

  // Copyright
  $: copyright = config.copyright || '© 2025 Store Name. All rights reserved.';

  // Footer links (simple list)
  $: footerLinks = config.footerLinks || [];

  // Link sections (multi-column with titles)
  $: linkSections = config.linkSections || [];

  // Social links
  $: socialLinks = config.socialLinks || [];

  // Styling - footerBackground is for the outer footer wrapper
  // FOUC Prevention: Use CSS variable fallbacks that adapt to light/dark themes automatically
  $: footerBackground = config.footerBackground || 'var(--theme-surface)';
  $: textColor = config.footerTextColor || 'var(--theme-text)';
  $: hoverColor = config.footerHoverColor || 'var(--color-primary)';
  $: borderColor = config.footerBorderColor || 'var(--theme-border)';
  $: footerShadow = config.footerShadow ?? false;

  // Layout options
  $: columnsPerRow = config.columnsPerRow || { desktop: 4, tablet: 2, mobile: 1 };

  const socialIcons: Record<string, string> = {
    facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
    twitter:
      'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
    instagram:
      'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 2h11a4.5 4.5 0 014.5 4.5v11a4.5 4.5 0 01-4.5 4.5h-11A4.5 4.5 0 012 17.5v-11A4.5 4.5 0 016.5 2z',
    linkedin:
      'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z',
    youtube:
      'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z M9.75 15.02l5.75-3.27-5.75-3.27v6.54z',
    github:
      'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
    tiktok: 'M9 12a4 4 0 104 4V4a5 5 0 005 5',
    pinterest:
      'M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49-.09-.79-.18-2.01.04-2.87.2-.78 1.25-5.33 1.25-5.33s-.32-.64-.32-1.58c0-1.48.86-2.58 1.93-2.58.91 0 1.35.68 1.35 1.5 0 .91-.58 2.28-.88 3.54-.25 1.06.53 1.92 1.57 1.92 1.89 0 3.34-1.99 3.34-4.86 0-2.54-1.83-4.32-4.43-4.32-3.02 0-4.79 2.26-4.79 4.6 0 .91.35 1.89.79 2.42.09.11.1.2.07.31-.08.32-.26 1.02-.29 1.16-.05.19-.16.23-.37.14-1.39-.65-2.26-2.68-2.26-4.32 0-3.52 2.56-6.75 7.38-6.75 3.87 0 6.88 2.76 6.88 6.45 0 3.85-2.43 6.95-5.8 6.95-1.13 0-2.2-.59-2.56-1.28l-.7 2.66c-.25.97-.93 2.19-1.39 2.93A10 10 0 0022 12c0-5.52-4.48-10-10-10z'
  };

  // Helper to check if we have the new link sections format
  $: hasLinkSections = linkSections && linkSections.length > 0;
  $: hasLogo = logo && (logo.text || logo.image);
</script>

<!-- 
  Footer Component - Built on Container Architecture
  
  This component uses the actual Container component for its layout:
  - Outer wrapper (footer) provides background and border
  - Container component provides max-width, padding, background, and border-radius
  - Child sections (logo/info, link columns, social, copyright) are flex items
-->
<footer
  class="footer"
  style="
    background-color: {footerBackground}; 
    color: {textColor}; 
    border-top: 1px solid {borderColor};
    {footerShadow ? 'box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);' : ''}
    --hover-color: {hoverColor};
  "
>
  <!-- Uses the actual Container component for consistent builder integration -->
  <Container config={containerConfig}>
    <div class="footer-container">
      <!-- Main content area -->
      <div class="footer-content" style="--columns: {columnsPerRow.desktop};">
        <!-- Logo and Tagline Section -->
        {#if hasLogo || tagline}
          <div class="footer-brand">
            {#if logo.image}
              <a href={logo.url || '/'} class="logo-link" on:click={handleLinkClick}>
                <img
                  src={logo.image}
                  alt={logo.text || 'Logo'}
                  class="logo-image"
                  style="height: {logo.imageHeight || 32}px;"
                />
              </a>
            {:else if logo.text}
              <a
                href={logo.url || '/'}
                class="logo-link logo-text"
                style="color: {textColor};"
                on:click={handleLinkClick}
              >
                {sub(logo.text, templateVars)}
              </a>
            {/if}
            {#if tagline}
              <p class="footer-tagline" style="color: {textColor};">
                {sub(tagline, templateVars)}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Link Sections (multi-column layout) -->
        {#if hasLinkSections}
          {#each linkSections as section}
            <div class="footer-section">
              <h4 class="footer-section-title" style="color: {textColor};">
                {sub(section.title, templateVars)}
              </h4>
              <ul class="footer-section-links">
                {#each section.links as link}
                  <li>
                    <a
                      href={link.url}
                      class="footer-link"
                      style="color: {textColor};"
                      target={link.openInNewTab ? '_blank' : '_self'}
                      rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                      on:click={handleLinkClick}
                    >
                      {sub(link.text, templateVars)}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        {/if}

        <!-- Social Links Section -->
        {#if socialLinks && socialLinks.length > 0}
          <div class="footer-social">
            <h4 class="footer-section-title" style="color: {textColor};">Follow Us</h4>
            <div class="social-links">
              {#each socialLinks as social}
                <a
                  href={social.url}
                  class="social-link"
                  aria-label={social.platform}
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: {textColor};"
                  on:click={handleLinkClick}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d={socialIcons[social.platform] || ''}
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Simple footer links (backward compatibility) -->
      {#if !hasLinkSections && footerLinks && footerLinks.length > 0}
        <div class="footer-simple-links">
          {#each footerLinks as link}
            <a
              href={link.url}
              class="footer-link"
              style="color: {textColor};"
              target={link.openInNewTab ? '_blank' : '_self'}
              rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
              on:click={handleLinkClick}
            >
              {sub(link.text, templateVars)}
            </a>
          {/each}
        </div>
      {/if}

      <!-- Copyright Section -->
      <div class="footer-copyright" style="color: {textColor};">
        {sub(copyright, templateVars)}
      </div>
    </div>
  </Container>
</footer>

<style>
  /* 
   * Footer Styles - Container-based Architecture
   * 
   * The footer uses the actual Container component:
   * - .footer: Outer wrapper with background and border
   * - Container: Provides max-width, padding, background, border-radius
   * - .footer-content: Grid/flex layout for columns
   * - .footer-brand, .footer-section, .footer-social: Grid children
   */
  .footer {
    width: 100%;
    z-index: 100;
  }

  .footer-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Main content grid - multi-column layout */
  .footer-content {
    display: grid;
    grid-template-columns: repeat(var(--columns, 4), 1fr);
    gap: 2rem;
  }

  /* Brand section */
  .footer-brand {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .logo-link {
    text-decoration: none;
    font-weight: 700;
    font-size: 1.25rem;
    transition: opacity 0.2s;
    display: inline-block;
  }

  .logo-link:hover {
    opacity: 0.8;
  }

  .logo-image {
    width: auto;
    object-fit: contain;
  }

  .logo-text {
    color: inherit;
  }

  .footer-tagline {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    opacity: 0.8;
    max-width: 280px;
  }

  /* Link sections */
  .footer-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .footer-section-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .footer-section-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .footer-link {
    text-decoration: none;
    color: inherit;
    font-size: 0.875rem;
    transition:
      color 0.2s,
      opacity 0.2s;
    display: inline-block;
  }

  .footer-link:hover {
    color: var(--hover-color);
    opacity: 0.8;
  }

  /* Simple links (backward compatibility) */
  .footer-simple-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    padding-bottom: 1.5rem;
  }

  /* Social section */
  .footer-social {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .social-links {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .social-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: inherit;
    transition: all 0.2s;
    background: rgba(0, 0, 0, 0.05);
  }

  .social-link:hover {
    color: var(--hover-color);
    background: rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  /* Copyright section */
  .footer-copyright {
    text-align: center;
    font-size: 0.875rem;
    color: inherit;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    opacity: 0.8;
  }

  /* Responsive layout */
  @media (max-width: 1024px) {
    .footer-content {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .footer-content {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .footer-brand {
      align-items: center;
    }

    .footer-tagline {
      text-align: center;
      max-width: 100%;
    }

    .footer-section {
      align-items: center;
    }

    .footer-section-links {
      align-items: center;
    }

    .footer-social {
      align-items: center;
    }

    .social-links {
      justify-content: center;
    }

    .footer-simple-links {
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
  }
</style>
