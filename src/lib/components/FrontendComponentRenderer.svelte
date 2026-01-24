<script lang="ts">
  /**
   * FrontendComponentRenderer - Renders page/layout components on the public frontend
   *
   * This component handles:
   * 1. Rendering any component type based on its config
   * 2. Recursively rendering children for container-based components
   * 3. Template substitution using site context
   * 4. Visibility filtering based on user auth state and roles
   *
   * Unlike the admin ComponentRenderer, this is read-only and optimized for public display.
   */
  import type { WidgetConfig, PositionConfig, ResponsiveValue } from '$lib/types/pages';
  import type { SiteContext } from '$lib/utils/templateSubstitution';

  // User type for visibility checking
  interface UserInfo {
    id?: number | string;
    email?: string;
    name?: string;
    role?: string;
    roles?: string[]; // Allow multiple roles
  }

  // Define child component interface for nested widgets
  interface ChildWidget {
    id?: string;
    type: string;
    config?: WidgetConfig;
    position?: number;
  }

  // Component imports
  import TextComponent from '$lib/components/builtin/Text.svelte';
  import ImageComponent from '$lib/components/builtin/Image.svelte';
  import IconComponent from '$lib/components/builtin/Icon.svelte';
  import SingleProductComponent from '$lib/components/builtin/SingleProduct.svelte';
  import ProductListComponent from '$lib/components/builtin/ProductList.svelte';
  import HeroComponent from '$lib/components/builtin/Hero.svelte';
  import ButtonComponent from '$lib/components/builtin/Button.svelte';
  import SpacerComponent from '$lib/components/builtin/Spacer.svelte';
  import DividerComponent from '$lib/components/builtin/Divider.svelte';
  import ColumnsComponent from '$lib/components/builtin/Columns.svelte';
  import HeadingComponent from '$lib/components/builtin/Heading.svelte';
  import FeaturesComponent from '$lib/components/builtin/Features.svelte';
  import PricingComponent from '$lib/components/builtin/Pricing.svelte';
  import CTAComponent from '$lib/components/builtin/CTA.svelte';
  import NavBar from '$lib/components/builtin/NavBar.svelte';
  import Footer from '$lib/components/builtin/Footer.svelte';
  import DropdownComponent from '$lib/components/builtin/Dropdown.svelte';
  import ThemeToggleComponent from '$lib/components/builtin/ThemeToggle.svelte';
  import {
    resolveThemeColor,
    getThemeColors,
    generateThemeStyles
  } from '$lib/utils/editor/colorThemes';
  import type {
    ShadowConfig,
    TransformConfig,
    FilterConfig,
    ComponentConfig
  } from '$lib/types/pages';

  // Props
  export let type: string;
  export let config: WidgetConfig = {};
  export let colorTheme: string = 'vibrant';
  export let siteContext: SiteContext | undefined = undefined;
  export let onLogout: (() => void) | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined; // Current user for visibility checks
  export let position: ResponsiveValue<PositionConfig> | undefined = undefined; // Optional position override from layout

  /**
   * Check if the component should be visible based on visibility rules
   * @returns true if component should be rendered, false to hide
   */
  function checkVisibility(): boolean {
    const visibilityRule = config.visibilityRule ?? 'always';
    const requiredRoles = config.requiredRoles ?? [];
    const hideFromRoles = config.hideFromRoles ?? [];

    const isAuthenticated = !!user;
    const userRoles = getUserRoles();

    // Check hideFromRoles first (takes priority)
    if (hideFromRoles.length > 0 && userRoles.some((r) => hideFromRoles.includes(r))) {
      return false; // Hide from this user
    }

    switch (visibilityRule) {
      case 'always':
        return true;
      case 'authenticated':
        return isAuthenticated;
      case 'unauthenticated':
        return !isAuthenticated;
      case 'role':
        // User must be authenticated AND have at least one of the required roles
        if (!isAuthenticated) return false;
        if (requiredRoles.length === 0) return true; // No specific roles required, just auth
        return userRoles.some((r) => requiredRoles.includes(r));
      default:
        return true;
    }
  }

  /**
   * Get all roles for the current user
   */
  function getUserRoles(): string[] {
    if (!user) return [];
    const roles: string[] = [];
    if (user.role) roles.push(user.role);
    if (user.roles) roles.push(...user.roles);
    return roles;
  }

  // Check visibility once
  $: isVisible = checkVisibility();

  // Extract children from config for container-based components
  $: children = (config.children as ChildWidget[] | undefined) || [];

  // Get responsive values for container styling (returns desktop value for inline styles)
  function getResponsiveValue<T>(
    value: T | { mobile?: T; tablet?: T; desktop: T } | undefined,
    defaultValue: T
  ): T {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'object' && value !== null && 'desktop' in value) {
      return (value as { desktop: T }).desktop;
    }
    return value as T;
  }

  // Get value for a specific breakpoint from a responsive config
  function getBreakpointValue<T>(
    value: T | { mobile?: T; tablet?: T; desktop: T } | undefined,
    breakpoint: 'mobile' | 'tablet' | 'desktop',
    defaultValue: T
  ): T {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'object' && value !== null && 'desktop' in value) {
      const responsive = value as { mobile?: T; tablet?: T; desktop: T };
      return responsive[breakpoint] ?? responsive.desktop ?? defaultValue;
    }
    return value as T;
  }

  // Generate CSS custom properties for responsive layout values
  function generateResponsiveVars(): string {
    const gap = config.containerGap;
    const gapDesktop = getBreakpointValue(gap, 'desktop', 16);
    const gapTablet = getBreakpointValue(gap, 'tablet', gapDesktop);
    const gapMobile = getBreakpointValue(gap, 'mobile', gapTablet);

    const display = config.containerDisplay;
    const displayDesktop = getBreakpointValue(display, 'desktop', 'flex');
    const displayTablet = getBreakpointValue(display, 'tablet', displayDesktop);
    const displayMobile = getBreakpointValue(display, 'mobile', displayTablet);

    const flexDir = config.containerFlexDirection;
    const flexDirDesktop = getBreakpointValue(flexDir, 'desktop', 'row');
    const flexDirTablet = getBreakpointValue(flexDir, 'tablet', flexDirDesktop);
    const flexDirMobile = getBreakpointValue(flexDir, 'mobile', 'column');

    const gridCols = config.containerGridCols;
    const gridColsDesktop = getBreakpointValue(gridCols, 'desktop', 3);
    const gridColsTablet = getBreakpointValue(gridCols, 'tablet', 2);
    const gridColsMobile = getBreakpointValue(gridCols, 'mobile', 1);

    const minHeight = config.containerMinHeight;
    const minHeightDesktop = getBreakpointValue(minHeight, 'desktop', 'auto');
    const minHeightTablet = getBreakpointValue(minHeight, 'tablet', minHeightDesktop);
    const minHeightMobile = getBreakpointValue(minHeight, 'mobile', minHeightTablet);

    // Padding responsive values
    const padding = config.containerPadding;
    const paddingDesktop =
      padding?.desktop ||
      getBreakpointValue(padding, 'desktop', { top: 0, right: 0, bottom: 0, left: 0 });
    const paddingTablet = padding?.tablet || paddingDesktop;
    const paddingMobile = padding?.mobile || {
      top: paddingTablet.top,
      right: 16,
      bottom: paddingTablet.bottom,
      left: 16
    };

    return `
      --fcr-gap-desktop: ${gapDesktop}px;
      --fcr-gap-tablet: ${gapTablet}px;
      --fcr-gap-mobile: ${gapMobile}px;
      --fcr-display-desktop: ${displayDesktop};
      --fcr-display-tablet: ${displayTablet};
      --fcr-display-mobile: ${displayMobile};
      --fcr-flex-dir-desktop: ${flexDirDesktop};
      --fcr-flex-dir-tablet: ${flexDirTablet};
      --fcr-flex-dir-mobile: ${flexDirMobile};
      --fcr-grid-cols-desktop: ${gridColsDesktop};
      --fcr-grid-cols-tablet: ${gridColsTablet};
      --fcr-grid-cols-mobile: ${gridColsMobile};
      --fcr-min-height-desktop: ${typeof minHeightDesktop === 'number' ? minHeightDesktop + 'px' : minHeightDesktop};
      --fcr-min-height-tablet: ${typeof minHeightTablet === 'number' ? minHeightTablet + 'px' : minHeightTablet};
      --fcr-min-height-mobile: ${typeof minHeightMobile === 'number' ? minHeightMobile + 'px' : minHeightMobile};
      --fcr-padding-desktop: ${paddingDesktop.top}px ${paddingDesktop.right}px ${paddingDesktop.bottom}px ${paddingDesktop.left}px;
      --fcr-padding-tablet: ${paddingTablet.top}px ${paddingTablet.right}px ${paddingTablet.bottom}px ${paddingTablet.left}px;
      --fcr-padding-mobile: ${paddingMobile.top}px ${paddingMobile.right}px ${paddingMobile.bottom}px ${paddingMobile.left}px;
    `;
  }

  $: responsiveVars = generateResponsiveVars();

  // Helper to format grid template columns/rows
  function formatGridTemplate(
    value: string | number | undefined | null,
    defaultValue: string
  ): string {
    if (!value) return defaultValue;

    // Convert to string if it's a number
    const stringValue = String(value);

    // If it's a simple number (like "3"), convert to repeat syntax
    if (/^\d+$/.test(stringValue)) {
      return `repeat(${stringValue}, 1fr)`;
    }

    // If it already contains CSS units or keywords, use as-is
    return stringValue;
  }

  // Container styling
  $: containerPadding = config.containerPadding || {
    desktop: { top: 0, right: 0, bottom: 0, left: 0 }
  };
  $: containerMargin = config.containerMargin || {
    desktop: { top: 0, right: 0, bottom: 0, left: 0 }
  };
  $: rawContainerBackground = config.containerBackground || 'transparent';
  $: containerBackground = resolveThemeColor(
    rawContainerBackground,
    colorTheme,
    'transparent',
    true
  );
  $: containerBorderRadius = config.containerBorderRadius || 0;
  $: containerBorderWidth = getResponsiveValue(config.containerBorderWidth, 0);
  $: containerBorderStyle = config.containerBorderStyle || 'solid';
  $: containerBorderColor = config.containerBorderColor
    ? resolveThemeColor(config.containerBorderColor, colorTheme, 'var(--color-border)', true)
    : 'transparent';
  // Simple border style - always render, 0 width means no visible border
  $: borderStyles = `border: ${containerBorderWidth}px ${containerBorderStyle} ${containerBorderColor};`;
  $: containerMaxWidth = config.containerMaxWidth || '100%';
  $: _containerMinHeight = getResponsiveValue(config.containerMinHeight, 'auto');
  $: containerWidth = getResponsiveValue(config.containerWidth, '100%');
  $: _containerGap = getResponsiveValue(config.containerGap, 16);
  $: containerDisplay = getResponsiveValue(config.containerDisplay, 'flex');
  $: containerFlexDirection = getResponsiveValue(config.containerFlexDirection, 'row');
  $: containerJustifyContent = config.containerJustifyContent || 'flex-start';
  $: containerAlignItems = config.containerAlignItems || 'stretch';
  $: containerWrap = config.containerWrap || 'nowrap';
  // Grid-specific properties
  $: containerGridCols = getResponsiveValue(config.containerGridCols, 3);
  $: containerGridRows = getResponsiveValue(config.containerGridRows, undefined);
  $: containerGridAutoFlow = getResponsiveValue(config.containerGridAutoFlow, undefined);
  $: containerPlaceItems = config.containerPlaceItems;
  $: containerPlaceContent = config.containerPlaceContent;

  // Build grid-specific styles (kept for legacy non-responsive containers)
  $: _gridStyles =
    containerDisplay === 'grid'
      ? `
    grid-template-columns: ${formatGridTemplate(containerGridCols, 'repeat(3, 1fr)')};
    ${containerGridRows ? `grid-template-rows: ${formatGridTemplate(containerGridRows, 'auto')};` : ''}
    ${containerGridAutoFlow ? `grid-auto-flow: ${containerGridAutoFlow};` : ''}
    ${containerPlaceItems ? `place-items: ${containerPlaceItems};` : ''}
    ${containerPlaceContent ? `place-content: ${containerPlaceContent};` : ''}
  `
      : '';

  // Build flex-specific styles (kept for legacy non-responsive containers)
  $: _flexStyles =
    containerDisplay === 'flex'
      ? `
    flex-direction: ${containerFlexDirection};
    justify-content: ${containerJustifyContent};
    align-items: ${containerAlignItems};
    flex-wrap: ${containerWrap};
  `
      : '';

  $: _paddingDesktop = containerPadding.desktop || { top: 0, right: 0, bottom: 0, left: 0 };
  $: marginDesktop = containerMargin.desktop || { top: 0, right: 0, bottom: 0, left: 0 };

  // Position styling - get values from position prop (override) or config.position (responsive)
  // Handle legacy format where position might be a string instead of an object
  $: effectivePosition = position || (typeof config.position === 'string' ? null : config.position);
  $: legacyPositionType = typeof config.position === 'string' ? config.position : null;
  $: positionDesktop = effectivePosition?.desktop || {};
  $: positionType = positionDesktop.type || legacyPositionType || 'static';
  $: positionTop = positionDesktop.top;
  $: positionRight = positionDesktop.right;
  $: positionBottom = positionDesktop.bottom;
  $: positionLeft = positionDesktop.left;
  $: positionZIndex = positionDesktop.zIndex;

  // Build position style string
  $: positionStyle = (() => {
    const styles: string[] = [];
    if (positionType && positionType !== 'static') {
      styles.push(`position: ${positionType}`);
      if (positionTop) styles.push(`top: ${positionTop}`);
      if (positionRight) styles.push(`right: ${positionRight}`);
      if (positionBottom) styles.push(`bottom: ${positionBottom}`);
      if (positionLeft) styles.push(`left: ${positionLeft}`);
      if (positionZIndex !== undefined) styles.push(`z-index: ${positionZIndex}`);
    }
    return styles.length > 0 ? styles.join('; ') + ';' : '';
  })();

  // Check if we need a position wrapper
  $: needsPositionWrapper = positionType && positionType !== 'static';

  // Helper to check if a color value is effectively transparent
  function isTransparentColor(color: string): boolean {
    if (!color) return true;
    const lower = color.toLowerCase().trim();
    return (
      lower === 'transparent' ||
      lower === 'rgba(0, 0, 0, 0)' ||
      lower === 'rgba(0,0,0,0)' ||
      lower === 'hsla(0, 0%, 0%, 0)' ||
      lower === 'hsla(0,0%,0%,0)'
    );
  }

  // Advanced styling properties
  // Box Shadow
  function buildBoxShadow(shadow: ShadowConfig | ShadowConfig[] | undefined): string {
    if (!shadow) return '';
    const shadows = Array.isArray(shadow) ? shadow : [shadow];
    const shadowStrings = shadows
      .map((s) => {
        const inset = s.inset ? 'inset ' : '';
        const x = s.x ?? 0;
        const y = s.y ?? 0;
        const blur = s.blur ?? 0;
        const spread = s.spread ?? 0;
        const color = s.color
          ? resolveThemeColor(s.color, colorTheme, 'rgba(0,0,0,0.1)', true)
          : 'rgba(0,0,0,0.1)';
        return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
      })
      .filter(Boolean);
    return shadowStrings.length > 0 ? `box-shadow: ${shadowStrings.join(', ')};` : '';
  }

  // Transform
  function buildTransform(transform: TransformConfig | undefined): string {
    if (!transform) return '';
    const transforms: string[] = [];
    if (transform.translateX) transforms.push(`translateX(${transform.translateX})`);
    if (transform.translateY) transforms.push(`translateY(${transform.translateY})`);
    if (transform.translateZ) transforms.push(`translateZ(${transform.translateZ})`);
    if (transform.rotate !== undefined) transforms.push(`rotate(${transform.rotate}deg)`);
    if (transform.rotateX !== undefined) transforms.push(`rotateX(${transform.rotateX}deg)`);
    if (transform.rotateY !== undefined) transforms.push(`rotateY(${transform.rotateY}deg)`);
    if (transform.rotateZ !== undefined) transforms.push(`rotateZ(${transform.rotateZ}deg)`);
    if (transform.scale !== undefined) transforms.push(`scale(${transform.scale})`);
    if (transform.scaleX !== undefined) transforms.push(`scaleX(${transform.scaleX})`);
    if (transform.scaleY !== undefined) transforms.push(`scaleY(${transform.scaleY})`);
    if (transform.skewX !== undefined) transforms.push(`skewX(${transform.skewX}deg)`);
    if (transform.skewY !== undefined) transforms.push(`skewY(${transform.skewY}deg)`);
    return transforms.length > 0 ? `transform: ${transforms.join(' ')};` : '';
  }

  // Filter
  function buildFilter(filter: FilterConfig | undefined): string {
    if (!filter) return '';
    const filters: string[] = [];
    if (filter.blur !== undefined) filters.push(`blur(${filter.blur}px)`);
    if (filter.brightness !== undefined) filters.push(`brightness(${filter.brightness}%)`);
    if (filter.contrast !== undefined) filters.push(`contrast(${filter.contrast}%)`);
    if (filter.grayscale !== undefined) filters.push(`grayscale(${filter.grayscale}%)`);
    if (filter.hueRotate !== undefined) filters.push(`hue-rotate(${filter.hueRotate}deg)`);
    if (filter.invert !== undefined) filters.push(`invert(${filter.invert}%)`);
    if (filter.opacity !== undefined) filters.push(`opacity(${filter.opacity}%)`);
    if (filter.saturate !== undefined) filters.push(`saturate(${filter.saturate}%)`);
    if (filter.sepia !== undefined) filters.push(`sepia(${filter.sepia}%)`);
    return filters.length > 0 ? `filter: ${filters.join(' ')};` : '';
  }

  // Child layout styles - for components inside containers
  function getChildLayoutStyles(
    childConfig: ComponentConfig,
    parentDisplay: string = 'flex',
    parentFlexDirection: string = 'row',
    _parentAlignItems: string = 'stretch'
  ): string {
    let styles = '';

    // For flex-row containers, let children size to their content
    // For grid or flex-column containers, children should take full width
    const isFlexRow = parentDisplay === 'flex' && parentFlexDirection === 'row';
    if (!isFlexRow) {
      styles += 'width: 100%;';
    }

    // Flex properties
    const flexGrow = getResponsiveValue(childConfig.layoutFlexGrow, undefined);
    const flexShrink = getResponsiveValue(childConfig.layoutFlexShrink, undefined);
    const flexBasis = getResponsiveValue(childConfig.layoutFlexBasis, undefined);
    const alignSelf = getResponsiveValue(childConfig.layoutAlignSelf, undefined);

    if (flexGrow !== undefined) styles += `flex-grow: ${flexGrow};`;
    if (flexShrink !== undefined) styles += `flex-shrink: ${flexShrink};`;
    if (flexBasis !== undefined && flexBasis !== 'auto') styles += `flex-basis: ${flexBasis};`;
    if (alignSelf !== undefined && alignSelf !== 'auto') styles += `align-self: ${alignSelf};`;

    // Grid properties
    const gridColumn = getResponsiveValue(childConfig.layoutGridColumn, undefined);
    const gridRow = getResponsiveValue(childConfig.layoutGridRow, undefined);
    const placeSelf = getResponsiveValue(childConfig.layoutPlaceSelf, undefined);
    const justifySelf = getResponsiveValue(childConfig.layoutJustifySelf, undefined);

    if (gridColumn !== undefined && gridColumn !== 'auto') styles += `grid-column: ${gridColumn};`;
    if (gridRow !== undefined && gridRow !== 'auto') styles += `grid-row: ${gridRow};`;
    if (placeSelf !== undefined && placeSelf !== 'auto') styles += `place-self: ${placeSelf};`;
    if (justifySelf !== undefined && justifySelf !== 'stretch')
      styles += `justify-self: ${justifySelf};`;

    // Order (works in both flex and grid)
    const order = getResponsiveValue(childConfig.layoutOrder, undefined);
    if (order !== undefined && order !== 0) styles += `order: ${order};`;

    // Size constraints
    const width = getResponsiveValue(childConfig.layoutWidth, undefined);
    const height = getResponsiveValue(childConfig.layoutHeight, undefined);
    const minWidth = getResponsiveValue(childConfig.layoutMinWidth, undefined);
    const maxWidth = getResponsiveValue(childConfig.layoutMaxWidth, undefined);
    const minHeight = getResponsiveValue(childConfig.layoutMinHeight, undefined);
    const maxHeight = getResponsiveValue(childConfig.layoutMaxHeight, undefined);

    if (width !== undefined && width !== 'auto') styles += `width: ${width};`;
    if (height !== undefined && height !== 'auto') styles += `height: ${height};`;
    if (minWidth !== undefined && minWidth !== 'auto') styles += `min-width: ${minWidth};`;
    if (maxWidth !== undefined && maxWidth !== 'none') styles += `max-width: ${maxWidth};`;
    if (minHeight !== undefined && minHeight !== 'auto') styles += `min-height: ${minHeight};`;
    if (maxHeight !== undefined && maxHeight !== 'none') styles += `max-height: ${maxHeight};`;

    return styles;
  }

  // Build advanced styles string
  $: boxShadowStyle = buildBoxShadow(getResponsiveValue(config.boxShadow, undefined));
  $: transformStyle = buildTransform(getResponsiveValue(config.transform, undefined));
  $: filterStyle = buildFilter(getResponsiveValue(config.filter, undefined));
  $: backdropFilterStyle = (() => {
    const backdrop = getResponsiveValue(config.backdropFilter, undefined);
    if (!backdrop) return '';
    const filter = buildFilter(backdrop);
    return filter ? filter.replace('filter:', 'backdrop-filter:') : '';
  })();
  $: opacityStyle =
    config.opacity !== undefined ? `opacity: ${getResponsiveValue(config.opacity, 1)};` : '';
  $: aspectRatioStyle = config.aspectRatio
    ? `aspect-ratio: ${getResponsiveValue(config.aspectRatio, 'auto')};`
    : '';
  $: mixBlendModeStyle = config.mixBlendMode
    ? `mix-blend-mode: ${getResponsiveValue(config.mixBlendMode, 'normal')};`
    : '';

  // Component-level background color (main property in builder's Style tab)
  // Falls back to containerBackground for containers, or transparent for other components
  $: rawBackgroundColor = config.backgroundColor || config.containerBackground || '';
  $: componentBackgroundColor = rawBackgroundColor
    ? resolveThemeColor(rawBackgroundColor, colorTheme, 'transparent', true)
    : '';
  // Don't add background-color when it's transparent (let CSS/parent handle it)
  $: backgroundColorStyle =
    componentBackgroundColor && !isTransparentColor(componentBackgroundColor)
      ? `background-color: ${componentBackgroundColor};`
      : '';

  // Background image support
  $: backgroundImageStyle = config.backgroundImage
    ? `background-image: url('${config.backgroundImage}'); background-size: cover; background-position: center;`
    : '';

  // Combine all advanced styles (now includes background)
  $: advancedStyles =
    `${boxShadowStyle} ${transformStyle} ${filterStyle} ${backdropFilterStyle} ${opacityStyle} ${aspectRatioStyle} ${mixBlendModeStyle} ${backgroundColorStyle} ${backgroundImageStyle}`.trim();

  // Check if this is a container-type component (composite components also render children)
  $: isContainer =
    type === 'container' || type === 'row' || type === 'flex' || type === 'composite';

  // Check if this component type uses container-based rendering with children
  $: usesContainerChildren =
    (type === 'navbar' ||
      type === 'footer' ||
      type === 'hero' ||
      type === 'features' ||
      type === 'pricing') &&
    children.length > 0;

  // Generate inline theme styles for CSS variables (same as admin builder)
  $: themeColors = getThemeColors(colorTheme);
  $: _themeStyles = generateThemeStyles(themeColors);
</script>

{#if isVisible}
  {#if usesContainerChildren}
    <!-- Container-based navbar/footer/hero/features with custom children -->
    <div
      class="frontend-container frontend-responsive-container {type}-container"
      id={config.anchorName || undefined}
      style="
        {responsiveVars}
        {positionStyle}
        background: {containerBackground};
        {advancedStyles}
        justify-content: {containerJustifyContent};
        align-items: {containerAlignItems};
        flex-wrap: {containerWrap};
        max-width: {containerMaxWidth};
        width: {containerWidth};
        border-radius: {containerBorderRadius}px;
        {borderStyles}
        margin: {marginDesktop.top}px auto {marginDesktop.bottom}px;
        box-sizing: border-box;
      "
    >
      {#each children as child, i (child.id || i)}
        <div
          class="child-wrapper"
          style={getChildLayoutStyles(
            child.config || {},
            containerDisplay,
            containerFlexDirection,
            containerAlignItems
          )}
        >
          <svelte:self
            type={child.type}
            config={child.config || child}
            {colorTheme}
            {siteContext}
            {user}
          />
        </div>
      {/each}
    </div>
  {:else if isContainer}
    <!-- Generic container with children -->
    <div
      class="frontend-container frontend-responsive-container"
      id={config.anchorName || undefined}
      style="
        {responsiveVars}
        {positionStyle}
        background: {containerBackground};
        {advancedStyles}
        justify-content: {containerJustifyContent};
        align-items: {containerAlignItems};
        flex-wrap: {containerWrap};
        max-width: {containerMaxWidth};
        width: {containerWidth};
        border-radius: {containerBorderRadius}px;
        {borderStyles}
        margin: {marginDesktop.top}px auto {marginDesktop.bottom}px;
        box-sizing: border-box;
      "
    >
      {#if children.length > 0}
        {#each children as child, i (child.id || i)}
          <div
            class="child-wrapper"
            style={getChildLayoutStyles(
              child.config || {},
              containerDisplay,
              containerFlexDirection,
              containerAlignItems
            )}
          >
            <svelte:self
              type={child.type}
              config={child.config || child}
              {colorTheme}
              {siteContext}
              {user}
            />
          </div>
        {/each}
      {/if}
    </div>
  {:else if type === 'navbar' && !usesContainerChildren}
    <!-- Built-in navbar (no custom children) -->
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <NavBar {config} {onLogout} {siteContext} user={user ?? undefined} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <NavBar {config} {onLogout} {siteContext} user={user ?? undefined} />
      </div>
    {:else}
      <NavBar {config} {onLogout} {siteContext} user={user ?? undefined} />
    {/if}
  {:else if type === 'footer' && !usesContainerChildren}
    <!-- Built-in footer (no custom children) -->
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <Footer {config} {siteContext} user={user ?? undefined} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <Footer {config} {siteContext} user={user ?? undefined} />
      </div>
    {:else}
      <Footer {config} {siteContext} user={user ?? undefined} />
    {/if}
  {:else if type === 'text'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <TextComponent {config} {siteContext} {user} {colorTheme} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <TextComponent {config} {siteContext} {user} {colorTheme} />
      </div>
    {:else}
      <TextComponent {config} {siteContext} {user} {colorTheme} />
    {/if}
  {:else if type === 'image'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <ImageComponent {config} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <ImageComponent {config} />
      </div>
    {:else}
      <ImageComponent {config} />
    {/if}
  {:else if type === 'icon'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <IconComponent {config} {colorTheme} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <IconComponent {config} {colorTheme} />
      </div>
    {:else}
      <IconComponent {config} {colorTheme} />
    {/if}
  {:else if type === 'single_product'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <SingleProductComponent {config} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <SingleProductComponent {config} />
      </div>
    {:else}
      <SingleProductComponent {config} />
    {/if}
  {:else if type === 'product_list'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <ProductListComponent {config} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <ProductListComponent {config} />
      </div>
    {:else}
      <ProductListComponent {config} />
    {/if}
  {:else if type === 'hero' && !usesContainerChildren}
    <!-- Legacy hero format (no container children) - wrap with container styles for border support -->
    <div
      class="frontend-container hero-container"
      style="
        {positionStyle}
        {advancedStyles}
        {borderStyles}
        border-radius: {containerBorderRadius}px;
        box-sizing: border-box;
      "
    >
      <HeroComponent {config} {colorTheme} {siteContext} {user} />
    </div>
  {:else if type === 'button'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <ButtonComponent {config} {siteContext} {user} {colorTheme} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <ButtonComponent {config} {siteContext} {user} {colorTheme} />
      </div>
    {:else}
      <ButtonComponent {config} {siteContext} {user} {colorTheme} />
    {/if}
  {:else if type === 'spacer'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <SpacerComponent {config} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <SpacerComponent {config} />
      </div>
    {:else}
      <SpacerComponent {config} />
    {/if}
  {:else if type === 'divider'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <DividerComponent {config} {colorTheme} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <DividerComponent {config} {colorTheme} />
      </div>
    {:else}
      <DividerComponent {config} {colorTheme} />
    {/if}
  {:else if type === 'columns'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <ColumnsComponent {config} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <ColumnsComponent {config} />
      </div>
    {:else}
      <ColumnsComponent {config} />
    {/if}
  {:else if type === 'heading'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <HeadingComponent {config} {colorTheme} {siteContext} {user} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <HeadingComponent {config} {colorTheme} {siteContext} {user} />
      </div>
    {:else}
      <HeadingComponent {config} {colorTheme} {siteContext} {user} />
    {/if}
  {:else if type === 'features' && !usesContainerChildren}
    <!-- Legacy features format (config.features array) - wrap with container styles for border support -->
    <div
      class="frontend-container features-container"
      style="
        {positionStyle}
        {advancedStyles}
        {borderStyles}
        border-radius: {containerBorderRadius}px;
        box-sizing: border-box;
      "
    >
      <FeaturesComponent {config} {colorTheme} {siteContext} {user} />
    </div>
  {:else if type === 'pricing' && !usesContainerChildren}
    <!-- Legacy pricing without container children -->
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <PricingComponent {config} {colorTheme} {siteContext} {user} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <PricingComponent {config} {colorTheme} {siteContext} {user} />
      </div>
    {:else}
      <PricingComponent {config} {colorTheme} {siteContext} {user} />
    {/if}
  {:else if type === 'cta'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <CTAComponent {config} {colorTheme} {siteContext} {user} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <CTAComponent {config} {colorTheme} {siteContext} {user} />
      </div>
    {:else}
      <CTAComponent {config} {colorTheme} {siteContext} {user} />
    {/if}
  {:else if type === 'dropdown'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <DropdownComponent {config} {siteContext} {user} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <DropdownComponent {config} {siteContext} {user} />
      </div>
    {:else}
      <DropdownComponent {config} {siteContext} {user} />
    {/if}
  {:else if type === 'theme_toggle'}
    {#if needsPositionWrapper}
      <div class="position-wrapper" style="{positionStyle} {advancedStyles}">
        <ThemeToggleComponent {config} />
      </div>
    {:else if advancedStyles}
      <div class="advanced-wrapper" style={advancedStyles}>
        <ThemeToggleComponent {config} />
      </div>
    {:else}
      <ThemeToggleComponent {config} />
    {/if}
  {:else}
    <!-- Unknown component type - render as placeholder -->
    <div class="unknown-component">
      Unknown component type: {type}
    </div>
  {/if}
{/if}

<style>
  .frontend-container {
    width: 100%;
    box-sizing: border-box;
  }

  /* Responsive container using CSS custom properties */
  .frontend-responsive-container {
    /* Desktop (default - mobile-first reversed to desktop-first for inline override) */
    display: var(--fcr-display-desktop, flex);
    flex-direction: var(--fcr-flex-dir-desktop, row);
    gap: var(--fcr-gap-desktop, 16px);
    min-height: var(--fcr-min-height-desktop, auto);
    padding: var(--fcr-padding-desktop, 0);
  }

  /* Grid display mode for responsive container */
  .frontend-responsive-container[style*='--fcr-display-desktop: grid'] {
    display: grid;
    grid-template-columns: repeat(var(--fcr-grid-cols-desktop, 3), 1fr);
  }

  /* Tablet breakpoint (max-width: 1024px) */
  @media (max-width: 1024px) {
    .frontend-responsive-container {
      display: var(--fcr-display-tablet, var(--fcr-display-desktop, flex));
      flex-direction: var(--fcr-flex-dir-tablet, var(--fcr-flex-dir-desktop, row));
      gap: var(--fcr-gap-tablet, var(--fcr-gap-desktop, 16px));
      min-height: var(--fcr-min-height-tablet, var(--fcr-min-height-desktop, auto));
      padding: var(--fcr-padding-tablet, var(--fcr-padding-desktop, 0));
    }

    .frontend-responsive-container[style*='--fcr-display-tablet: grid'],
    .frontend-responsive-container[style*='--fcr-display-desktop: grid'] {
      grid-template-columns: repeat(var(--fcr-grid-cols-tablet, 2), 1fr);
    }
  }

  /* Mobile breakpoint (max-width: 768px) */
  @media (max-width: 768px) {
    .frontend-responsive-container {
      display: var(--fcr-display-mobile, var(--fcr-display-tablet, flex));
      flex-direction: var(--fcr-flex-dir-mobile, column);
      gap: var(--fcr-gap-mobile, var(--fcr-gap-tablet, 16px));
      min-height: var(--fcr-min-height-mobile, var(--fcr-min-height-tablet, auto));
      padding: var(--fcr-padding-mobile, var(--fcr-padding-tablet, 16px));
    }

    .frontend-responsive-container[style*='--fcr-display-mobile: grid'],
    .frontend-responsive-container[style*='--fcr-display-tablet: grid'],
    .frontend-responsive-container[style*='--fcr-display-desktop: grid'] {
      grid-template-columns: repeat(var(--fcr-grid-cols-mobile, 1), 1fr);
    }
  }

  .position-wrapper {
    width: 100%;
    box-sizing: border-box;
  }

  .advanced-wrapper {
    width: 100%;
    box-sizing: border-box;
  }

  .child-wrapper {
    box-sizing: border-box;
  }

  .unknown-component {
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 4px;
    color: #b91c1c;
    text-align: center;
  }
</style>
