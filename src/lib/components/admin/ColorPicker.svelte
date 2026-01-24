<script lang="ts">
  import type { ColorTheme, ThemeColors } from '$lib/types/pages';
  import { getThemeColors } from '$lib/utils/editor/colorThemes';
  import { createEventDispatcher } from 'svelte';

  export let currentTheme: ColorTheme;
  export let selectedValue: string;
  export let defaultValue: string | undefined = undefined;
  export let anchorElement: HTMLElement | null = null;
  // Optional: Allow passing theme colors directly (for builder with loaded themes from DB)
  export let themeColors: ThemeColors | undefined = undefined;

  const dispatch = createEventDispatcher<{
    select: string;
    close: void;
  }>();

  // Check if current value matches default
  $: isDefaultValue = defaultValue !== undefined && selectedValue === defaultValue;

  let colorPickerPopup: HTMLDivElement | null = null;
  let popupStyle = '';
  let activeTab: 'theme' | 'custom' = 'theme';

  // Get current theme colors for presets - use passed themeColors if available, otherwise lookup
  $: currentThemeColors = themeColors || getThemeColors(currentTheme);

  // Automatically select the correct tab based on current value
  $: {
    const isThemeRef = typeof selectedValue === 'string' && selectedValue.startsWith('theme:');
    const isTransparent = selectedValue === 'transparent';
    activeTab = isThemeRef || isTransparent ? 'theme' : 'custom';
  }

  // Special colors (transparent, etc.)
  const specialColors = [
    {
      name: 'Transparent',
      value: 'transparent',
      themeRef: 'transparent',
      icon: '🚫'
    }
  ];

  // Organize colors into logical groups
  $: brandColors = [
    {
      name: 'Primary',
      value: currentThemeColors.primary,
      themeRef: 'theme:primary',
      icon: '🎨'
    },
    {
      name: 'Secondary',
      value: currentThemeColors.secondary,
      themeRef: 'theme:secondary',
      icon: '🎭'
    },
    {
      name: 'Accent',
      value: currentThemeColors.accent,
      themeRef: 'theme:accent',
      icon: '✨'
    }
  ];

  $: uiColors = [
    {
      name: 'Background',
      value: currentThemeColors.background,
      themeRef: 'theme:background',
      icon: '🖼️'
    },
    {
      name: 'Surface',
      value: currentThemeColors.surface,
      themeRef: 'theme:surface',
      icon: '📄'
    },
    {
      name: 'Border',
      value: currentThemeColors.border,
      themeRef: 'theme:border',
      icon: '⬜'
    }
  ];

  $: textColors = [
    {
      name: 'Text',
      value: currentThemeColors.text,
      themeRef: 'theme:text',
      icon: '📝'
    },
    {
      name: 'Text Secondary',
      value: currentThemeColors.textSecondary,
      themeRef: 'theme:textSecondary',
      icon: '📋'
    }
  ];

  $: semanticColors = [
    {
      name: 'Success',
      value: currentThemeColors.success,
      themeRef: 'theme:success',
      icon: '✅'
    },
    {
      name: 'Warning',
      value: currentThemeColors.warning,
      themeRef: 'theme:warning',
      icon: '⚠️'
    },
    {
      name: 'Error',
      value: currentThemeColors.error,
      themeRef: 'theme:error',
      icon: '❌'
    }
  ];

  // Get the resolved color for the current theme
  $: resolvedColor = (() => {
    if (typeof selectedValue === 'string' && selectedValue.startsWith('theme:')) {
      const colorKey = selectedValue.replace('theme:', '');
      return currentThemeColors[colorKey as keyof typeof currentThemeColors] || '#808080';
    }
    if (typeof selectedValue === 'string') {
      return selectedValue;
    }
    return '#808080';
  })();

  // Select a preset color
  function selectPresetColor(themeRef: string): void {
    dispatch('select', themeRef);
  }

  // Reset to default value
  function resetToDefault(): void {
    if (defaultValue !== undefined) {
      dispatch('select', defaultValue);
    }
  }

  // Position popup based on anchor element location
  function positionPopup(): void {
    if (!anchorElement || !colorPickerPopup) return;

    const buttonRect = anchorElement.getBoundingClientRect();
    const popupRect = colorPickerPopup.getBoundingClientRect();
    const popupWidth = popupRect.width || 320;
    const popupHeight = popupRect.height || 500;
    const margin = 16; // Increased margin for better spacing

    // Calculate available space in all directions
    const spaceAbove = buttonRect.top - margin;
    const spaceBelow = window.innerHeight - buttonRect.bottom - margin;

    // Determine vertical position (prefer below, but use above if more space)
    let top: number;
    if (spaceBelow >= popupHeight || spaceBelow > spaceAbove) {
      // Position below the button
      top = buttonRect.bottom + margin;
      // Ensure it doesn't go off the bottom
      if (top + popupHeight > window.innerHeight - margin) {
        top = window.innerHeight - popupHeight - margin;
      }
    } else {
      // Position above the button
      top = buttonRect.top - popupHeight - margin;
    }

    // Ensure top is never negative (off the top of the screen)
    top = Math.max(margin, top);

    // Determine horizontal position (prefer aligned with button left edge)
    let left = buttonRect.left;

    // If popup would go off the right edge, align right edges instead
    if (left + popupWidth > window.innerWidth - margin) {
      left = buttonRect.right - popupWidth;
    }

    // If still off screen to the right, align with right edge of viewport
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }

    // Ensure left is never negative (off the left of the screen)
    left = Math.max(margin, left);

    // Apply max-width to handle narrow viewports
    const maxWidth = window.innerWidth - 2 * margin;
    const constrainedWidth = Math.min(popupWidth, maxWidth);

    popupStyle = `top: ${top}px; left: ${left}px; max-height: ${window.innerHeight - 2 * margin}px; max-width: ${constrainedWidth}px;`;
  }

  // Handle custom color input
  function handleCustomColorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    selectPresetColor(input.value);
  }

  // Position on mount and when anchor changes
  $: if (anchorElement) {
    requestAnimationFrame(positionPopup);
  }
</script>

<svelte:window on:resize={positionPopup} on:scroll={positionPopup} />

<div class="color-picker-popup" bind:this={colorPickerPopup} style={popupStyle}>
  <div class="popup-header">
    <h4>Select Color</h4>
    <div class="header-buttons">
      {#if defaultValue !== undefined}
        <button
          type="button"
          class="reset-btn"
          disabled={isDefaultValue}
          on:click={resetToDefault}
          title="Reset to Default"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      {/if}
      <button type="button" class="close-btn" on:click={() => dispatch('close')}> × </button>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="tab-nav">
    <button
      type="button"
      class="tab-btn"
      class:active={activeTab === 'theme'}
      on:click={() => (activeTab = 'theme')}
    >
      <span class="tab-icon">🎨</span>
      <span>Theme</span>
    </button>
    <button
      type="button"
      class="tab-btn"
      class:active={activeTab === 'custom'}
      on:click={() => (activeTab = 'custom')}
    >
      <span class="tab-icon">🎯</span>
      <span>Custom</span>
    </button>
  </div>

  <div class="popup-content">
    {#if activeTab === 'theme'}
      <!-- Brand Colors -->
      <div class="color-group">
        <div class="group-header">
          <span class="group-icon">🏷️</span>
          <h5>Brand Colors</h5>
        </div>
        <p class="group-description">Main brand colors that adapt to theme changes</p>
        <div class="color-grid">
          {#each brandColors as color}
            <button
              type="button"
              class="color-swatch"
              class:selected={selectedValue === color.themeRef}
              on:click={() => selectPresetColor(color.themeRef)}
              title={color.name}
            >
              <div class="swatch-color" style="background-color: {color.value};">
                {#if selectedValue === color.themeRef}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                {/if}
              </div>
              <span class="swatch-label">{color.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- UI Colors -->
      <div class="color-group">
        <div class="group-header">
          <span class="group-icon">🖼️</span>
          <h5>UI Colors</h5>
        </div>
        <p class="group-description">Background and structural colors</p>
        <div class="color-grid">
          {#each uiColors as color}
            <button
              type="button"
              class="color-swatch"
              class:selected={selectedValue === color.themeRef}
              on:click={() => selectPresetColor(color.themeRef)}
              title={color.name}
            >
              <div class="swatch-color" style="background-color: {color.value};">
                {#if selectedValue === color.themeRef}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                {/if}
              </div>
              <span class="swatch-label">{color.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Text Colors -->
      <div class="color-group">
        <div class="group-header">
          <span class="group-icon">📝</span>
          <h5>Text Colors</h5>
        </div>
        <p class="group-description">Typography colors</p>
        <div class="color-grid">
          {#each textColors as color}
            <button
              type="button"
              class="color-swatch"
              class:selected={selectedValue === color.themeRef}
              on:click={() => selectPresetColor(color.themeRef)}
              title={color.name}
            >
              <div class="swatch-color" style="background-color: {color.value};">
                {#if selectedValue === color.themeRef}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                {/if}
              </div>
              <span class="swatch-label">{color.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Semantic Colors -->
      <div class="color-group">
        <div class="group-header">
          <span class="group-icon">⚡</span>
          <h5>Semantic Colors</h5>
        </div>
        <p class="group-description">Status and feedback colors</p>
        <div class="color-grid">
          {#each semanticColors as color}
            <button
              type="button"
              class="color-swatch"
              class:selected={selectedValue === color.themeRef}
              on:click={() => selectPresetColor(color.themeRef)}
              title={color.name}
            >
              <div class="swatch-color" style="background-color: {color.value};">
                {#if selectedValue === color.themeRef}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                {/if}
              </div>
              <span class="swatch-label">{color.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Special Colors -->
      <div class="color-group">
        <div class="group-header">
          <span class="group-icon">🔧</span>
          <h5>Special</h5>
        </div>
        <p class="group-description">Special color values</p>
        <div class="color-grid">
          {#each specialColors as color}
            <button
              type="button"
              class="color-swatch"
              class:selected={selectedValue === color.themeRef}
              on:click={() => selectPresetColor(color.themeRef)}
              title={color.name}
            >
              <div class="swatch-color transparent-swatch" style="background-color: {color.value};">
                {#if selectedValue === color.themeRef}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                {/if}
              </div>
              <span class="swatch-label">{color.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Custom Color Section -->
      <div class="custom-color-section">
        <div class="group-header">
          <span class="group-icon">🎨</span>
          <h5>Custom Color</h5>
        </div>
        <p class="custom-description">
          Choose a specific color that won't change with theme. Use this for precise branding or
          special cases.
        </p>

        <div class="custom-preview">
          <div class="preview-circle" style="background-color: {resolvedColor};" />
          <div class="preview-info">
            <span class="preview-label">Selected Color</span>
            <span class="preview-value">{resolvedColor.toUpperCase()}</span>
          </div>
        </div>

        <div class="custom-picker">
          <label class="picker-label">
            <span>Color Picker</span>
            <input
              type="color"
              value={resolvedColor}
              on:input={handleCustomColorInput}
              class="color-input"
            />
          </label>

          <label class="picker-label">
            <span>Hex Value</span>
            <input
              type="text"
              value={resolvedColor}
              on:input={handleCustomColorInput}
              placeholder="#000000"
              class="hex-input"
            />
          </label>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Popup Styles */
  .color-picker-popup {
    position: fixed;
    background: var(--color-bg-primary);
    border: 2px solid var(--color-border-secondary);
    border-radius: 12px;
    box-shadow:
      0 8px 16px -4px rgba(0, 0, 0, 0.15),
      0 4px 8px -2px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    width: 320px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: var(--color-bg-secondary);
    border-bottom: 2px solid var(--color-border-secondary);
  }

  .popup-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .header-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .reset-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: var(--color-bg-primary);
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reset-btn:hover:not(:disabled) {
    background: var(--color-primary);
    color: white;
  }

  .reset-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: var(--color-bg-primary);
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--color-text-secondary);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--color-danger);
    color: white;
  }

  /* Tab Navigation */
  .tab-nav {
    display: flex;
    background: var(--color-bg-secondary);
    border-bottom: 2px solid var(--color-border-secondary);
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: all 0.2s;
    position: relative;
  }

  .tab-btn:hover {
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    color: var(--color-primary);
    background: var(--color-bg-primary);
    font-weight: 600;
  }

  .tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-primary);
  }

  .tab-icon {
    font-size: 1.125rem;
  }

  /* Content */
  .popup-content {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Color Groups */
  .color-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .group-icon {
    font-size: 1.125rem;
  }

  .group-header h5 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .group-description {
    margin: 0 0 0.5rem 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .color-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .color-swatch:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .color-swatch.selected {
    border-color: var(--color-primary);
    background: var(--color-bg-primary);
    box-shadow:
      0 0 0 3px rgba(var(--color-primary-rgb, 59, 130, 246), 0.1),
      0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .swatch-color {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Transparent swatch with checkerboard pattern */
  .swatch-color.transparent-swatch {
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%) !important;
    background-size: 12px 12px;
    background-position:
      0 0,
      0 6px,
      6px -6px,
      -6px 0px;
    background-color: #fff !important;
  }

  .swatch-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: center;
  }

  .color-swatch.selected .swatch-label {
    color: var(--color-primary);
  }

  /* Custom Color Section */
  .custom-color-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .custom-description {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border-radius: 6px;
    border-left: 3px solid var(--color-primary);
  }

  .custom-preview {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    border: 2px solid var(--color-border-secondary);
  }

  .preview-circle {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 4px 8px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  }

  .preview-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .preview-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .preview-value {
    font-size: 1.125rem;
    font-family: monospace;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .custom-picker {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .picker-label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .picker-label > span {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .color-input {
    width: 100%;
    height: 56px;
    border: 2px solid var(--color-border-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .color-input:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .hex-input {
    width: 100%;
    height: 48px;
    padding: 0 1rem;
    border: 2px solid var(--color-border-secondary);
    border-radius: 8px;
    font-family: monospace;
    font-size: 1rem;
    font-weight: 600;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    transition: all 0.2s;
  }

  .hex-input:hover {
    border-color: var(--color-primary);
  }

  .hex-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 59, 130, 246), 0.1);
  }

  /* Scrollbar Styling */
  .popup-content::-webkit-scrollbar {
    width: 8px;
  }

  .popup-content::-webkit-scrollbar-track {
    background: var(--color-bg-secondary);
    border-radius: 4px;
  }

  .popup-content::-webkit-scrollbar-thumb {
    background: var(--color-border-secondary);
    border-radius: 4px;
  }

  .popup-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-secondary);
  }
</style>
