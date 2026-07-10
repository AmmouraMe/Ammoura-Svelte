<script lang="ts">
  /**
   * NavBar - Navigation bar component built on Container architecture
   * Uses the actual Container component for consistent layout with the builder system
   *
   * Container Integration:
   * - Uses Container component to wrap inner content
   * - Supports containerPadding, containerMaxWidth, containerBackground
   * - Falls back to navbarPadding/navbarBackground for backward compatibility
   * - Inner structure uses flexbox layout (brand, links, actions)
   */
  import { onMount } from 'svelte';
  import type { WidgetConfig, SpacingConfig, ResponsiveValue } from '$lib/types/pages';
  import Avatar from '$lib/components/Avatar.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Container from './Container.svelte';
  import { themeStore } from '$lib/stores/theme';
  import { authState } from '$lib/stores/auth';
  import { cartStore } from '$lib/stores/cart';
  import type { Theme } from '$lib/types/theme';
  import {
    substituteTemplate,
    createUserContext,
    currentYear,
    type SiteContext,
    type UserInfo
  } from '$lib/utils/templateSubstitution';

  export let config: WidgetConfig = {};
  export let onLogout: (() => void) | undefined = undefined;
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

  // Container configuration - NavBar uses Container as its base
  // Supports both new containerPadding and legacy navbarPadding
  $: containerPadding = config.containerPadding ||
    config.navbarPadding || {
      desktop: { top: 16, right: 24, bottom: 16, left: 24 },
      tablet: { top: 12, right: 20, bottom: 12, left: 20 },
      mobile: { top: 12, right: 16, bottom: 12, left: 16 }
    };
  $: containerMaxWidth = config.containerMaxWidth || '100%';
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

  // Get responsive padding for current viewport (used for mobile menu)
  function getResponsivePadding(
    padding: ResponsiveValue<SpacingConfig> | SpacingConfig | undefined
  ): SpacingConfig {
    if (!padding) return { top: 16, right: 24, bottom: 16, left: 24 };
    if ('desktop' in padding) {
      return (padding as ResponsiveValue<SpacingConfig>).desktop;
    }
    return padding as SpacingConfig;
  }

  // Reactive padding value available for component use
  $: _currentPadding = getResponsivePadding(containerPadding);

  // Logo configuration
  $: logo = config.logo || { text: 'Store', url: '/', image: '', imageHeight: 40 };
  $: logoPosition = config.logoPosition || 'left';

  // Navigation links
  $: links = config.links || [];
  $: linksPosition = config.linksPosition || 'center';

  // Action buttons
  $: showSearch = config.showSearch ?? false;
  $: showCart = config.showCart ?? true;
  $: showAuth = config.showAuth ?? true;
  $: showThemeToggle = config.showThemeToggle ?? false;
  $: showAccountMenu = config.showAccountMenu ?? true;
  $: actionsPosition = config.actionsPosition || 'right';
  $: accountMenuItems = config.accountMenuItems || [];

  // Styling - navbarBackground is for the outer nav wrapper, containerBackground is for the Container
  // FOUC Prevention: Use CSS variable fallbacks that adapt to light/dark themes automatically
  $: navbarBackground = config.navbarBackground || 'transparent';
  $: textColor = config.navbarTextColor || 'var(--theme-text)';
  $: hoverColor = config.navbarHoverColor || 'var(--color-primary)';
  $: borderColor = config.navbarBorderColor || 'var(--theme-border)';
  $: navbarShadow = config.navbarShadow ?? false;
  $: sticky = config.sticky ?? false;
  $: navbarHeight = config.navbarHeight || 0;

  // Dropdown styling - uses CSS variables for automatic theme adaptation
  $: dropdownBackground = config.dropdownBackground || 'var(--theme-surface)';
  $: dropdownTextColor = config.dropdownTextColor || 'var(--theme-text)';
  $: dropdownHoverBackground = config.dropdownHoverBackground || 'var(--theme-background)';

  // Mobile: the navbar collapses to a hamburger at the canonical mobile
  // breakpoint (BREAKPOINTS.md, 768px). This is a fixed design-system value —
  // there is no per-navbar override, because CSS media queries can't read a
  // configurable CSS variable (the old `mobileBreakpoint` config never worked).

  // State
  let isMobileMenuOpen = false;
  let showAccountDropdown = false;
  let showDropdownFor: string | null = null;
  let totalCartItems = 0;

  // Subscribe to cart store
  $: if ($cartStore) {
    totalCartItems = cartStore.getTotalItems($cartStore);
  }

  function toggleMobileMenu(): void {
    isMobileMenuOpen = !isMobileMenuOpen;
    showAccountDropdown = false;
    showDropdownFor = null;
  }

  function closeMobileMenu(): void {
    isMobileMenuOpen = false;
  }

  function toggleAccountMenu(): void {
    showAccountDropdown = !showAccountDropdown;
    showDropdownFor = null;
  }

  function closeAccountMenu(): void {
    showAccountDropdown = false;
  }

  function toggleDropdown(linkText: string): void {
    showDropdownFor = showDropdownFor === linkText ? null : linkText;
    showAccountDropdown = false;
  }

  function closeDropdowns(): void {
    showDropdownFor = null;
    showAccountDropdown = false;
  }

  function handleThemeChange(theme: Theme): void {
    themeStore.setTheme(theme);
    closeAccountMenu();
  }

  function handleLogout(): void {
    closeAccountMenu();
    // Call the onLogout callback if provided
    if (onLogout) {
      onLogout();
    }
  }

  onMount(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        closeDropdowns();
        closeAccountMenu();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
</script>

<!-- 
  NavBar Component - Built on Container Architecture
  
  This component uses the actual Container component for its layout:
  - Outer wrapper (nav) provides sticky behavior and border
  - Container component provides max-width, padding, background, and border-radius
  - Child sections (brand, links, actions) are flex items within the container
-->
<nav
  class="navbar"
  class:sticky
  style="
    background-color: {navbarBackground}; 
    color: {textColor}; 
    border-bottom: 1px solid {borderColor};
    {navbarHeight > 0 ? `height: ${navbarHeight}px;` : ''}
    {navbarShadow ? 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);' : ''}
    --hover-color: {hoverColor};
  "
>
  <!-- Uses the actual Container component for consistent builder integration -->
  <Container config={containerConfig}>
    <div
      class="navbar-content"
      class:logo-left={logoPosition === 'left'}
      class:logo-center={logoPosition === 'center'}
      class:links-left={linksPosition === 'left'}
      class:links-center={linksPosition === 'center'}
      class:links-right={linksPosition === 'right'}
      class:actions-left={actionsPosition === 'left'}
      class:actions-right={actionsPosition === 'right'}
    >
      <!-- Brand Section - flex child -->
      <div class="navbar-brand">
        {#if logo.image}
          <a href={logo.url || '/'} class="logo-link" on:click={handleLinkClick}>
            <img
              src={logo.image}
              alt={sub(logo.text || '', templateVars) || 'Logo'}
              class="logo-image"
              style="height: {logo.imageHeight || 40}px;"
            />
          </a>
        {:else}
          <a
            href={logo.url || '/'}
            class="logo-link logo-text"
            style="color: {textColor};"
            on:click={handleLinkClick}
          >
            {sub(logo.text || '', templateVars) || 'Store'}
          </a>
        {/if}
      </div>

      <!-- Links Section - flex child -->
      <div class="navbar-links desktop-only">
        {#each links as link}
          {#if link.children && link.children.length > 0}
            <div class="dropdown-container">
              <button
                class="nav-link dropdown-trigger"
                style="color: {textColor};"
                on:click={() => toggleDropdown(link.text)}
              >
                {sub(link.text, templateVars)}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="chevron"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>
                </svg>
              </button>
              {#if showDropdownFor === link.text}
                <div
                  class="dropdown-menu"
                  style="background-color: {dropdownBackground}; color: {dropdownTextColor};"
                >
                  {#each link.children as child}
                    <a
                      href={child.url}
                      class="dropdown-item"
                      style="color: {dropdownTextColor}; --dropdown-hover-bg: {dropdownHoverBackground};"
                      target={child.openInNewTab ? '_blank' : '_self'}
                      rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                      on:click={(e) => {
                        handleLinkClick(e);
                        closeDropdowns();
                      }}
                    >
                      {sub(child.text, templateVars)}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <a
              href={link.url}
              class="nav-link"
              style="color: {textColor};"
              target={link.openInNewTab ? '_blank' : '_self'}
              rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
              on:click={handleLinkClick}
            >
              {sub(link.text, templateVars)}
            </a>
          {/if}
        {/each}
      </div>

      <!-- Actions -->
      <div class="navbar-actions">
        {#if showThemeToggle && !$authState.isAuthenticated}
          <div class="desktop-only">
            <ThemeToggle />
          </div>
        {/if}

        {#if showSearch}
          <button class="action-btn" aria-label="Search" style="color: {textColor};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" stroke-width="2"></circle>
              <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"></path>
            </svg>
          </button>
        {/if}

        {#if $authState.isAuthenticated && showAccountMenu}
          <div class="dropdown-container desktop-only">
            <button
              class="account-button"
              on:click={toggleAccountMenu}
              aria-label="Account menu"
              style="color: {textColor};"
            >
              <Avatar name={$authState.user?.name} size="small" variant="primary" />
              <span class="account-name">{$authState.user?.name || 'User'}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="chevron"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
              </svg>
            </button>

            {#if showAccountDropdown}
              <div
                class="dropdown-menu account-dropdown"
                style="background-color: {dropdownBackground}; color: {dropdownTextColor};"
              >
                <div class="account-info">
                  <div class="account-info-name">{$authState.user?.name}</div>
                  <div class="account-info-email">{$authState.user?.email}</div>
                  <div class="account-info-role">{$authState.user?.role}</div>
                </div>

                <div class="dropdown-divider"></div>

                <div class="theme-selector">
                  <div class="theme-selector-label">Theme</div>
                  <div class="theme-options">
                    <button
                      class="theme-option"
                      class:active={$themeStore === 'light'}
                      on:click={() => handleThemeChange('light')}
                      aria-label="Light theme"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                      </svg>
                      <span>Light</span>
                    </button>
                    <button
                      class="theme-option"
                      class:active={$themeStore === 'dark'}
                      on:click={() => handleThemeChange('dark')}
                      aria-label="Dark theme"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                      </svg>
                      <span>Dark</span>
                    </button>
                    <button
                      class="theme-option"
                      class:active={$themeStore === 'system'}
                      on:click={() => handleThemeChange('system')}
                      aria-label="System theme"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {#if accountMenuItems.length > 0}
                  {#each accountMenuItems as item}
                    {#if item.dividerBefore}
                      <div class="dropdown-divider"></div>
                    {/if}
                    <a
                      href={item.url}
                      class="dropdown-item"
                      style="color: {dropdownTextColor}; --dropdown-hover-bg: {dropdownHoverBackground};"
                      on:click={handleLinkClick}
                    >
                      {#if item.icon}
                        <span class="item-icon">{item.icon}</span>
                      {/if}
                      {item.text}
                    </a>
                  {/each}
                {/if}

                <div class="dropdown-divider"></div>

                <button
                  class="dropdown-item"
                  on:click={handleLogout}
                  style="color: {dropdownTextColor}; --dropdown-hover-bg: {dropdownHoverBackground};"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                  Logout
                </button>
              </div>
            {/if}
          </div>
        {:else if showAuth && !$authState.isAuthenticated}
          <a
            href="/auth/login"
            class="login-link"
            style="color: {textColor};"
            on:click={handleLinkClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
            </svg>
            <span class="login-text">Login</span>
          </a>
        {/if}

        {#if showCart}
          <a href="/cart" class="cart-link" style="color: {textColor};" on:click={handleLinkClick}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="m1 1 4 4 14 1-1 7H6"></path>
            </svg>
            <span class="cart-text">Cart</span>
            {#if totalCartItems > 0}
              <span class="cart-badge">{totalCartItems}</span>
            {/if}
          </a>
        {/if}

        <!-- Mobile Menu Toggle -->
        <button
          class="mobile-menu-toggle mobile-only"
          on:click={toggleMobileMenu}
          aria-label="Toggle menu"
          style="color: {textColor};"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {#if isMobileMenuOpen}
              <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"></path>
            {:else}
              <path d="M3 12h18M3 6h18M3 18h18" stroke-width="2" stroke-linecap="round"></path>
            {/if}
          </svg>
        </button>
      </div>
    </div>
  </Container>

  <!-- Mobile Menu -->
  {#if isMobileMenuOpen}
    <div class="mobile-menu" style="border-top: 1px solid {borderColor};">
      {#each links as link}
        {#if link.children && link.children.length > 0}
          <div class="mobile-dropdown">
            <button
              class="mobile-nav-link mobile-dropdown-trigger"
              style="color: {textColor};"
              on:click={() => toggleDropdown(link.text)}
            >
              {sub(link.text, templateVars)}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="chevron"
                class:rotated={showDropdownFor === link.text}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
              </svg>
            </button>
            {#if showDropdownFor === link.text}
              <div class="mobile-submenu">
                {#each link.children as child}
                  <a
                    href={child.url}
                    class="mobile-submenu-link"
                    style="color: {textColor};"
                    on:click={(e) => {
                      handleLinkClick(e);
                      closeMobileMenu();
                    }}
                    target={child.openInNewTab ? '_blank' : '_self'}
                    rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                  >
                    {sub(child.text, templateVars)}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <a
            href={link.url}
            class="mobile-nav-link"
            style="color: {textColor};"
            on:click={(e) => {
              handleLinkClick(e);
              closeMobileMenu();
            }}
            target={link.openInNewTab ? '_blank' : '_self'}
            rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
          >
            {sub(link.text, templateVars)}
          </a>
        {/if}
      {/each}
    </div>
  {/if}
</nav>

<style>
  /* 
   * NavBar Styles - Container-based Architecture
   * 
   * The navbar uses the actual Container component:
   * - .navbar: Outer wrapper with sticky and border
   * - Container: Provides max-width, padding, background, border-radius
   * - .navbar-content: Flex layout for brand, links, actions
   * - .navbar-brand, .navbar-links, .navbar-actions: Flex children
   */
  .navbar {
    width: 100%;
    z-index: 1000;
    transition: all 0.3s ease;
  }

  .navbar.sticky {
    position: sticky;
    top: 0;
  }

  /* Navbar content wrapper - flex layout inside Container */
  .navbar-content {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    box-sizing: border-box;
  }

  /* Logo positioning */
  .navbar-content.logo-center {
    flex-direction: column;
    gap: 1rem;
  }

  /* Brand section - flex child. min-width: 0 lets a long store name shrink
     and truncate instead of pushing the actions past the viewport edge. */
  .navbar-brand {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .logo-link {
    text-decoration: none;
    font-weight: 700;
    font-size: 1.5rem;
    transition: opacity 0.2s;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  /* Links section - flex child */
  .navbar-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex: 1;
  }

  .navbar-content.links-center .navbar-links {
    justify-content: center;
  }

  .navbar-content.links-right .navbar-links {
    justify-content: flex-end;
  }

  .navbar-content.links-left .navbar-links {
    justify-content: flex-start;
  }

  .nav-link {
    text-decoration: none;
    color: inherit;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-link:hover {
    color: var(--hover-color);
  }

  .nav-link.dropdown-trigger {
    padding: 0.5rem;
  }

  /* Dropdown */
  .dropdown-container {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 200px;
    margin-top: 0.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1001;
    overflow: hidden;
  }

  .dropdown-menu.account-dropdown {
    min-width: 250px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: inherit;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .dropdown-item:hover {
    background-color: var(--dropdown-hover-bg);
  }

  .dropdown-divider {
    height: 1px;
    background-color: var(--theme-border);
    margin: 0.5rem 0;
  }

  .account-info {
    padding: 1rem;
  }

  .account-info-name {
    font-weight: 600;
    font-size: 0.9375rem;
    margin-bottom: 0.25rem;
  }

  .account-info-email {
    font-size: 0.8125rem;
    opacity: 0.7;
    margin-bottom: 0.25rem;
  }

  .account-info-role {
    font-size: 0.75rem;
    opacity: 0.6;
    text-transform: capitalize;
  }

  .theme-selector {
    padding: 0.75rem 1rem;
  }

  .theme-selector-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.6;
    margin-bottom: 0.5rem;
  }

  .theme-options {
    display: flex;
    gap: 0.5rem;
  }

  .theme-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--theme-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .theme-option:hover {
    background-color: var(--dropdown-hover-bg);
  }

  .theme-option.active {
    border-color: var(--hover-color);
    background-color: var(--hover-color);
    color: var(--color-on-primary, #fff);
  }

  .item-icon {
    font-size: 1.125rem;
  }

  .chevron {
    transition: transform 0.2s;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  /* Actions section - flex child */
  .navbar-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }

  .navbar-content.actions-left .navbar-actions {
    order: -1;
  }

  .action-btn,
  .login-link,
  .cart-link,
  .account-button {
    background: none;
    border: none;
    padding: 0.5rem 1rem;
    /* Accessible tap target (F0 --touch-target token, 44px) */
    min-height: var(--touch-target);
    cursor: pointer;
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s;
    font-weight: 500;
    position: relative;
  }

  .action-btn {
    min-width: var(--touch-target);
  }

  .action-btn:hover,
  .login-link:hover,
  .cart-link:hover,
  .account-button:hover {
    background-color: var(--color-bg-tertiary, rgba(0, 0, 0, 0.05));
    color: var(--hover-color);
  }

  .account-button {
    padding: 0.375rem 0.75rem;
  }

  .account-name {
    font-weight: 500;
  }

  .cart-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    background: var(--color-error, #ef4444);
    color: var(--color-on-primary, #fff);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 600;
  }

  /* Mobile */
  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    padding: 0.5rem;
    /* Accessible tap target (F0 --touch-target token, 44px) */
    min-width: var(--touch-target);
    min-height: var(--touch-target);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: inherit;
  }

  .mobile-menu {
    display: none;
  }

  .desktop-only {
    display: flex;
  }

  .mobile-only {
    display: none;
  }

  /*
   * Mobile collapse at the canonical breakpoint. The 768px literal mirrors
   * BREAKPOINTS.md (CSS media queries can't read the token); breakpoints.test.ts
   * pins it so the two can't drift.
   */
  @media (max-width: 768px) {
    .desktop-only {
      display: none !important;
    }

    .mobile-only {
      display: flex !important;
    }

    .mobile-menu-toggle {
      display: flex;
    }

    .mobile-menu {
      display: flex;
      flex-direction: column;
      padding: 1rem 1.5rem;
    }

    .mobile-nav-link,
    .mobile-dropdown-trigger {
      padding: 0.75rem 0;
      /* Accessible tap target (F0 --touch-target token, 44px) */
      min-height: var(--touch-target);
      text-decoration: none;
      color: inherit;
      font-weight: 500;
      transition: color 0.2s;
      background: none;
      border: none;
      cursor: pointer;
      width: 100%;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .mobile-nav-link:hover,
    .mobile-dropdown-trigger:hover {
      color: var(--hover-color);
    }

    .mobile-submenu {
      display: flex;
      flex-direction: column;
      padding-left: 1rem;
    }

    .mobile-submenu-link {
      padding: 0.5rem 0;
      text-decoration: none;
      color: inherit;
      font-size: 0.875rem;
      transition: color 0.2s;
    }

    .mobile-submenu-link:hover {
      color: var(--hover-color);
    }

    .navbar-content {
      flex-direction: row !important;
      gap: 0.75rem;
    }

    .navbar-links {
      display: none;
    }

    /* Icon-only actions: the text labels don't fit next to a long store
       name at phone widths; the 44px tap targets remain. */
    .navbar-actions {
      gap: 0.25rem;
    }

    .login-text,
    .cart-text {
      display: none;
    }

    .login-link,
    .cart-link {
      padding: 0.5rem;
      min-width: var(--touch-target);
    }
  }
</style>
