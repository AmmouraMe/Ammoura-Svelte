<script lang="ts">
  import type { ColorTheme } from '$lib/types/pages';
  import { getAvailableThemes, getThemeColors } from '$lib/utils/editor/colorThemes';

  export let isOpen = false;
  export let selectedTheme: ColorTheme | undefined = undefined;
  export let onSelect: (theme: ColorTheme | undefined) => void;
  export let onClose: () => void;

  const themes = getAvailableThemes();

  // Helper to get current applied theme
  const getCurrentTheme = (): 'light' | 'dark' => {
    if (typeof document === 'undefined') return 'light';
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? 'dark' : 'light';
  };

  function selectTheme(theme: ColorTheme | undefined) {
    selectedTheme = theme;
    onSelect(theme);
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  $: effectiveTheme = selectedTheme || `default-${getCurrentTheme()}`;
  $: selectedMode = selectedTheme
    ? themes.find((t) => t.value === selectedTheme)?.mode || 'light'
    : getCurrentTheme();
  $: siteThemeOption = { value: undefined, label: 'Use Site Theme', mode: selectedMode };
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={onClose}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <div>
          <h2 id="theme-modal-title">Color Themes</h2>
          <p class="modal-subtitle">Choose a theme for your page</p>
        </div>
        <button type="button" class="close-btn" on:click={onClose} aria-label="Close dialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="theme-list">
          <!-- Use Site Theme option -->
          <button
            type="button"
            class="theme-option"
            class:selected={selectedTheme === undefined}
            on:click={() => selectTheme(undefined)}
          >
            <div class="theme-colors">
              <div
                class="color-swatch"
                style="background-color: {getThemeColors(effectiveTheme).primary}"
              ></div>
              <div
                class="color-swatch"
                style="background-color: {getThemeColors(effectiveTheme).secondary}"
              ></div>
              <div
                class="color-swatch"
                style="background-color: {getThemeColors(effectiveTheme).accent}"
              ></div>
              <div
                class="color-swatch small"
                style="background-color: {getThemeColors(effectiveTheme).background}"
              ></div>
              <div
                class="color-swatch small"
                style="background-color: {getThemeColors(effectiveTheme).surface}"
              ></div>
            </div>
            <div class="theme-info">
              <span class="theme-name">{siteThemeOption.label}</span>
              <span class="theme-mode-badge" class:dark={siteThemeOption.mode === 'dark'}
                >{siteThemeOption.mode}</span
              >
            </div>
            {#if selectedTheme === undefined}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12l5 5L20 7" stroke-width="2" stroke-linecap="round" />
              </svg>
            {/if}
          </button>

          {#each themes as theme}
            {@const colors = getThemeColors(theme.value)}
            <button
              type="button"
              class="theme-option"
              class:selected={selectedTheme === theme.value}
              on:click={() => selectTheme(theme.value)}
            >
              <div class="theme-colors">
                <div class="color-swatch" style="background-color: {colors.primary}"></div>
                <div class="color-swatch" style="background-color: {colors.secondary}"></div>
                <div class="color-swatch" style="background-color: {colors.accent}"></div>
                <div class="color-swatch small" style="background-color: {colors.background}"></div>
                <div class="color-swatch small" style="background-color: {colors.surface}"></div>
              </div>
              <div class="theme-info">
                <span class="theme-name">{theme.label}</span>
                <span class="theme-mode-badge" class:dark={theme.mode === 'dark'}>{theme.mode}</span
                >
              </div>
              {#if selectedTheme === theme.value}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 12l5 5L20 7" stroke-width="2" stroke-linecap="round" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--color-bg-primary);
    border-radius: 12px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .modal-subtitle {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .close-btn {
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    /* Inherit, or the global filled-button colour makes this unreadable. */
    color: inherit;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .theme-option:hover {
    background: var(--color-bg-secondary);
    border-color: var(--color-primary);
  }

  .theme-option.selected {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--color-primary);
    border-width: 2px;
  }

  .theme-colors {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .color-swatch.small {
    width: 12px;
    height: 12px;
  }

  .theme-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .theme-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .theme-mode-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    width: fit-content;
  }

  .theme-mode-badge.dark {
    background: var(--color-text-primary);
    color: var(--color-bg-primary);
    border-color: var(--color-text-primary);
  }

  .theme-option svg {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .modal-content {
      width: 95%;
      max-height: 85vh;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-body {
      padding: 0.75rem;
    }

    .theme-option {
      padding: 0.5rem;
    }
  }
</style>
