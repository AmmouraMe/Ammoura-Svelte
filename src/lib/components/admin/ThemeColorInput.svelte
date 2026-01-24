<script lang="ts">
  import type { ColorTheme, ThemeSpecificColor, ThemeColors } from '$lib/types/pages';
  import { getThemeColors } from '$lib/utils/editor/colorThemes';
  import ColorPicker from './ColorPicker.svelte';

  export let value: string | ThemeSpecificColor | undefined;
  export let currentTheme: ColorTheme;
  export let label: string;
  export let defaultValue: string | undefined = undefined;
  export let onChange: (newValue: string | ThemeSpecificColor) => void;
  export let onClear: (() => void) | undefined = undefined;
  // Optional: Allow passing theme colors directly (for builder with loaded themes from DB)
  export let themeColors: ThemeColors | undefined = undefined;

  // Determine default theme color based on label
  function getDefaultThemeColor(label: string): string {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('primary')) return 'theme:primary';
    if (lowerLabel.includes('secondary')) return 'theme:secondary';
    if (lowerLabel.includes('accent')) return 'theme:accent';
    if (lowerLabel.includes('background')) return 'theme:background';
    if (lowerLabel.includes('text')) return 'theme:text';
    if (lowerLabel.includes('border')) return 'theme:border';
    if (lowerLabel.includes('success')) return 'theme:success';
    if (lowerLabel.includes('warning')) return 'theme:warning';
    if (lowerLabel.includes('error')) return 'theme:error';
    // Default fallback
    return 'theme:text';
  }

  // Use the provided value, or the explicit defaultValue prop if provided, or fall back to label-based default
  $: effectiveValue = value || defaultValue || getDefaultThemeColor(label);
  $: hasExplicitValue = !!value;

  let showColorPicker = false;
  let colorPickerButton: HTMLButtonElement | null = null;

  // Get current theme colors for presets - use passed themeColors if available, otherwise lookup
  $: currentThemeColors = themeColors || getThemeColors(currentTheme);

  // Get the resolved color for the current theme
  $: isThemeRef = typeof effectiveValue === 'string' && effectiveValue.startsWith('theme:');
  $: isTransparent = typeof effectiveValue === 'string' && effectiveValue === 'transparent';
  $: isCustomColor =
    typeof effectiveValue === 'string' &&
    !effectiveValue.startsWith('theme:') &&
    !effectiveValue.startsWith('color:') &&
    !effectiveValue.startsWith('var(--') &&
    effectiveValue !== 'transparent';

  $: resolvedColor = (() => {
    if (isThemeRef && typeof effectiveValue === 'string') {
      const colorKey = effectiveValue.replace('theme:', '');
      return currentThemeColors[colorKey as keyof typeof currentThemeColors] || '#808080';
    }
    if (typeof effectiveValue === 'string') {
      return effectiveValue;
    }
    return '#808080';
  })();

  $: selectedColorName = (() => {
    if (typeof effectiveValue === 'string' && effectiveValue === 'transparent') {
      return 'Transparent';
    }
    if (isThemeRef && typeof effectiveValue === 'string') {
      const colorKey = effectiveValue.replace('theme:', '');
      return colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
    }
    if (isCustomColor) {
      return 'Custom';
    }
    return 'Color';
  })();

  // Toggle color picker popup
  function toggleColorPicker(): void {
    showColorPicker = !showColorPicker;
  }

  // Handle color selection from picker
  function handleColorSelect(event: CustomEvent<string>): void {
    onChange(event.detail);
    showColorPicker = false;
  }

  // Close color picker when clicking outside
  function handleClickOutside(event: MouseEvent): void {
    if (showColorPicker && colorPickerButton && !colorPickerButton.contains(event.target as Node)) {
      const pickerElement = document.querySelector('.color-picker-popup');
      if (pickerElement && !pickerElement.contains(event.target as Node)) {
        showColorPicker = false;
      }
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="theme-color-input">
  <div class="input-row">
    <span class="label">{label}</span>
    <button
      type="button"
      class="color-preview-btn"
      class:muted={!hasExplicitValue}
      bind:this={colorPickerButton}
      on:click={toggleColorPicker}
      title="{selectedColorName} - {isTransparent ? 'Transparent' : resolvedColor.toUpperCase()}"
    >
      <div
        class="preview-swatch"
        class:transparent-swatch={isTransparent}
        style="background-color: {resolvedColor};"
      />
      <svg
        class="dropdown-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  </div>

  {#if showColorPicker}
    <ColorPicker
      {currentTheme}
      themeColors={currentThemeColors}
      selectedValue={typeof effectiveValue === 'string' ? effectiveValue : 'theme:text'}
      {defaultValue}
      anchorElement={colorPickerButton}
      on:select={handleColorSelect}
      on:close={() => (showColorPicker = false)}
    />
  {/if}

  {#if onClear && value && showColorPicker}
    <button
      type="button"
      class="reset-btn-floating"
      on:click={() => {
        if (onClear) onClear();
        showColorPicker = false;
      }}
      title="Reset to Default Theme Color"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
      Reset
    </button>
  {/if}
</div>

<style>
  .theme-color-input {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    flex-shrink: 0;
    min-width: 100px;
  }

  .color-preview-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
  }

  .color-preview-btn.muted {
    opacity: 0.6;
    border-style: dashed;
  }

  .color-preview-btn:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  .color-preview-btn.muted:hover {
    opacity: 0.8;
    border-style: solid;
  }

  .preview-swatch {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  }

  /* Transparent swatch with checkerboard pattern */
  .preview-swatch.transparent-swatch {
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%) !important;
    background-size: 8px 8px;
    background-position:
      0 0,
      0 4px,
      4px -4px,
      -4px 0px;
    background-color: #fff !important;
  }

  .dropdown-icon {
    color: var(--color-text-secondary);
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .color-preview-btn:hover .dropdown-icon {
    color: var(--color-primary);
  }

  /* Reset Button */
  .reset-btn-floating {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--color-warning);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s;
    z-index: 1001;
  }

  .reset-btn-floating:hover {
    background: var(--color-warning);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
</style>
