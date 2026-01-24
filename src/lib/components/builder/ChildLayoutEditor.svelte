<script lang="ts">
  import type { ComponentConfig, Breakpoint } from '$lib/types/pages';

  export let config: ComponentConfig;
  export let currentBreakpoint: Breakpoint;
  export let parentDisplayMode: 'flex' | 'grid' | 'block' = 'flex';
  export let onUpdate: (config: ComponentConfig) => void;

  // Helper to get responsive value for current breakpoint
  function getResponsiveValue<T>(
    value: T | { desktop?: T; tablet?: T; mobile?: T } | undefined,
    fallback: T
  ): T {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const breakpointValue = (value as Record<string, T>)[currentBreakpoint];
      if (breakpointValue !== undefined) return breakpointValue;
      // Fallback to desktop if current breakpoint not set
      const desktopValue = (value as Record<string, T>)['desktop'];
      if (desktopValue !== undefined) return desktopValue;
      return fallback;
    }
    return value as T;
  }

  // Helper to set responsive value
  function setResponsiveValue<T>(key: keyof ComponentConfig, value: T): void {
    const currentValue = config[key] as T | { desktop?: T; tablet?: T; mobile?: T } | undefined;

    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      // Update existing responsive object
      (config[key] as Record<string, T>) = {
        ...(currentValue as Record<string, T>),
        [currentBreakpoint]: value
      };
    } else {
      // Create new responsive object with value for all breakpoints
      (config[key] as Record<string, T>) = {
        desktop:
          currentBreakpoint === 'desktop' ? value : ((currentValue as T) ?? getDefaultValue(key)),
        tablet:
          currentBreakpoint === 'tablet' ? value : ((currentValue as T) ?? getDefaultValue(key)),
        mobile:
          currentBreakpoint === 'mobile' ? value : ((currentValue as T) ?? getDefaultValue(key))
      };
    }
    onUpdate(config);
  }

  // Get default values for different properties
  function getDefaultValue<T>(key: keyof ComponentConfig): T {
    const defaults: Record<string, unknown> = {
      layoutFlexGrow: 0,
      layoutFlexShrink: 1,
      layoutFlexBasis: 'auto',
      layoutAlignSelf: 'auto',
      layoutGridColumn: 'auto',
      layoutGridRow: 'auto',
      layoutOrder: 0,
      layoutPlaceSelf: 'auto',
      layoutJustifySelf: 'stretch',
      layoutMinWidth: 'auto',
      layoutMaxWidth: 'none',
      layoutWidth: 'auto',
      layoutHeight: 'auto'
    };
    return (defaults[key] ?? 'auto') as T;
  }

  // Current values
  $: flexGrow = getResponsiveValue(config.layoutFlexGrow, 0);
  $: flexShrink = getResponsiveValue(config.layoutFlexShrink, 1);
  $: flexBasis = getResponsiveValue(config.layoutFlexBasis, 'auto');
  $: alignSelf = getResponsiveValue(config.layoutAlignSelf, 'auto');
  $: gridColumn = getResponsiveValue(config.layoutGridColumn, 'auto');
  $: gridRow = getResponsiveValue(config.layoutGridRow, 'auto');
  $: placeSelf = getResponsiveValue(config.layoutPlaceSelf, 'auto');
  $: order = getResponsiveValue(config.layoutOrder, 0);

  // Preset functions
  function applyFillPreset(): void {
    setResponsiveValue('layoutFlexGrow', 1);
    setResponsiveValue('layoutFlexShrink', 1);
    setResponsiveValue('layoutFlexBasis', 'auto');
  }

  function applyFixedPreset(): void {
    setResponsiveValue('layoutFlexGrow', 0);
    setResponsiveValue('layoutFlexShrink', 0);
  }
</script>

<div class="child-layout-editor">
  <!-- Header with breakpoint indicator -->
  <div class="editor-header">
    <h4>Child Layout</h4>
    <span class="breakpoint-badge">{currentBreakpoint}</span>
  </div>

  {#if parentDisplayMode === 'flex'}
    <!-- Flex Child Controls -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">Flex Properties</span>
        <div class="preset-buttons">
          <button
            type="button"
            class="preset-btn"
            on:click={applyFillPreset}
            title="Fill available space"
          >
            Fill
          </button>
          <button
            type="button"
            class="preset-btn"
            on:click={applyFixedPreset}
            title="Fixed size, no grow/shrink"
          >
            Fixed
          </button>
        </div>
      </div>

      <div class="control-row">
        <div class="form-group">
          <label for="flex-grow">Flex Grow</label>
          <input
            id="flex-grow"
            type="number"
            min="0"
            step="1"
            value={flexGrow}
            on:input={(e) => setResponsiveValue('layoutFlexGrow', Number(e.currentTarget.value))}
          />
          <small>How much to grow (0 = don't)</small>
        </div>

        <div class="form-group">
          <label for="flex-shrink">Flex Shrink</label>
          <input
            id="flex-shrink"
            type="number"
            min="0"
            step="1"
            value={flexShrink}
            on:input={(e) => setResponsiveValue('layoutFlexShrink', Number(e.currentTarget.value))}
          />
          <small>How much to shrink (0 = don't)</small>
        </div>
      </div>

      <div class="form-group">
        <label for="flex-basis">Flex Basis</label>
        <input
          id="flex-basis"
          type="text"
          value={flexBasis}
          placeholder="auto, 200px, 50%"
          on:input={(e) => setResponsiveValue('layoutFlexBasis', e.currentTarget.value)}
        />
        <small>Initial size before grow/shrink</small>
      </div>

      <div class="form-group">
        <label for="align-self">Align Self</label>
        <select
          id="align-self"
          value={alignSelf}
          on:change={(e) => setResponsiveValue('layoutAlignSelf', e.currentTarget.value)}
        >
          <option value="auto">Auto (inherit)</option>
          <option value="flex-start">Start</option>
          <option value="center">Center</option>
          <option value="flex-end">End</option>
          <option value="stretch">Stretch</option>
          <option value="baseline">Baseline</option>
        </select>
        <small>Override parent's align-items</small>
      </div>
    </div>
  {:else if parentDisplayMode === 'grid'}
    <!-- Grid Child Controls -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">Grid Placement</span>
      </div>

      <div class="control-row">
        <div class="form-group">
          <label for="grid-column">Grid Column</label>
          <input
            id="grid-column"
            type="text"
            value={gridColumn}
            placeholder="auto, span 2, 1 / 3"
            on:input={(e) => setResponsiveValue('layoutGridColumn', e.currentTarget.value)}
          />
          <small>Column span or position</small>
        </div>

        <div class="form-group">
          <label for="grid-row">Grid Row</label>
          <input
            id="grid-row"
            type="text"
            value={gridRow}
            placeholder="auto, span 2, 1 / 3"
            on:input={(e) => setResponsiveValue('layoutGridRow', e.currentTarget.value)}
          />
          <small>Row span or position</small>
        </div>
      </div>

      <div class="quick-spans">
        <span class="quick-label">Quick spans:</span>
        <button
          type="button"
          class="quick-btn"
          on:click={() => setResponsiveValue('layoutGridColumn', 'span 2')}
        >
          2 cols
        </button>
        <button
          type="button"
          class="quick-btn"
          on:click={() => setResponsiveValue('layoutGridColumn', 'span 3')}
        >
          3 cols
        </button>
        <button
          type="button"
          class="quick-btn"
          on:click={() => setResponsiveValue('layoutGridColumn', '1 / -1')}
        >
          Full width
        </button>
      </div>

      <div class="form-group">
        <label for="place-self">Place Self</label>
        <select
          id="place-self"
          value={placeSelf}
          on:change={(e) => setResponsiveValue('layoutPlaceSelf', e.currentTarget.value)}
        >
          <option value="auto">Auto</option>
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
          <option value="stretch">Stretch</option>
          <option value="start start">Start Start</option>
          <option value="center center">Center Center</option>
          <option value="end end">End End</option>
        </select>
        <small>Alignment within grid cell</small>
      </div>
    </div>
  {/if}

  <!-- Order Control (works in both flex and grid) -->
  <div class="section">
    <div class="section-header">
      <span class="section-title">Visual Order</span>
    </div>

    <div class="form-group">
      <label for="layout-order">Order</label>
      <input
        id="layout-order"
        type="number"
        step="1"
        value={order}
        on:input={(e) => setResponsiveValue('layoutOrder', Number(e.currentTarget.value))}
      />
      <small>Lower values appear first (-1, 0, 1, 2...)</small>
    </div>
  </div>

  <!-- Size Constraints -->
  <div class="section collapsible">
    <details>
      <summary class="section-header">
        <span class="section-title">Size Constraints</span>
      </summary>
      <div class="section-content">
        <div class="control-row">
          <div class="form-group">
            <label for="layout-width">Width</label>
            <input
              id="layout-width"
              type="text"
              value={getResponsiveValue(config.layoutWidth, 'auto')}
              placeholder="auto, 100%, 200px"
              on:input={(e) => setResponsiveValue('layoutWidth', e.currentTarget.value)}
            />
          </div>
          <div class="form-group">
            <label for="layout-height">Height</label>
            <input
              id="layout-height"
              type="text"
              value={getResponsiveValue(config.layoutHeight, 'auto')}
              placeholder="auto, 100%, 200px"
              on:input={(e) => setResponsiveValue('layoutHeight', e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="control-row">
          <div class="form-group">
            <label for="layout-min-width">Min Width</label>
            <input
              id="layout-min-width"
              type="text"
              value={getResponsiveValue(config.layoutMinWidth, 'auto')}
              placeholder="auto, 100px"
              on:input={(e) => setResponsiveValue('layoutMinWidth', e.currentTarget.value)}
            />
          </div>
          <div class="form-group">
            <label for="layout-max-width">Max Width</label>
            <input
              id="layout-max-width"
              type="text"
              value={getResponsiveValue(config.layoutMaxWidth, 'none')}
              placeholder="none, 400px"
              on:input={(e) => setResponsiveValue('layoutMaxWidth', e.currentTarget.value)}
            />
          </div>
        </div>
      </div>
    </details>
  </div>
</div>

<style>
  .child-layout-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--color-border-secondary);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .editor-header h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .breakpoint-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 4px;
    text-transform: capitalize;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .preset-buttons {
    display: flex;
    gap: 0.25rem;
  }

  .preset-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .preset-btn:hover {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .control-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .form-group input,
  .form-group select {
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .form-group input[type='number'] {
    width: 100%;
  }

  .form-group small {
    font-size: 0.6875rem;
    color: var(--color-text-muted);
  }

  .quick-spans {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .quick-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .quick-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.6875rem;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-btn:hover {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .collapsible details {
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    overflow: hidden;
  }

  .collapsible details summary {
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-tertiary);
    cursor: pointer;
    list-style: none;
  }

  .collapsible details summary::-webkit-details-marker {
    display: none;
  }

  .collapsible details summary::before {
    content: '▶';
    font-size: 0.625rem;
    margin-right: 0.5rem;
    transition: transform 0.15s ease;
    display: inline-block;
  }

  .collapsible details[open] summary::before {
    transform: rotate(90deg);
  }

  .section-content {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
