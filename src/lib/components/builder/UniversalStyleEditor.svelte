<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    ComponentConfig,
    Breakpoint,
    SpacingConfig,
    ColorThemeDefinition
  } from '$lib/types/pages';
  import ThemeColorInput from '../admin/ThemeColorInput.svelte';
  import BreakpointFieldBadge from './BreakpointFieldBadge.svelte';
  import { getThemeColors } from '$lib/utils/editor/colorThemes';
  import { setBreakpoint, clearBreakpoint } from '$lib/utils/responsiveField';

  export let config: ComponentConfig;
  export let currentBreakpoint: Breakpoint;
  export let colorTheme: string = 'default';
  export let colorThemes: ColorThemeDefinition[] = [];

  // Compute theme colors from colorThemes array (database-loaded themes) or fallback to static lookup
  $: currentThemeData = colorThemes.find((t) => t.id === colorTheme);
  $: themeColors = currentThemeData?.colors || getThemeColors(colorTheme);

  const dispatch = createEventDispatcher<{ update: ComponentConfig }>();

  // Helper to get responsive value
  function getResponsiveValue<T>(
    responsiveValue: T | { desktop?: T; tablet?: T; mobile?: T } | undefined,
    fallback: T
  ): T {
    if (responsiveValue === undefined || responsiveValue === null) return fallback;
    if (typeof responsiveValue === 'object' && responsiveValue !== null) {
      const val = (responsiveValue as Record<string, T>)[currentBreakpoint];
      if (val !== undefined) return val;
      // Fallback to desktop
      const desktopVal = (responsiveValue as Record<string, T>)['desktop'];
      if (desktopVal !== undefined) return desktopVal;
      return fallback;
    }
    return responsiveValue as T;
  }

  // Helper to set responsive value (reserved for future use)
  function _setResponsiveValue<T>(key: keyof ComponentConfig, value: T): void {
    const currentValue = config[key] as T | { desktop?: T; tablet?: T; mobile?: T } | undefined;

    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      // Update existing responsive object
      (config[key] as Record<string, T>) = {
        ...(currentValue as Record<string, T>),
        [currentBreakpoint]: value
      };
    } else {
      // Create new responsive object with value for current breakpoint
      (config[key] as Record<string, T>) = {
        desktop: currentBreakpoint === 'desktop' ? value : (currentValue as T),
        tablet: currentBreakpoint === 'tablet' ? value : (currentValue as T),
        mobile: currentBreakpoint === 'mobile' ? value : (currentValue as T)
      };
    }
    handleUpdate();
  }

  function handleUpdate(): void {
    dispatch('update', config);
  }

  // Initialize styles if not present
  if (!config.styles) {
    config.styles = {};
  }

  // Padding helpers
  function getStylesPadding(): SpacingConfig {
    const padding = config.styles?.padding;
    if (!padding) return { top: 0, right: 0, bottom: 0, left: 0 };
    return getResponsiveValue(padding, { top: 0, right: 0, bottom: 0, left: 0 });
  }

  function setStylesPadding(side: 'top' | 'right' | 'bottom' | 'left', value: number): void {
    if (!config.styles) config.styles = {};
    const updated = { ...getStylesPadding(), [side]: value };
    // Writes only the edited breakpoint's slot (seeding a desktop base), so a
    // tablet/mobile edit is a real override rather than a copy of all three.
    config.styles.padding = setBreakpoint(config.styles.padding, currentBreakpoint, updated);
    handleUpdate();
  }

  function resetStylesPadding(): void {
    if (!config.styles?.padding) return;
    config.styles.padding = clearBreakpoint(config.styles.padding, currentBreakpoint);
    handleUpdate();
  }

  $: currentPadding = getStylesPadding();

  // Margin helpers
  function getStylesMargin(): SpacingConfig {
    const margin = config.styles?.margin;
    if (!margin) return { top: 0, right: 0, bottom: 0, left: 0 };
    return getResponsiveValue(margin, { top: 0, right: 0, bottom: 0, left: 0 });
  }

  function setStylesMargin(
    side: 'top' | 'right' | 'bottom' | 'left',
    value: number | 'auto'
  ): void {
    if (!config.styles) config.styles = {};
    const current = getStylesMargin();
    const updated = { ...current, [side]: value };

    config.styles.margin = setBreakpoint(config.styles.margin, currentBreakpoint, updated);
    handleUpdate();
  }

  function resetStylesMargin(): void {
    if (!config.styles?.margin) return;
    config.styles.margin = clearBreakpoint(config.styles.margin, currentBreakpoint);
    handleUpdate();
  }

  $: currentMargin = getStylesMargin();

  // Size helpers
  function getWidth(): string {
    const width = config.styles?.width;
    if (!width) return 'auto';
    return getResponsiveValue(width, 'auto');
  }

  function setWidth(value: string): void {
    if (!config.styles) config.styles = {};
    config.styles.width = setBreakpoint(config.styles.width, currentBreakpoint, value);
    handleUpdate();
  }

  function resetWidth(): void {
    if (!config.styles?.width) return;
    config.styles.width = clearBreakpoint(config.styles.width, currentBreakpoint);
    handleUpdate();
  }

  $: currentWidth = getWidth();

  function getHeight(): string {
    const height = config.styles?.height;
    if (!height) return 'auto';
    return getResponsiveValue(height, 'auto');
  }

  function setHeight(value: string): void {
    if (!config.styles) config.styles = {};
    config.styles.height = setBreakpoint(config.styles.height, currentBreakpoint, value);
    handleUpdate();
  }

  function resetHeight(): void {
    if (!config.styles?.height) return;
    config.styles.height = clearBreakpoint(config.styles.height, currentBreakpoint);
    handleUpdate();
  }

  $: currentHeight = getHeight();

  // Background - use existing backgroundColor field for compatibility
  $: backgroundColor = config.backgroundColor ?? 'transparent';

  // Border config helpers
  $: borderWidth = config.borderWidth ?? 0;
  $: borderColor = config.borderColor ?? '';
  $: borderRadius = config.borderRadius ?? 0;
</script>

<div class="universal-style-editor">
  <!-- Editing-breakpoint context: which breakpoint edits write to, and how
       unset fields inherit. Switch breakpoints from the toolbar. -->
  <div class="breakpoint-badge">
    <span class="badge-label">Editing</span>
    <span class="badge-value">{currentBreakpoint}</span>
    <span class="badge-hint">
      {currentBreakpoint === 'desktop'
        ? '· base, applies to all screens'
        : `· overrides inherit from ${currentBreakpoint === 'mobile' ? 'tablet → desktop' : 'desktop'}`}
    </span>
  </div>

  <!-- Spacing Section -->
  <div class="section">
    <h4>
      Padding
      <BreakpointFieldBadge
        value={config.styles?.padding}
        breakpoint={currentBreakpoint}
        on:reset={resetStylesPadding}
      />
    </h4>
    <div class="spacing-grid">
      <div class="form-group">
        <label for="padding-top">Top</label>
        <input
          id="padding-top"
          type="number"
          value={typeof currentPadding.top === 'number' ? currentPadding.top : 0}
          on:input={(e) => setStylesPadding('top', Number(e.currentTarget.value))}
          min="0"
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label for="padding-right">Right</label>
        <input
          id="padding-right"
          type="number"
          value={typeof currentPadding.right === 'number' ? currentPadding.right : 0}
          on:input={(e) => setStylesPadding('right', Number(e.currentTarget.value))}
          min="0"
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label for="padding-bottom">Bottom</label>
        <input
          id="padding-bottom"
          type="number"
          value={typeof currentPadding.bottom === 'number' ? currentPadding.bottom : 0}
          on:input={(e) => setStylesPadding('bottom', Number(e.currentTarget.value))}
          min="0"
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label for="padding-left">Left</label>
        <input
          id="padding-left"
          type="number"
          value={typeof currentPadding.left === 'number' ? currentPadding.left : 0}
          on:input={(e) => setStylesPadding('left', Number(e.currentTarget.value))}
          min="0"
          placeholder="0"
        />
      </div>
    </div>
  </div>

  <div class="section">
    <h4>
      Margin
      <BreakpointFieldBadge
        value={config.styles?.margin}
        breakpoint={currentBreakpoint}
        on:reset={resetStylesMargin}
      />
    </h4>
    <div class="spacing-grid">
      <div class="form-group">
        <label for="margin-top">Top</label>
        <input
          id="margin-top"
          type="number"
          value={typeof currentMargin.top === 'number' ? currentMargin.top : 0}
          on:input={(e) => setStylesMargin('top', Number(e.currentTarget.value))}
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label for="margin-right">Right</label>
        <input
          id="margin-right"
          type="number"
          value={typeof currentMargin.right === 'number' ? currentMargin.right : 0}
          on:input={(e) => setStylesMargin('right', Number(e.currentTarget.value))}
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label for="margin-bottom">Bottom</label>
        <input
          id="margin-bottom"
          type="number"
          value={typeof currentMargin.bottom === 'number' ? currentMargin.bottom : 0}
          on:input={(e) => setStylesMargin('bottom', Number(e.currentTarget.value))}
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label for="margin-left">Left</label>
        <input
          id="margin-left"
          type="number"
          value={typeof currentMargin.left === 'number' ? currentMargin.left : 0}
          on:input={(e) => setStylesMargin('left', Number(e.currentTarget.value))}
          placeholder="0"
        />
      </div>
    </div>
    <div class="quick-actions">
      <button
        type="button"
        class="quick-btn"
        on:click={() => {
          setStylesMargin('left', 'auto');
          setStylesMargin('right', 'auto');
        }}
        title="Center horizontally with auto margins"
      >
        Center
      </button>
    </div>
  </div>

  <!-- Size Section -->
  <div class="section">
    <h4>Size</h4>
    <div class="form-group">
      <div class="field-head">
        <label for="element-width">Width</label>
        <BreakpointFieldBadge
          value={config.styles?.width}
          breakpoint={currentBreakpoint}
          on:reset={resetWidth}
        />
      </div>
      <input
        id="element-width"
        type="text"
        value={currentWidth}
        on:input={(e) => setWidth(e.currentTarget.value)}
        placeholder="auto, 100%, 300px"
      />
      <small>e.g., <code>auto</code>, <code>100%</code>, <code>300px</code></small>
    </div>
    <div class="quick-widths">
      <button type="button" class="quick-btn" on:click={() => setWidth('auto')}>Auto</button>
      <button type="button" class="quick-btn" on:click={() => setWidth('100%')}>100%</button>
      <button type="button" class="quick-btn" on:click={() => setWidth('50%')}>50%</button>
      <button type="button" class="quick-btn" on:click={() => setWidth('fit-content')}
        >Fit Content</button
      >
    </div>
    <div class="form-group">
      <div class="field-head">
        <label for="element-height">Height</label>
        <BreakpointFieldBadge
          value={config.styles?.height}
          breakpoint={currentBreakpoint}
          on:reset={resetHeight}
        />
      </div>
      <input
        id="element-height"
        type="text"
        value={currentHeight}
        on:input={(e) => setHeight(e.currentTarget.value)}
        placeholder="auto, 100px, 50vh"
      />
      <small>e.g., <code>auto</code>, <code>100px</code>, <code>50vh</code></small>
    </div>
    <div class="form-group">
      <label for="min-width">Min Width</label>
      <input
        id="min-width"
        type="text"
        bind:value={config.minWidth}
        on:input={handleUpdate}
        placeholder="0"
      />
    </div>
    <div class="form-group">
      <label for="max-width">Max Width</label>
      <input
        id="max-width"
        type="text"
        bind:value={config.maxWidth}
        on:input={handleUpdate}
        placeholder="none"
      />
    </div>
    <div class="form-group">
      <label for="min-height">Min Height</label>
      <input
        id="min-height"
        type="text"
        bind:value={config.minHeight}
        on:input={handleUpdate}
        placeholder="0"
      />
    </div>
    <div class="form-group">
      <label for="max-height">Max Height</label>
      <input
        id="max-height"
        type="text"
        bind:value={config.maxHeight}
        on:input={handleUpdate}
        placeholder="none"
      />
    </div>
  </div>

  <!-- Background Section -->
  <div class="section">
    <h4>Background</h4>
    <div class="form-group">
      <ThemeColorInput
        value={backgroundColor}
        currentTheme={colorTheme}
        {themeColors}
        label="Background Color"
        defaultValue="transparent"
        onChange={(newValue) => {
          config.backgroundColor = typeof newValue === 'string' ? newValue : 'transparent';
          handleUpdate();
        }}
      />
    </div>
    <div class="form-group">
      <label for="bg-image">Background Image URL</label>
      <input
        id="bg-image"
        type="text"
        bind:value={config.backgroundImage}
        on:input={handleUpdate}
        placeholder="https://..."
      />
    </div>
  </div>

  <!-- Border Section -->
  <div class="section">
    <h4>Border</h4>
    <div class="form-group">
      <ThemeColorInput
        value={borderColor}
        currentTheme={colorTheme}
        {themeColors}
        label="Border Color"
        defaultValue=""
        onChange={(newValue) => {
          config.borderColor = typeof newValue === 'string' ? newValue : '';
          handleUpdate();
        }}
      />
    </div>
    <div class="form-row">
      <div class="form-group half">
        <label for="border-width">Border Width (px)</label>
        <input
          id="border-width"
          type="number"
          value={borderWidth}
          on:input={(e) => {
            const value = parseInt(e.currentTarget.value, 10);
            config.borderWidth = isNaN(value) ? 0 : value;
            handleUpdate();
          }}
          min="0"
          placeholder="0"
        />
      </div>
      <div class="form-group half">
        <label for="border-style">Border Style</label>
        <select id="border-style" bind:value={config.borderStyle} on:change={handleUpdate}>
          <option value="none">None</option>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="double">Double</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="border-radius">Border Radius (px)</label>
      <input
        id="border-radius"
        type="number"
        value={borderRadius}
        on:input={(e) => {
          const value = parseInt(e.currentTarget.value, 10);
          config.borderRadius = isNaN(value) ? 0 : value;
          handleUpdate();
        }}
        min="0"
        placeholder="0"
      />
      <div class="quick-radius">
        <button
          type="button"
          class="quick-btn"
          on:click={() => {
            config.borderRadius = 0;
            handleUpdate();
          }}
        >
          0
        </button>
        <button
          type="button"
          class="quick-btn"
          on:click={() => {
            config.borderRadius = 4;
            handleUpdate();
          }}
        >
          4
        </button>
        <button
          type="button"
          class="quick-btn"
          on:click={() => {
            config.borderRadius = 8;
            handleUpdate();
          }}
        >
          8
        </button>
        <button
          type="button"
          class="quick-btn"
          on:click={() => {
            config.borderRadius = 16;
            handleUpdate();
          }}
        >
          16
        </button>
        <button
          type="button"
          class="quick-btn"
          on:click={() => {
            config.borderRadius = 9999;
            handleUpdate();
          }}
        >
          Full
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .universal-style-editor {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 12px 0;
  }

  .breakpoint-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: white;
  }

  .badge-label {
    opacity: 0.9;
  }

  .badge-value {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-hint {
    opacity: 0.85;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }

  .section h4 {
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-primary, #1e293b);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding-bottom: 6px;
    border-bottom: 2px solid var(--color-border-secondary, #e2e8f0);
  }

  .spacing-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .form-group input,
  .form-group select {
    padding: 8px 10px;
    border: 2px solid var(--color-border-primary, #cbd5e1);
    border-radius: 6px;
    font-size: 13px;
    background: var(--color-bg-primary, #ffffff);
    color: var(--color-text-primary, #1e293b);
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
  }

  .form-group small {
    font-size: 11px;
    color: var(--color-text-secondary, #64748b);
  }

  .form-group small code {
    background: var(--color-bg-secondary, #f8fafc);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
  }

  .form-row {
    display: flex;
    gap: 10px;
  }

  .form-row .half {
    flex: 1;
  }

  .quick-actions,
  .quick-widths,
  .quick-radius {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .quick-btn {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    background: var(--color-bg-secondary, #f8fafc);
    border: 1px solid var(--color-border-primary, #cbd5e1);
    border-radius: 4px;
    color: var(--color-text-primary, #1e293b);
    cursor: pointer;
    transition: all 0.15s;
  }

  .quick-btn:hover {
    background: var(--color-primary, #3b82f6);
    border-color: var(--color-primary, #3b82f6);
    color: white;
  }
</style>
