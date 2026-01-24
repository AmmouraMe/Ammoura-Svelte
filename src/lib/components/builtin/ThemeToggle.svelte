<script lang="ts">
  /**
   * ThemeToggle - A builtin component for toggling between light and dark themes
   *
   * This component provides a simple button that allows users to toggle
   * between light and dark modes. It can be styled in different sizes
   * and variants.
   */
  import type { WidgetConfig } from '$lib/types/pages';
  import { themeStore } from '$lib/stores/theme';

  export let config: WidgetConfig;

  // Configuration options with defaults
  $: size = config.size || 'medium';
  $: toggleVariant = config.toggleVariant || 'icon';
  $: alignment = config.alignment || 'left';

  // Get current theme state
  $: currentTheme = $themeStore;

  // Determine which icon to show based on current theme
  $: isDarkMode =
    currentTheme === 'dark' ||
    (currentTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Handle toggle click
  function handleToggle(): void {
    themeStore.toggleTheme();
  }

  // Compute alignment style
  $: alignmentStyle = (() => {
    switch (alignment) {
      case 'center':
        return 'center';
      case 'right':
        return 'flex-end';
      default:
        return 'flex-start';
    }
  })();

  // Compute icon size based on button size
  $: iconSize = (() => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  })();
</script>

<div
  class="theme-toggle-widget"
  id={config.anchorName || undefined}
  style="justify-content: {alignmentStyle}"
>
  <button
    class="theme-toggle theme-toggle-{size} theme-toggle-{toggleVariant}"
    on:click={handleToggle}
    aria-label="Toggle theme"
    title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    {#if isDarkMode}
      <!-- Sun icon for dark mode (suggests switching to light) -->
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
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
    {:else}
      <!-- Moon icon for light mode (suggests switching to dark) -->
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    {/if}
    {#if toggleVariant === 'icon-label' || toggleVariant === 'button'}
      <span class="theme-toggle-label">
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </span>
    {/if}
  </button>
</div>

<style>
  .theme-toggle-widget {
    display: flex;
    width: 100%;
    padding: 0.5rem 0;
  }

  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid var(--color-border-primary, #e5e7eb);
    border-radius: 0.375rem;
    background-color: var(--color-bg-primary, #ffffff);
    color: var(--color-text-primary, #111827);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .theme-toggle:hover {
    background-color: var(--color-bg-secondary, #f9fafb);
    border-color: var(--color-border-secondary, #d1d5db);
    transform: translateY(-1px);
  }

  .theme-toggle:active {
    transform: translateY(0);
  }

  /* Size variants */
  .theme-toggle-small {
    width: 2rem;
    height: 2rem;
    padding: 0;
  }

  .theme-toggle-medium {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
  }

  .theme-toggle-large {
    width: 3rem;
    height: 3rem;
    padding: 0;
  }

  /* Variant adjustments for icon-label and button variants */
  .theme-toggle-icon-label,
  .theme-toggle-button {
    width: auto;
    padding: 0.5rem 1rem;
  }

  .theme-toggle-small.theme-toggle-icon-label,
  .theme-toggle-small.theme-toggle-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .theme-toggle-large.theme-toggle-icon-label,
  .theme-toggle-large.theme-toggle-button {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
  }

  .theme-toggle-label {
    font-weight: 500;
    line-height: 1;
  }

  /* Icon-only variant (default) */
  .theme-toggle-icon {
    padding: 0;
  }

  /* Button variant with filled background */
  .theme-toggle-button {
    background-color: var(--color-primary, #3b82f6);
    color: white;
    border-color: var(--color-primary, #3b82f6);
  }

  .theme-toggle-button:hover {
    background-color: var(--color-primary-dark, #2563eb);
    border-color: var(--color-primary-dark, #2563eb);
  }
</style>
