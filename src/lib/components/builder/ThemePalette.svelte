<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Search, Check, X, RotateCcw } from 'lucide-svelte';
  import type { ColorThemeDefinition } from '$lib/types/pages';

  export let colorThemes: ColorThemeDefinition[] = [];
  export let currentTheme: string; // Currently previewing theme (can change on hover)
  export let activeTheme: string; // The actual active/confirmed theme
  export let isOpen: boolean;

  const dispatch = createEventDispatcher();

  let searchQuery = '';
  let selectedIndex = 0;
  let inputElement: HTMLInputElement;
  let previewTheme = currentTheme; // Track preview separately from active
  let sortedThemes: ColorThemeDefinition[] = []; // Will be set when modal opens
  let frozenActiveTheme = ''; // Freeze the active theme at open time

  // Sort themes: currently active theme first, then the rest alphabetically
  function sortThemes(themes: ColorThemeDefinition[], current: string): ColorThemeDefinition[] {
    const sorted = [...themes];

    return sorted.sort((a, b) => {
      // Currently active/viewing theme always first
      if (a.id === current) return -1;
      if (b.id === current) return 1;

      // Rest alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  // Sort ONCE when the modal opens - put active theme at top
  // This prevents re-sorting when themes change during interaction
  $: if (isOpen && !frozenActiveTheme) {
    frozenActiveTheme = activeTheme; // Use activeTheme (user's current active theme)
    sortedThemes = sortThemes(colorThemes, activeTheme); // Sort by activeTheme
  }

  // Reset frozen theme when modal closes
  $: if (!isOpen && frozenActiveTheme) {
    frozenActiveTheme = '';
    sortedThemes = [];
  }

  // Just filter by search, don't exclude any themes
  $: filteredThemes = sortedThemes.filter((theme) =>
    theme.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update previewTheme when currentTheme changes (from parent)
  $: if (currentTheme !== previewTheme) {
    previewTheme = currentTheme;
  }

  $: if (isOpen && inputElement) {
    inputElement.focus();
    // Start with current preview theme selected
    const index = filteredThemes.findIndex((t) => t.id === previewTheme);
    if (index >= 0) selectedIndex = index;
  }

  $: isPreviewingDifferentTheme = currentTheme !== activeTheme;

  function handleKeyDown(event: KeyboardEvent) {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredThemes.length - 1);
        if (filteredThemes[selectedIndex]) {
          previewTheme = filteredThemes[selectedIndex].id;
          dispatch('previewTheme', previewTheme);
        }
        scrollToSelected();
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        if (filteredThemes[selectedIndex]) {
          previewTheme = filteredThemes[selectedIndex].id;
          dispatch('previewTheme', previewTheme);
        }
        scrollToSelected();
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredThemes[selectedIndex]) {
          confirmTheme(filteredThemes[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
    }
  }

  function confirmTheme(theme: ColorThemeDefinition) {
    dispatch('confirmTheme', theme.id);
    close();
  }

  function resetToActive() {
    // Dispatch resetTheme event to reset to user's current site theme
    dispatch('resetTheme');
    dispatch('close');
  }

  function close() {
    // Restore active theme on cancel
    dispatch('previewTheme', activeTheme);
    dispatch('close');
  }

  function scrollToSelected() {
    const element = document.querySelector(`[data-theme-index="${selectedIndex}"]`);
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function handleMouseEnter(index: number) {
    selectedIndex = index;
    const theme = filteredThemes[index];
    previewTheme = theme.id;
    dispatch('previewTheme', previewTheme);
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isOpen}
  <!-- Backdrop -->
  <div class="palette-backdrop" on:click={close} role="presentation"></div>

  <!-- Command Palette -->
  <div class="command-palette" role="dialog" aria-modal="true" aria-label="Theme selector">
    <div class="palette-header">
      <div class="search-container">
        <Search size={18} class="search-icon" />
        <input
          bind:this={inputElement}
          bind:value={searchQuery}
          type="text"
          class="search-input"
          placeholder="Search themes..."
          aria-label="Search themes"
        />
      </div>
      <button class="btn-close" on:click={close} aria-label="Close">
        <X size={18} />
      </button>
    </div>

    <div class="palette-content">
      {#if filteredThemes.length === 0}
        <div class="empty-state">
          <p>No themes found</p>
        </div>
      {:else}
        <div class="theme-list">
          {#each filteredThemes as theme, index (theme.id)}
            <button
              class="theme-item"
              class:selected={index === selectedIndex}
              class:active={theme.id === activeTheme}
              data-theme-index={index}
              data-theme-id={theme.id}
              data-theme-name={theme.name}
              on:click={() => {
                const clickedTheme = filteredThemes[index];
                confirmTheme(clickedTheme);
              }}
              on:mouseenter={() => handleMouseEnter(index)}
            >
              <div class="theme-info">
                <div class="theme-color-preview">
                  <span class="color-swatch" style="background: {theme.colors.primary};"></span>
                  <span class="color-swatch" style="background: {theme.colors.secondary};"></span>
                  <span class="color-swatch" style="background: {theme.colors.accent};"></span>
                </div>
                <div class="theme-details">
                  <span class="theme-name">{theme.name}</span>
                  <span class="theme-mode">{theme.mode}</span>
                </div>
              </div>
              {#if theme.id === activeTheme}
                <Check size={18} class="check-icon" />
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="palette-footer">
      <div class="footer-hint">
        <kbd>↑</kbd><kbd>↓</kbd> Navigate
        <kbd>Enter</kbd> Select
        <kbd>Esc</kbd> Cancel
      </div>
      {#if isPreviewingDifferentTheme}
        <button class="btn-reset" on:click={resetToActive} title="Reset to active theme">
          <RotateCcw size={16} />
          Reset
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-overlay, rgba(0, 0, 0, 0.5));
    backdrop-filter: blur(4px);
    z-index: 9998;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .command-palette {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 600px;
    max-height: 60vh;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .palette-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .search-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg-secondary);
    border-radius: 8px;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 1rem;
    color: var(--color-text-primary);
  }

  .search-input::placeholder {
    color: var(--color-text-secondary);
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-close:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .palette-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--color-text-secondary);
  }

  .theme-list {
    padding: 0.5rem;
  }

  .theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .theme-item:hover,
  .theme-item.selected {
    background: var(--color-bg-secondary);
  }

  .theme-item.selected {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }

  .theme-item.active {
    background: rgba(var(--color-primary-rgb, 99, 102, 241), 0.1);
  }

  .theme-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .theme-color-preview {
    display: flex;
    gap: 4px;
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid var(--color-border-secondary);
  }

  .theme-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .theme-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .theme-mode {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-transform: capitalize;
  }

  .palette-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border-secondary);
    background: var(--color-bg-secondary);
  }

  .footer-hint {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .btn-reset {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-reset:hover {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  kbd {
    padding: 0.125rem 0.375rem;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.7rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    .command-palette {
      top: 10%;
      width: 95%;
      max-height: 70vh;
    }

    .palette-header {
      padding: 0.75rem;
    }

    .palette-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .footer-hint {
      font-size: 0.7rem;
      gap: 0.5rem;
    }

    .btn-reset {
      width: 100%;
      justify-content: center;
    }
  }
</style>
