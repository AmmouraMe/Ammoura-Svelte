<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WidgetConfig, Breakpoint, ColorThemeDefinition } from '$lib/types/pages';
  import ThemeColorInput from '../admin/ThemeColorInput.svelte';
  import { getThemeColors } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let currentBreakpoint: Breakpoint;
  export let colorTheme: string = 'default';
  export let colorThemes: ColorThemeDefinition[] = [];
  // When true, shows internal tab navigation (Layout/Style tabs)
  // When false, shows only the content for the activeTabOverride
  export let showTabNavigation: boolean = true;
  // Override which tab content to show (useful when hiding internal tab navigation)
  export let activeTabOverride: 'layout' | 'style' | null = null;

  // Compute theme colors from colorThemes array (database-loaded themes) or fallback to static lookup
  $: currentThemeData = colorThemes.find((t) => t.id === colorTheme);
  $: themeColors = currentThemeData?.colors || getThemeColors(colorTheme);

  const dispatch = createEventDispatcher<{ update: WidgetConfig }>();

  // Helper to get responsive value
  function getResponsiveValue<T>(
    responsiveValue: T | { desktop?: T; tablet?: T; mobile?: T } | undefined,
    fallback: T
  ): T {
    if (!responsiveValue) return fallback;
    if (typeof responsiveValue === 'object' && responsiveValue !== null) {
      return (responsiveValue as Record<string, T>)[currentBreakpoint] ?? fallback;
    }
    return responsiveValue as T;
  }

  // Helper to set responsive value
  function setResponsiveValue<T>(
    key: keyof WidgetConfig,
    value: T,
    breakpoint: Breakpoint = currentBreakpoint
  ): void {
    const currentValue = config[key];
    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      // @ts-expect-error - Dynamic key assignment for responsive values
      config[key] = { ...currentValue, [breakpoint]: value };
    } else {
      // @ts-expect-error - Dynamic key assignment for responsive values
      config[key] = { desktop: value, tablet: value, mobile: value };
    }
    handleUpdate();
  }

  function handleUpdate(): void {
    dispatch('update', config);
  }

  // Initialize defaults
  if (!config.containerDisplay) {
    config.containerDisplay = { desktop: 'flex', tablet: 'flex', mobile: 'flex' };
  }
  if (!config.containerFlexDirection) {
    config.containerFlexDirection = { desktop: 'row', tablet: 'row', mobile: 'column' };
  }
  if (!config.containerJustifyContent) {
    config.containerJustifyContent = 'flex-start';
  }
  if (!config.containerAlignItems) {
    config.containerAlignItems = 'stretch';
  }
  if (!config.containerWrap) {
    config.containerWrap = 'nowrap';
  }
  if (config.containerGap === undefined) {
    config.containerGap = { desktop: 16, tablet: 16, mobile: 16 };
  }
  if (!config.containerPadding) {
    config.containerPadding = { desktop: { top: 40, right: 40, bottom: 40, left: 40 } };
  }
  if (!config.containerMaxWidth) {
    config.containerMaxWidth = '1200px';
  }
  if (!config.containerWidth) {
    config.containerWidth = { desktop: 'auto', tablet: 'auto', mobile: 'auto' };
  }
  if (!config.containerGridCols) {
    config.containerGridCols = { desktop: 3, tablet: 2, mobile: 1 };
  }
  if (!config.containerGridAutoFlow) {
    config.containerGridAutoFlow = { desktop: 'row', tablet: 'row', mobile: 'row' };
  }

  $: containerDisplay = getResponsiveValue(config.containerDisplay, 'flex');
  $: flexDirection = getResponsiveValue(config.containerFlexDirection, 'row');

  // Ensure padding is a ResponsiveValue object with desktop default
  $: if (
    config.containerPadding &&
    typeof config.containerPadding === 'object' &&
    !('desktop' in config.containerPadding)
  ) {
    const legacyPadding = config.containerPadding as Record<string, number>;
    if ('top' in legacyPadding) {
      config.containerPadding = {
        desktop: legacyPadding as { top: number; right: number; bottom: number; left: number }
      };
    }
  }

  // Get current padding values for the current breakpoint
  $: currentPadding =
    config.containerPadding &&
    typeof config.containerPadding === 'object' &&
    'desktop' in config.containerPadding
      ? getResponsiveValue(config.containerPadding, { top: 40, right: 40, bottom: 40, left: 40 })
      : { top: 40, right: 40, bottom: 40, left: 40 };

  // Update padding helper
  function updatePadding(side: 'top' | 'right' | 'bottom' | 'left', value: number): void {
    if (!config.containerPadding || typeof config.containerPadding !== 'object') {
      config.containerPadding = { desktop: { top: 40, right: 40, bottom: 40, left: 40 } };
    }
    const current = getResponsiveValue(config.containerPadding, {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    });
    const updated = { ...current, [side]: value };
    if (typeof config.containerPadding === 'object' && 'desktop' in config.containerPadding) {
      config.containerPadding = { ...config.containerPadding, [currentBreakpoint]: updated };
    } else {
      config.containerPadding = { desktop: updated };
    }
    handleUpdate();
  }

  let activeTab: 'layout' | 'style' = 'layout';

  // Use override if provided, otherwise use internal tab state
  $: effectiveTab = activeTabOverride ?? activeTab;
</script>

<div class="tailwind-container-editor">
  <!-- Breakpoint indicator -->
  <div class="breakpoint-badge">
    <span class="badge-label">Breakpoint:</span>
    <span class="badge-value">{currentBreakpoint}</span>
  </div>

  {#if showTabNavigation}
    <!-- Tab Navigation -->
    <div class="tabs">
      <button
        type="button"
        class="tab"
        class:active={activeTab === 'layout'}
        on:click={() => (activeTab = 'layout')}
      >
        Layout
      </button>
      <button
        type="button"
        class="tab"
        class:active={activeTab === 'style'}
        on:click={() => (activeTab = 'style')}
      >
        Style
      </button>
    </div>
  {/if}

  {#if effectiveTab === 'layout'}
    <!-- Display Mode Toggle -->
    <div class="section">
      <h4>Display Type</h4>
      <div class="display-toggle">
        <button
          type="button"
          class="toggle-btn"
          class:active={containerDisplay === 'flex'}
          on:click={() => setResponsiveValue('containerDisplay', 'flex')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" stroke-width="2" />
            <rect x="14" y="3" width="7" height="7" stroke-width="2" />
            <rect x="3" y="14" width="7" height="7" stroke-width="2" />
            <rect x="14" y="14" width="7" height="7" stroke-width="2" />
          </svg>
          <span>Flexbox</span>
        </button>
        <button
          type="button"
          class="toggle-btn"
          class:active={containerDisplay === 'grid'}
          on:click={() => setResponsiveValue('containerDisplay', 'grid')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" stroke-width="2" />
            <line x1="3" y1="9" x2="21" y2="9" stroke-width="2" />
            <line x1="3" y1="15" x2="21" y2="15" stroke-width="2" />
            <line x1="9" y1="3" x2="9" y2="21" stroke-width="2" />
            <line x1="15" y1="3" x2="15" y2="21" stroke-width="2" />
          </svg>
          <span>Grid</span>
        </button>
      </div>
    </div>

    <!-- Flexbox Controls -->
    {#if containerDisplay === 'flex'}
      <div class="section">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" stroke-width="2" stroke-linecap="round" />
          </svg>
          Flex Direction
        </h4>
        <div class="button-group">
          <button
            type="button"
            class="icon-btn"
            class:active={flexDirection === 'row'}
            on:click={() => setResponsiveValue('containerFlexDirection', 'row')}
            title="Row (→)"
          >
            →
          </button>
          <button
            type="button"
            class="icon-btn"
            class:active={flexDirection === 'row-reverse'}
            on:click={() => setResponsiveValue('containerFlexDirection', 'row-reverse')}
            title="Row Reverse (←)"
          >
            ←
          </button>
          <button
            type="button"
            class="icon-btn"
            class:active={flexDirection === 'column'}
            on:click={() => setResponsiveValue('containerFlexDirection', 'column')}
            title="Column (↓)"
          >
            ↓
          </button>
          <button
            type="button"
            class="icon-btn"
            class:active={flexDirection === 'column-reverse'}
            on:click={() => setResponsiveValue('containerFlexDirection', 'column-reverse')}
            title="Column Reverse (↑)"
          >
            ↑
          </button>
        </div>
      </div>

      <div class="section">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12h18M12 3v18" stroke-width="2" stroke-linecap="round" />
          </svg>
          Justify Content
        </h4>
        <div class="form-group">
          <select bind:value={config.containerJustifyContent} on:change={handleUpdate}>
            <option value="flex-start">Start</option>
            <option value="center">Center</option>
            <option value="flex-end">End</option>
            <option value="space-between">Space Between</option>
            <option value="space-around">Space Around</option>
            <option value="space-evenly">Space Evenly</option>
          </select>
          <small>Main axis alignment</small>
        </div>
      </div>

      <div class="section">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v18M3 12h18" stroke-width="2" stroke-linecap="round" />
          </svg>
          Align Items
        </h4>
        <div class="form-group">
          <select bind:value={config.containerAlignItems} on:change={handleUpdate}>
            <option value="stretch">Stretch</option>
            <option value="flex-start">Start</option>
            <option value="center">Center</option>
            <option value="flex-end">End</option>
            <option value="baseline">Baseline</option>
          </select>
          <small>Cross axis alignment</small>
        </div>
      </div>

      <div class="section">
        <h4>Flex Wrap</h4>
        <div class="button-group">
          <button
            type="button"
            class="text-btn"
            class:active={config.containerWrap === 'nowrap'}
            on:click={() => {
              config.containerWrap = 'nowrap';
              handleUpdate();
            }}
          >
            No Wrap
          </button>
          <button
            type="button"
            class="text-btn"
            class:active={config.containerWrap === 'wrap'}
            on:click={() => {
              config.containerWrap = 'wrap';
              handleUpdate();
            }}
          >
            Wrap
          </button>
          <button
            type="button"
            class="text-btn"
            class:active={config.containerWrap === 'wrap-reverse'}
            on:click={() => {
              config.containerWrap = 'wrap-reverse';
              handleUpdate();
            }}
          >
            Wrap Reverse
          </button>
        </div>
      </div>
    {:else if containerDisplay === 'grid'}
      <div class="section">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" stroke-width="2" />
            <line x1="9" y1="3" x2="9" y2="21" stroke-width="2" />
            <line x1="15" y1="3" x2="15" y2="21" stroke-width="2" />
          </svg>
          Grid Template Columns
        </h4>
        <div class="form-group">
          <input
            type="text"
            bind:value={config.containerGridCols}
            on:input={handleUpdate}
            placeholder="3 or repeat(3, 1fr)"
          />
          <small
            >Examples: <code>3</code>, <code>1fr 2fr 1fr</code>, <code>repeat(4, 1fr)</code></small
          >
        </div>
        <div class="quick-grid-cols">
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              setResponsiveValue('containerGridCols', 1);
            }}
          >
            1 col
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              setResponsiveValue('containerGridCols', 2);
            }}
          >
            2 cols
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              setResponsiveValue('containerGridCols', 3);
            }}
          >
            3 cols
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              setResponsiveValue('containerGridCols', 4);
            }}
          >
            4 cols
          </button>
        </div>
      </div>

      <div class="section">
        <h4>Grid Template Rows</h4>
        <div class="form-group">
          <input
            type="text"
            bind:value={config.containerGridRows}
            on:input={handleUpdate}
            placeholder="auto"
          />
          <small>Leave empty for auto rows</small>
        </div>
      </div>

      <div class="section">
        <h4>Grid Auto Flow</h4>
        <div class="button-group">
          <button
            type="button"
            class="text-btn"
            class:active={getResponsiveValue(config.containerGridAutoFlow, 'row') === 'row'}
            on:click={() => {
              setResponsiveValue('containerGridAutoFlow', 'row');
            }}
          >
            Row
          </button>
          <button
            type="button"
            class="text-btn"
            class:active={getResponsiveValue(config.containerGridAutoFlow, 'row') === 'column'}
            on:click={() => {
              setResponsiveValue('containerGridAutoFlow', 'column');
            }}
          >
            Column
          </button>
          <button
            type="button"
            class="text-btn"
            class:active={getResponsiveValue(config.containerGridAutoFlow, 'row') === 'dense'}
            on:click={() => {
              setResponsiveValue('containerGridAutoFlow', 'dense');
            }}
          >
            Dense
          </button>
        </div>
      </div>

      <div class="section">
        <h4>Place Items</h4>
        <div class="form-group">
          <select bind:value={config.containerPlaceItems} on:change={handleUpdate}>
            <option value="">Default</option>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="stretch">Stretch</option>
            <option value="start center">Start Center</option>
            <option value="end center">End Center</option>
          </select>
          <small>Align items within grid cells</small>
        </div>
      </div>
    {/if}

    <!-- Gap (Common to both) -->
    <div class="section">
      <h4>Gap</h4>
      <div class="form-group">
        <input
          type="number"
          bind:value={config.containerGap}
          on:input={handleUpdate}
          min="0"
          step="4"
          placeholder="16"
        />
        <small>Space between children (px)</small>
      </div>
    </div>

    <!-- Mobile Collapse -->
    <div class="section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="2" y="3" width="20" height="18" rx="2" stroke-width="2" />
          <path d="M8 10h8M8 14h8" stroke-width="2" stroke-linecap="round" />
        </svg>
        Mobile Collapse
      </h4>
      <div class="form-group toggle-row">
        <label for="mobile-collapse-toggle">Collapse on mobile</label>
        <input
          id="mobile-collapse-toggle"
          type="checkbox"
          checked={config.containerMobileCollapse === true}
          on:change={(e) => {
            config.containerMobileCollapse = e.currentTarget.checked;
            handleUpdate();
          }}
        />
      </div>
      <small>
        Hides this container's contents behind a hamburger on screens under 768px. A row of
        navigation items inside a navbar already does this on its own — switch it on here for any
        other container, or off to keep a navbar row expanded.
      </small>

      {#if config.containerMobileCollapse}
        <div class="form-group">
          <label for="mobile-collapse-label">Toggle label</label>
          <input
            id="mobile-collapse-label"
            type="text"
            value={config.containerMobileCollapseLabel || ''}
            on:input={(e) => {
              config.containerMobileCollapseLabel = e.currentTarget.value;
              handleUpdate();
            }}
            placeholder="Menu"
          />
          <small>Text shown next to the hamburger icon</small>
        </div>
        <div class="form-group">
          <label for="mobile-collapse-icon-color">Icon color</label>
          <input
            id="mobile-collapse-icon-color"
            type="color"
            value={config.containerMobileCollapseIconColor || '#000000'}
            on:input={(e) => {
              config.containerMobileCollapseIconColor = e.currentTarget.value;
              handleUpdate();
            }}
          />
          <small>Color of the hamburger icon</small>
        </div>
        <div class="form-group">
          <label for="mobile-collapse-bg">Toggle background</label>
          <input
            id="mobile-collapse-bg"
            type="color"
            value={config.containerMobileCollapseBackground || '#ffffff'}
            on:input={(e) => {
              config.containerMobileCollapseBackground = e.currentTarget.value;
              handleUpdate();
            }}
          />
          <small>Background color of the toggle bar</small>
        </div>
      {/if}
    </div>
  {:else if effectiveTab === 'style'}
    <!-- Spacing Section -->
    <div class="section">
      <h4>Padding</h4>
      <div class="spacing-grid">
        <div class="form-group">
          <label for="padding-top">Top</label>
          <input
            id="padding-top"
            type="number"
            value={currentPadding.top}
            on:input={(e) => updatePadding('top', Number(e.currentTarget.value))}
            min="0"
            placeholder="40"
          />
        </div>
        <div class="form-group">
          <label for="padding-right">Right</label>
          <input
            id="padding-right"
            type="number"
            value={currentPadding.right}
            on:input={(e) => updatePadding('right', Number(e.currentTarget.value))}
            min="0"
            placeholder="40"
          />
        </div>
        <div class="form-group">
          <label for="padding-bottom">Bottom</label>
          <input
            id="padding-bottom"
            type="number"
            value={currentPadding.bottom}
            on:input={(e) => updatePadding('bottom', Number(e.currentTarget.value))}
            min="0"
            placeholder="40"
          />
        </div>
        <div class="form-group">
          <label for="padding-left">Left</label>
          <input
            id="padding-left"
            type="number"
            value={currentPadding.left}
            on:input={(e) => updatePadding('left', Number(e.currentTarget.value))}
            min="0"
            placeholder="40"
          />
        </div>
      </div>
    </div>

    <!-- Size Section -->
    <div class="section">
      <h4>Size</h4>
      <div class="form-group">
        <label for="container-width">Width</label>
        <select id="container-width" bind:value={config.containerWidth} on:change={handleUpdate}>
          <option value="auto">Auto</option>
          <option value="100%">Full Width (100%)</option>
          <option value="50%">Half Width (50%)</option>
          <option value="33.333%">Third (33%)</option>
          <option value="66.667%">Two Thirds (66%)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="container-max-width">Max Width</label>
        <input
          id="container-max-width"
          type="text"
          bind:value={config.containerMaxWidth}
          on:input={handleUpdate}
          placeholder="1200px"
        />
        <small>e.g., <code>1200px</code>, <code>100%</code>, <code>none</code></small>
      </div>
      <div class="form-group">
        <label for="container-min-height">Min Height</label>
        <input
          id="container-min-height"
          type="text"
          bind:value={config.containerMinHeight}
          on:input={handleUpdate}
          placeholder="auto"
        />
        <small>e.g., <code>300px</code>, <code>50vh</code></small>
      </div>
    </div>

    <!-- Styling Section -->
    <div class="section">
      <h4>Background</h4>
      <div class="form-group">
        <ThemeColorInput
          value={config.containerBackground || 'transparent'}
          currentTheme={colorTheme}
          {themeColors}
          label="Background Color"
          defaultValue="transparent"
          onChange={(newValue) => {
            config.containerBackground = typeof newValue === 'string' ? newValue : 'transparent';
            handleUpdate();
          }}
        />
      </div>
      <div class="form-group">
        <label for="container-bg-image">Background Image</label>
        <input
          id="container-bg-image"
          type="text"
          bind:value={config.containerBackgroundImage}
          on:input={handleUpdate}
          placeholder="https://..."
        />
        <small>Optional background image URL</small>
      </div>
    </div>

    <div class="section">
      <h4>Border</h4>
      <div class="form-group">
        <ThemeColorInput
          value={typeof config.containerBorderColor === 'string' ? config.containerBorderColor : ''}
          currentTheme={colorTheme}
          {themeColors}
          label="Border Color"
          defaultValue=""
          onChange={(newValue) => {
            config.containerBorderColor = typeof newValue === 'string' ? newValue : '';
            handleUpdate();
          }}
        />
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label for="container-border-width">Border Width (px)</label>
          <input
            id="container-border-width"
            type="number"
            value={config.containerBorderWidth ?? 0}
            on:input={(e) => {
              const value = parseInt(e.currentTarget.value, 10);
              config.containerBorderWidth = isNaN(value) ? 0 : value;
              handleUpdate();
            }}
            min="0"
            placeholder="0"
          />
        </div>
        <div class="form-group half">
          <label for="container-border-style">Border Style</label>
          <select
            id="container-border-style"
            bind:value={config.containerBorderStyle}
            on:change={handleUpdate}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
            <option value="double">Double</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="container-border-radius">Border Radius (px)</label>
        <input
          id="container-border-radius"
          type="number"
          bind:value={config.containerBorderRadius}
          on:input={handleUpdate}
          min="0"
          placeholder="0"
        />
        <div class="quick-radius">
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              config.containerBorderRadius = 0;
              handleUpdate();
            }}
          >
            0
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              config.containerBorderRadius = 4;
              handleUpdate();
            }}
          >
            4
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              config.containerBorderRadius = 8;
              handleUpdate();
            }}
          >
            8
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              config.containerBorderRadius = 16;
              handleUpdate();
            }}
          >
            16
          </button>
          <button
            type="button"
            class="quick-btn"
            on:click={() => {
              config.containerBorderRadius = 9999;
              handleUpdate();
            }}
          >
            Full
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tailwind-container-editor {
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

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid var(--color-border-secondary, #e2e8f0);
    margin-bottom: 8px;
  }

  .tab {
    padding: 10px 20px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tab:hover {
    color: var(--color-primary, #3b82f6);
    background: var(--color-primary-light, #eff6ff);
  }

  .tab.active {
    color: var(--color-primary, #3b82f6);
    border-bottom-color: var(--color-primary, #3b82f6);
    background: var(--color-primary-light, #eff6ff);
  }

  .badge-label {
    opacity: 0.9;
  }

  .badge-value {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .display-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .toggle-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px;
    border: 2px solid var(--color-border-primary, #cbd5e1);
    border-radius: 8px;
    background: var(--color-bg-secondary, #f8fafc);
    color: var(--color-text-primary, #1e293b);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .toggle-btn.active {
    border-color: var(--color-primary, #3b82f6);
    background: #334155;
    color: white;
  }

  .toggle-btn.active svg {
    opacity: 1;
    stroke: white;
  }

  .toggle-btn svg {
    opacity: 0.7;
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

  .section h4 svg {
    opacity: 0.5;
  }

  .button-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .icon-btn {
    flex: 1;
    min-width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-border-primary, #cbd5e1);
    border-radius: 6px;
    background: var(--color-bg-secondary, #f8fafc);
    font-size: 20px;
    font-weight: bold;
    color: var(--color-text-primary, #1e293b);
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .icon-btn.active {
    border-color: var(--color-primary, #3b82f6);
    background: #334155;
    color: white;
  }

  .text-btn {
    flex: 1;
    padding: 8px 12px;
    border: 2px solid var(--color-border-primary, #cbd5e1);
    border-radius: 6px;
    background: var(--color-bg-secondary, #f8fafc);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-primary, #1e293b);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .text-btn:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .text-btn.active {
    border-color: var(--color-primary, #3b82f6);
    background: #334155;
    color: white;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
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
    padding: 10px 12px;
    border: 2px solid var(--color-border-secondary, #e2e8f0);
    border-radius: 6px;
    font-size: 13px;
    color: var(--color-text-primary, #1e293b);
    background: var(--color-bg-primary, white);
    transition: all 0.2s;
    font-family: inherit;
  }

  .form-group input:hover,
  .form-group select:hover {
    border-color: var(--color-border-primary, #cbd5e1);
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 3px var(--color-primary-light, rgba(59, 130, 246, 0.1));
  }

  .form-group small {
    font-size: 11px;
    color: var(--color-text-tertiary, #94a3b8);
    line-height: 1.4;
  }

  .form-group small code {
    background: var(--color-bg-secondary, #f1f5f9);
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--color-primary, #3b82f6);
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-group.half {
    flex: 1;
  }

  .spacing-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .quick-grid-cols,
  .quick-radius {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }

  .quick-btn {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--color-border-secondary, #e2e8f0);
    border-radius: 4px;
    background: var(--color-bg-secondary, #f8fafc);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.15s;
  }

  .quick-btn:hover {
    background: var(--color-primary-light, #eff6ff);
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .toggle-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .toggle-row input[type='checkbox'] {
    width: auto;
    cursor: pointer;
  }
</style>
