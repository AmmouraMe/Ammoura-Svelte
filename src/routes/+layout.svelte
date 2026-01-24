<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  import BuildInfo from '../lib/components/BuildInfo.svelte';
  import ConfirmModal from '../lib/components/ConfirmModal.svelte';
  import FrontendComponentRenderer from '../lib/components/FrontendComponentRenderer.svelte';
  import PromptModal from '../lib/components/PromptModal.svelte';
  import ThemePreviewIndicator from '../lib/components/ThemePreviewIndicator.svelte';
  import ToastContainer from '../lib/components/ToastContainer.svelte';
  import { authStore, authState } from '../lib/stores/auth';
  import { themeStore } from '../lib/stores/theme';

  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';
  import type { ResponsiveValue, PositionConfig } from '$lib/types/pages';

  export let data: LayoutData;

  $: isAdminPage = browser && $page.url.pathname.startsWith('/admin');

  // Determine the active color theme based on the current theme mode (light/dark)
  // This is used to pass to navbar/footer renderers for proper theme color resolution
  // Uses themeStore to be reactive to theme changes
  function getSystemTheme(): 'light' | 'dark' {
    if (!browser) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Derive the applied theme mode from the theme preference
  // When preference is 'system', use the OS preference
  $: appliedThemeMode =
    $themeStore === 'system' ? getSystemTheme() : ($themeStore as 'light' | 'dark');

  // The active color theme ID that matches the current light/dark mode
  $: activeColorTheme =
    appliedThemeMode === 'dark'
      ? data.systemDarkThemeId || 'midnight'
      : data.systemLightThemeId || 'vibrant';
  $: canAccessAdmin =
    $authState.isAuthenticated &&
    ($authState.user?.role === 'admin' || $authState.user?.role === 'platform_engineer');

  // Check if the current page has a custom layout via $page.data.pageLayoutData
  // This allows pages to override the default navbar/footer
  $: pageLayoutData = $page.data?.pageLayoutData as
    | {
        navbar: {
          type: 'navbar';
          config: Record<string, unknown>;
          position?: ResponsiveValue<PositionConfig>;
        } | null;
        footer: {
          type: 'footer';
          config: Record<string, unknown>;
          position?: ResponsiveValue<PositionConfig>;
        } | null;
        hasCustomLayout: boolean;
      }
    | undefined;

  // Determine effective navbar/footer based on page layout
  // If page has a custom layout, use its navbar/footer (which may be null for blank layouts)
  // Otherwise, use the site's default layout
  $: effectiveNavbar = pageLayoutData?.hasCustomLayout
    ? pageLayoutData.navbar
    : data.layoutData?.navbar;

  $: effectiveFooter = pageLayoutData?.hasCustomLayout
    ? pageLayoutData.footer
    : data.layoutData?.footer;

  // Build the navbar config with admin menu items if applicable
  $: navbarConfig = effectiveNavbar?.config
    ? {
        ...effectiveNavbar.config,
        // Add admin dashboard link if user can access admin
        accountMenuItems: canAccessAdmin
          ? [
              { text: 'Admin Dashboard', url: '/admin/dashboard', icon: '📊' },
              ...((effectiveNavbar.config.accountMenuItems as Array<{
                text: string;
                url: string;
                icon?: string;
              }>) || [])
            ]
          : (effectiveNavbar.config.accountMenuItems as Array<{
              text: string;
              url: string;
              icon?: string;
            }>) || []
      }
    : null;

  // Footer config from effective layout data
  $: footerConfig = effectiveFooter?.config || null;

  // Generate CSS custom properties from theme colors
  // Note: We generate both --color-* (for app compatibility) and --theme-* (for component theme:* references)
  $: lightThemeStyles = data.themeColorsLight
    ? `
    --color-primary: ${data.themeColorsLight.primary};
    --color-primary-hover: ${data.themeColorsLight.primaryHover};
    --color-primary-light: ${data.themeColorsLight.primaryLight};
    --color-secondary: ${data.themeColorsLight.secondary};
    --color-secondary-hover: ${data.themeColorsLight.secondaryHover};
    --color-bg-primary: ${data.themeColorsLight.bgPrimary};
    --color-bg-secondary: ${data.themeColorsLight.bgSecondary};
    --color-bg-tertiary: ${data.themeColorsLight.bgTertiary};
    --color-text-primary: ${data.themeColorsLight.textPrimary};
    --color-text-secondary: ${data.themeColorsLight.textSecondary};
    --color-border-primary: ${data.themeColorsLight.borderPrimary};
    --color-border-secondary: ${data.themeColorsLight.borderSecondary};
    --theme-primary: ${data.themeColorsLight.primary};
    --theme-secondary: ${data.themeColorsLight.secondary};
    --theme-accent: ${data.themeColorsLight.primaryLight};
    --theme-background: ${data.themeColorsLight.bgPrimary};
    --theme-surface: ${data.themeColorsLight.bgSecondary};
    --theme-text: ${data.themeColorsLight.textPrimary};
    --theme-text-secondary: ${data.themeColorsLight.textSecondary};
    --theme-border: ${data.themeColorsLight.borderPrimary};
    `
    : '';

  $: darkThemeStyles = data.themeColorsDark
    ? `
    --color-primary: ${data.themeColorsDark.primary};
    --color-primary-hover: ${data.themeColorsDark.primaryHover};
    --color-primary-light: ${data.themeColorsDark.primaryLight};
    --color-secondary: ${data.themeColorsDark.secondary};
    --color-secondary-hover: ${data.themeColorsDark.secondaryHover};
    --color-bg-primary: ${data.themeColorsDark.bgPrimary};
    --color-bg-secondary: ${data.themeColorsDark.bgSecondary};
    --color-bg-tertiary: ${data.themeColorsDark.bgTertiary};
    --color-text-primary: ${data.themeColorsDark.textPrimary};
    --color-text-secondary: ${data.themeColorsDark.textSecondary};
    --color-border-primary: ${data.themeColorsDark.borderPrimary};
    --color-border-secondary: ${data.themeColorsDark.borderSecondary};
    --theme-primary: ${data.themeColorsDark.primary};
    --theme-secondary: ${data.themeColorsDark.secondary};
    --theme-accent: ${data.themeColorsDark.primaryLight};
    --theme-background: ${data.themeColorsDark.bgPrimary};
    --theme-surface: ${data.themeColorsDark.bgSecondary};
    --theme-text: ${data.themeColorsDark.textPrimary};
    --theme-text-secondary: ${data.themeColorsDark.textSecondary};
    --theme-border: ${data.themeColorsDark.borderPrimary};
    `
    : '';

  onMount(() => {
    themeStore.initTheme();

    // Remove the no-transitions class and add hydration-complete after hydration settles
    // We wait until document.fonts.ready to ensure all fonts are loaded,
    // then use a delay to account for Svelte reactive updates settling
    // and any layout shifts that may occur during hydration.
    // The hydration-complete class makes the page visible (it was opacity:0 during hydration)
    // This prevents FOUC and visible layout shifts during initial render.
    const enableTransitions = (): void => {
      document.documentElement.classList.remove('no-transitions');
      document.documentElement.classList.add('hydration-complete');
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        // Delay to ensure layout has settled after hydration
        setTimeout(enableTransitions, 300);
      });
    } else {
      // Fallback for browsers without document.fonts
      setTimeout(enableTransitions, 800);
    }
  });

  // Reactively sync auth state with server data
  // This runs whenever data.currentUser changes (e.g., after invalidateAll())
  $: if (browser) {
    if (data.currentUser) {
      // Server says user is logged in - update client state if different
      if (!$authState.isAuthenticated || $authState.user?.id !== data.currentUser.id) {
        authState.set({
          user: {
            id: data.currentUser.id,
            email: data.currentUser.email,
            name: data.currentUser.name,
            role: data.currentUser.role
          },
          isAuthenticated: true,
          isLoading: false
        });
      }
    } else if ($authState.isAuthenticated) {
      // Server says no user - clear client state
      authState.set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }

  onDestroy(() => {
    themeStore.cleanup();
  });

  function handleLogout(): void {
    authStore.logout();
    goto('/');
  }
</script>

<svelte:head>
  {#if lightThemeStyles}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<style>:root { ${lightThemeStyles} }</style>`}
  {/if}
  {#if darkThemeStyles}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<style>[data-theme='dark'] { ${darkThemeStyles} }</style>`}
  {/if}
</svelte:head>

<main class:admin-page={isAdminPage}>
  {#if !isAdminPage && navbarConfig}
    {#key data.currentUser?.id}
      <FrontendComponentRenderer
        type="navbar"
        config={navbarConfig}
        colorTheme={activeColorTheme}
        position={effectiveNavbar?.position}
        onLogout={handleLogout}
        siteContext={data.siteContext}
        user={data.currentUser}
      />
    {/key}
  {/if}

  <slot />

  {#if !isAdminPage && footerConfig}
    {#key data.currentUser?.id}
      <FrontendComponentRenderer
        type="footer"
        config={footerConfig}
        colorTheme={activeColorTheme}
        position={effectiveFooter?.position}
        siteContext={data.siteContext}
        user={data.currentUser}
      />
    {/key}
  {/if}
</main>

<ToastContainer />
<PromptModal />
<ConfirmModal />
<ThemePreviewIndicator />
<BuildInfo userRole={$authState.user?.role} />

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: var(--color-bg-secondary);
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main.admin-page {
    max-width: none;
    padding: 0;
    margin: 0;
  }
</style>
