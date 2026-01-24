<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    Save,
    Upload,
    X,
    Undo2,
    Redo2,
    Smartphone,
    Tablet,
    Monitor,
    Sparkles,
    History,
    ChevronDown,
    LayoutDashboard,
    Globe,
    Sun,
    Moon,
    MonitorSmartphone,
    Check,
    Palette,
    Menu,
    PanelLeft
  } from 'lucide-svelte';
  import { themeStore } from '$lib/stores/theme';
  import type { Theme } from '$lib/types/theme';
  import type { ColorThemeDefinition, Layout } from '$lib/types/pages';
  import Avatar from '$lib/components/Avatar.svelte';

  type BuilderMode = 'page' | 'layout' | 'component' | 'primitive';

  export let mode: BuilderMode = 'page';
  export let title: string;
  export let currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
  export let colorTheme: string;
  export let colorThemes: ColorThemeDefinition[] = [];
  export let layoutId: number | null = null;
  export let layouts: Layout[] = [];
  export let hasUnsavedChanges: boolean;
  export let isSaving: boolean;
  export let lastSavedAt: Date | null;
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let canPublish = true;
  export let isViewingPublishedRevision = true;
  export let userName: string | undefined = undefined;
  // Mobile view state
  export let isMobileView = false;

  const dispatch = createEventDispatcher();

  let showUserMenu = false;
  let showLayoutDropdown = false;
  let showMobileMenu = false;

  function toggleUserMenu() {
    showUserMenu = !showUserMenu;
    showLayoutDropdown = false;
    showMobileMenu = false;
  }

  function closeUserMenu() {
    showUserMenu = false;
  }

  function toggleLayoutDropdown() {
    showLayoutDropdown = !showLayoutDropdown;
    showUserMenu = false;
  }

  function closeLayoutDropdown() {
    showLayoutDropdown = false;
  }

  function selectLayout(layout: Layout) {
    dispatch('updateLayout', layout.id);
    closeLayoutDropdown();
  }

  function openThemePalette() {
    dispatch('openThemePalette');
  }

  // Reactively compute the selected theme name
  $: selectedThemeName = (() => {
    const theme = colorThemes.find((t) => t.id === colorTheme);
    return theme?.name || 'Select Theme';
  })();

  // Reactively compute the selected layout name
  $: selectedLayoutName = (() => {
    const layout = layouts.find((l) => l.id === layoutId);
    return layout?.name || 'No Layout';
  })();

  // Check if a layout is selected
  $: hasLayoutSelected = layoutId !== null;

  function handleThemeChange(theme: Theme) {
    themeStore.setTheme(theme);
    closeUserMenu();
  }

  async function navigateToAdmin() {
    closeUserMenu();
    await goto('/admin/dashboard');
  }

  async function navigateToPublicSite() {
    closeUserMenu();
    await goto('/');
  }

  function formatLastSaved() {
    if (!lastSavedAt) return '';
    const now = new Date();
    const diff = now.getTime() - lastSavedAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return lastSavedAt.toLocaleTimeString();
  }

  function toggleMobileMenu() {
    showMobileMenu = !showMobileMenu;
    showUserMenu = false;
    showLayoutDropdown = false;
  }

  function closeMobileMenu() {
    showMobileMenu = false;
  }
</script>

<div class="builder-toolbar" class:mobile={isMobileView}>
  <div class="toolbar-left">
    <button class="btn-icon" on:click={() => dispatch('exit')} aria-label="Exit builder">
      <X size={20} />
    </button>

    <!-- Mobile: Show hamburger menu for sidebar -->
    {#if isMobileView}
      <button
        class="btn-icon btn-sidebar-toggle"
        on:click={() => dispatch('toggleSidebar')}
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={20} />
      </button>
    {/if}

    <!-- Title display - shows current revision name -->
    <div class="page-info">
      <span class="title-display" {title}>{title || 'Untitled'}</span>
      {#if hasUnsavedChanges}
        <span class="unsaved-indicator" title="Unsaved changes">•</span>
      {/if}
    </div>
  </div>

  <div class="toolbar-center" class:hidden={isMobileView}>
    <div class="breakpoint-switcher">
      <button
        class="btn-breakpoint"
        class:active={currentBreakpoint === 'mobile'}
        on:click={() => dispatch('changeBreakpoint', 'mobile')}
        aria-label="Mobile view"
      >
        <Smartphone size={18} />
      </button>
      <button
        class="btn-breakpoint"
        class:active={currentBreakpoint === 'tablet'}
        on:click={() => dispatch('changeBreakpoint', 'tablet')}
        aria-label="Tablet view"
      >
        <Tablet size={18} />
      </button>
      <button
        class="btn-breakpoint"
        class:active={currentBreakpoint === 'desktop'}
        on:click={() => dispatch('changeBreakpoint', 'desktop')}
        aria-label="Desktop view"
      >
        <Monitor size={18} />
      </button>
    </div>

    {#if mode === 'page'}
      <div class="layout-selector-container">
        <button
          class="btn-layout-selector"
          class:has-layout={hasLayoutSelected}
          class:no-layout={!hasLayoutSelected}
          on:click={toggleLayoutDropdown}
          aria-label="Select layout"
          title={hasLayoutSelected
            ? `Layout: ${selectedLayoutName}`
            : 'No layout selected - select one'}
        >
          <LayoutDashboard size={18} />
          <span>{selectedLayoutName}</span>
          <ChevronDown size={14} />
        </button>

        {#if showLayoutDropdown}
          <div class="layout-dropdown">
            <div class="dropdown-header">Page Layout</div>
            {#each layouts as layout}
              <button
                class="dropdown-item"
                class:active={layoutId === layout.id}
                on:click={() => selectLayout(layout)}
              >
                <span class="layout-name">{layout.name}</span>
                {#if layout.is_default}
                  <span class="layout-badge">Default</span>
                {/if}
                {#if layoutId === layout.id}
                  <Check size={16} class="check-icon" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if showLayoutDropdown}
          <button
            class="menu-backdrop"
            on:click={closeLayoutDropdown}
            aria-label="Close layout menu"
          ></button>
        {/if}
      </div>
    {/if}

    <div class="theme-preview-container">
      <button class="btn-theme-preview" on:click={openThemePalette} aria-label="Theme preview">
        <Palette size={18} />
        <span>{selectedThemeName}</span>
      </button>
    </div>
  </div>

  <div class="toolbar-right">
    <!-- Desktop actions -->
    {#if !isMobileView}
      <button
        class="btn-icon"
        on:click={() => dispatch('viewHistory')}
        aria-label="View revision history (Ctrl+H)"
        title="View revision history"
      >
        <History size={18} />
      </button>
      <button
        class="btn-icon"
        disabled={!canUndo}
        on:click={() => dispatch('undo')}
        aria-label="Undo"
      >
        <Undo2 size={18} />
      </button>
      <button
        class="btn-icon"
        disabled={!canRedo}
        on:click={() => dispatch('redo')}
        aria-label="Redo"
      >
        <Redo2 size={18} />
      </button>

      <button class="btn-ai" on:click={() => dispatch('toggleAI')} aria-label="AI Assistant">
        <Sparkles size={18} />
        <span>AI</span>
      </button>

      <div class="save-status">
        {#if isSaving}
          <span class="saving">
            <span class="status-dot pulsing"></span>
            Saving...
          </span>
        {:else if hasUnsavedChanges}
          <span class="unsaved">
            <span class="status-dot"></span>
            Unsaved changes
          </span>
        {:else if lastSavedAt}
          <span class="saved">
            <span class="status-dot"></span>
            Saved {formatLastSaved()}
          </span>
        {/if}
      </div>

      <button
        class="btn-primary"
        on:click={() => dispatch('save')}
        disabled={isSaving || !hasUnsavedChanges}
      >
        <Save size={18} />
        <span>Save Draft</span>
      </button>
      <button
        class="btn-publish"
        on:click={() => dispatch('publish')}
        disabled={isSaving || !canPublish}
        title={canPublish
          ? 'Publish this version'
          : isViewingPublishedRevision
            ? 'Already viewing the published version - make changes to publish'
            : 'Viewing an older revision - make changes to create a new publishable version'}
      >
        <Upload size={18} />
        <span>Publish</span>
      </button>
    {:else}
      <!-- Mobile: Compact action buttons -->
      <button
        class="btn-icon"
        on:click={() => dispatch('save')}
        disabled={isSaving || !hasUnsavedChanges}
        aria-label="Save"
      >
        <Save size={20} />
      </button>
      <button
        class="btn-icon btn-publish-icon"
        on:click={() => dispatch('publish')}
        disabled={isSaving || !canPublish}
        aria-label="Publish"
      >
        <Upload size={20} />
      </button>
      <button class="btn-icon" on:click={toggleMobileMenu} aria-label="More options">
        <Menu size={20} />
      </button>
    {/if}

    <!-- Mobile menu dropdown -->
    {#if isMobileView && showMobileMenu}
      <div class="mobile-menu-dropdown">
        <div class="menu-section">
          <div class="menu-label">Actions</div>
          <button
            class="menu-item"
            on:click={() => {
              dispatch('toggleAI');
              closeMobileMenu();
            }}
          >
            <Sparkles size={16} />
            <span>AI Assistant</span>
          </button>
          <button
            class="menu-item"
            on:click={() => {
              dispatch('viewHistory');
              closeMobileMenu();
            }}
          >
            <History size={16} />
            <span>Revision History</span>
          </button>
          <button
            class="menu-item"
            disabled={!canUndo}
            on:click={() => {
              dispatch('undo');
              closeMobileMenu();
            }}
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          <button
            class="menu-item"
            disabled={!canRedo}
            on:click={() => {
              dispatch('redo');
              closeMobileMenu();
            }}
          >
            <Redo2 size={16} />
            <span>Redo</span>
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-section">
          <div class="menu-label">Preview Breakpoint</div>
          <button
            class="menu-item"
            class:active={currentBreakpoint === 'mobile'}
            on:click={() => {
              dispatch('changeBreakpoint', 'mobile');
              closeMobileMenu();
            }}
          >
            <Smartphone size={16} />
            <span>Mobile</span>
            {#if currentBreakpoint === 'mobile'}<Check size={16} />{/if}
          </button>
          <button
            class="menu-item"
            class:active={currentBreakpoint === 'tablet'}
            on:click={() => {
              dispatch('changeBreakpoint', 'tablet');
              closeMobileMenu();
            }}
          >
            <Tablet size={16} />
            <span>Tablet</span>
            {#if currentBreakpoint === 'tablet'}<Check size={16} />{/if}
          </button>
          <button
            class="menu-item"
            class:active={currentBreakpoint === 'desktop'}
            on:click={() => {
              dispatch('changeBreakpoint', 'desktop');
              closeMobileMenu();
            }}
          >
            <Monitor size={16} />
            <span>Desktop</span>
            {#if currentBreakpoint === 'desktop'}<Check size={16} />{/if}
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-section">
          <div class="menu-label">Theme</div>
          <button
            class="menu-item"
            on:click={() => {
              openThemePalette();
              closeMobileMenu();
            }}
          >
            <Palette size={16} />
            <span>{selectedThemeName}</span>
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-section">
          <div class="menu-label">Editor Theme</div>
          <button
            class="menu-item"
            class:active={$themeStore === 'light'}
            on:click={() => handleThemeChange('light')}
          >
            <Sun size={16} />
            <span>Light</span>
            {#if $themeStore === 'light'}<Check size={16} />{/if}
          </button>
          <button
            class="menu-item"
            class:active={$themeStore === 'dark'}
            on:click={() => handleThemeChange('dark')}
          >
            <Moon size={16} />
            <span>Dark</span>
            {#if $themeStore === 'dark'}<Check size={16} />{/if}
          </button>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-section">
          <button
            class="menu-item"
            on:click={() => {
              navigateToAdmin();
              closeMobileMenu();
            }}
          >
            <LayoutDashboard size={16} />
            <span>Admin Dashboard</span>
          </button>
          <button
            class="menu-item"
            on:click={() => {
              navigateToPublicSite();
              closeMobileMenu();
            }}
          >
            <Globe size={16} />
            <span>View Public Site</span>
          </button>
        </div>
      </div>
      <button class="menu-backdrop" on:click={closeMobileMenu} aria-label="Close menu"></button>
    {/if}

    <!-- Desktop user menu -->
    {#if !isMobileView}
      <div class="user-menu-container">
        <button class="btn-user-menu" on:click={toggleUserMenu} aria-label="User menu">
          <Avatar name={userName} size="small" />
          <ChevronDown size={14} />
        </button>

        {#if showUserMenu}
          <div class="user-menu-dropdown">
            <div class="menu-section">
              <div class="menu-label">Theme</div>
              <button
                class="menu-item"
                class:active={$themeStore === 'light'}
                on:click={() => handleThemeChange('light')}
              >
                <Sun size={16} />
                <span>Light</span>
                {#if $themeStore === 'light'}
                  <Check size={16} class="check-icon" />
                {/if}
              </button>
              <button
                class="menu-item"
                class:active={$themeStore === 'dark'}
                on:click={() => handleThemeChange('dark')}
              >
                <Moon size={16} />
                <span>Dark</span>
                {#if $themeStore === 'dark'}
                  <Check size={16} class="check-icon" />
                {/if}
              </button>
              <button
                class="menu-item"
                class:active={$themeStore === 'system'}
                on:click={() => handleThemeChange('system')}
              >
                <MonitorSmartphone size={16} />
                <span>System</span>
                {#if $themeStore === 'system'}
                  <Check size={16} class="check-icon" />
                {/if}
              </button>
            </div>

            <div class="menu-divider"></div>

            <div class="menu-section">
              <button class="menu-item" on:click={navigateToAdmin}>
                <LayoutDashboard size={16} />
                <span>Admin Dashboard</span>
              </button>
              <button class="menu-item" on:click={navigateToPublicSite}>
                <Globe size={16} />
                <span>View Public Site</span>
              </button>
            </div>
          </div>
        {/if}

        {#if showUserMenu}
          <button class="menu-backdrop" on:click={closeUserMenu} aria-label="Close menu"></button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .builder-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    padding: 0 1rem;
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-secondary);
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .builder-toolbar.mobile {
    height: 56px;
    padding: 0 0.75rem;
    gap: 0.25rem;
  }

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .toolbar-left {
    flex-shrink: 0;
  }

  .builder-toolbar.mobile .toolbar-left {
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .toolbar-center {
    flex: 1;
    justify-content: center;
  }

  .toolbar-center.hidden {
    display: none;
  }

  .toolbar-right {
    position: relative;
  }

  .builder-toolbar.mobile .toolbar-right {
    gap: 0.25rem;
    flex-shrink: 0;
  }

  /* Page info - title display */
  .page-info {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
    max-width: 250px;
  }

  .title-display {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .unsaved-indicator {
    color: var(--color-warning);
    font-size: 1.25rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .breakpoint-switcher {
    display: flex;
    gap: 0.25rem;
    background: var(--color-bg-secondary);
    border-radius: 6px;
    padding: 0.25rem;
  }

  .btn-icon,
  .btn-breakpoint {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-breakpoint {
    gap: 0.5rem;
  }

  .btn-icon:hover:not(:disabled),
  .btn-breakpoint:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .btn-icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-breakpoint.active {
    background: var(--color-primary);
    color: white;
  }

  .btn-ai {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-secondary, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
    border: none;
    border-radius: 6px;
    color: var(--color-bg-primary, white);
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn-ai:hover {
    opacity: 0.9;
  }

  .btn-primary,
  .btn-publish {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-publish {
    background: var(--color-success);
    color: white;
  }

  .btn-primary:hover,
  .btn-publish:hover {
    opacity: 0.9;
  }

  .btn-primary:disabled,
  .btn-publish:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-status {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
  }

  .save-status span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .saving {
    color: var(--color-warning);
  }

  .saving .status-dot {
    background: var(--color-warning);
  }

  .saving .status-dot.pulsing {
    animation: pulse 1.5s ease-in-out infinite;
  }

  .unsaved {
    color: var(--color-danger);
  }

  .unsaved .status-dot {
    background: var(--color-danger);
  }

  .saved {
    color: var(--color-success);
  }

  .saved .status-dot {
    background: var(--color-success);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.2);
    }
  }

  /* Layout Selector Styles */
  .layout-selector-container {
    position: relative;
  }

  .btn-layout-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-layout-selector:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  .btn-layout-selector.no-layout {
    border-color: var(--color-warning);
    background: rgba(255, 152, 0, 0.1);
  }

  .btn-layout-selector.has-layout {
    border-color: var(--color-success);
  }

  .layout-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    min-width: 250px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
  }

  .dropdown-header {
    padding: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    background: none;
    border: none;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .dropdown-item:hover {
    background: var(--color-bg-secondary);
  }

  .dropdown-item.active {
    background: var(--color-bg-tertiary);
  }

  .layout-name {
    flex: 1;
    font-weight: 500;
  }

  .layout-badge {
    padding: 0.125rem 0.5rem;
    background: var(--color-primary);
    color: white;
    font-size: 0.625rem;
    font-weight: 600;
    border-radius: 12px;
    text-transform: uppercase;
  }

  .dropdown-item :global(.check-icon) {
    color: var(--color-primary);
  }

  /* Theme Preview Styles */
  .theme-preview-container {
    position: relative;
  }

  .btn-theme-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-theme-preview:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  .user-menu-container {
    position: relative;
  }

  .btn-user-menu {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-user-menu:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  .user-menu-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 220px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
  }

  .menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    border: none;
    padding: 0;
    cursor: default;
    z-index: 999;
  }

  .menu-section {
    padding: 0.5rem;
  }

  .menu-label {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .menu-item:hover {
    background: var(--color-bg-secondary);
  }

  .menu-item.active {
    background: var(--color-bg-tertiary);
    color: var(--color-primary);
  }

  .menu-item span {
    flex: 1;
  }

  .menu-item :global(.check-icon) {
    color: var(--color-primary);
  }

  .menu-divider {
    height: 1px;
    background: var(--color-border-secondary);
    margin: 0.5rem 0;
  }

  /* Mobile menu dropdown */
  .mobile-menu-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 260px;
    max-width: calc(100vw - 2rem);
    max-height: calc(100dvh - 80px);
    overflow-y: auto;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 1000;
  }

  .btn-sidebar-toggle {
    color: var(--color-primary);
  }

  .btn-publish-icon {
    color: var(--color-success);
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item:disabled:hover {
    background: none;
  }

  @media (max-width: 1200px) {
    .toolbar-center {
      display: none;
    }
  }

  /* Mobile-specific overrides - using .mobile class instead of media query */
  .builder-toolbar.mobile .btn-icon {
    padding: 0.625rem;
  }

  .builder-toolbar.mobile .btn-primary,
  .builder-toolbar.mobile .btn-publish,
  .builder-toolbar.mobile .btn-ai {
    padding: 0.5rem;
  }

  .builder-toolbar.mobile .btn-primary span,
  .builder-toolbar.mobile .btn-publish span,
  .builder-toolbar.mobile .btn-ai span {
    display: none;
  }
</style>
