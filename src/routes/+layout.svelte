<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  import BuildInfo from '../lib/components/BuildInfo.svelte';
  import FrontendComponentRenderer from '../lib/components/FrontendComponentRenderer.svelte';
  import ThemePreviewIndicator from '../lib/components/ThemePreviewIndicator.svelte';
  import ToastContainer from '../lib/components/ToastContainer.svelte';
  import { authStore, authState } from '../lib/stores/auth';
  import { themeStore } from '../lib/stores/theme';

  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  $: isAdminPage = browser && $page.url.pathname.startsWith('/admin');
  $: canAccessAdmin =
    $authState.isAuthenticated &&
    ($authState.user?.role === 'admin' || $authState.user?.role === 'platform_engineer');

  // Build the navbar config with admin menu items if applicable
  $: navbarConfig = data.layoutData?.navbar?.config
    ? {
        ...data.layoutData.navbar.config,
        // Add admin dashboard link if user can access admin
        accountMenuItems: canAccessAdmin
          ? [
              { text: 'Admin Dashboard', url: '/admin/dashboard', icon: '📊' },
              ...(data.layoutData.navbar.config.accountMenuItems || [])
            ]
          : data.layoutData.navbar.config.accountMenuItems || []
      }
    : null;

  // Footer config from layout data
  $: footerConfig = data.layoutData?.footer?.config || null;

  // Generate CSS custom properties from theme colors
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
    `
    : '';

  onMount(() => {
    themeStore.initTheme();
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
        position={data.layoutData?.navbar?.position}
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
        position={data.layoutData?.footer?.position}
        siteContext={data.siteContext}
        user={data.currentUser}
      />
    {/key}
  {/if}
</main>

<ToastContainer />
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
