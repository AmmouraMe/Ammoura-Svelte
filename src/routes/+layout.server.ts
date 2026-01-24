import { getDB } from '$lib/server/db/connection';
import * as colorThemes from '$lib/server/db/color-themes';
import { getGeneralSettings } from '$lib/server/db/site-settings';
import { getDefaultLayout, getLayoutComponents } from '$lib/server/db/layouts';
import { getComponent, getGlobalComponentByName } from '$lib/server/db/components';
import { createSiteContext, createDefaultSiteContext } from '$lib/utils/templateSubstitution';
import type { LayoutServerLoad } from './$types';
import type { WidgetConfig, PositionConfig, ResponsiveValue } from '$lib/types/pages';

// Navbar config with component resolved and position settings from layout
export interface NavbarLayoutData {
  type: 'navbar';
  config: WidgetConfig;
  position?: ResponsiveValue<PositionConfig>;
}

// Footer config with component resolved and position settings from layout
export interface FooterLayoutData {
  type: 'footer';
  config: WidgetConfig;
  position?: ResponsiveValue<PositionConfig>;
}

// Layout data passed to the frontend
export interface LayoutData {
  navbar: NavbarLayoutData | null;
  footer: FooterLayoutData | null;
}

export const load: LayoutServerLoad = async ({ platform, locals }) => {
  // Default navbar config - uses Container-based architecture with children widgets
  // This matches the Navigation Bar component designed in the builder.
  // Note: The full children structure is stored in the database migration (0049_update_navbar_from_builder.sql)
  // Here we provide a simplified fallback for when the database is not available.
  const defaultNavbarConfig: WidgetConfig = {
    containerPadding: {
      desktop: { top: 16, right: 24, bottom: 16, left: 24 },
      tablet: { top: 12, right: 20, bottom: 12, left: 20 },
      mobile: { top: 12, right: 16, bottom: 12, left: 16 }
    },
    containerMargin: {
      desktop: { top: 0, right: 0, bottom: 0, left: 0 },
      tablet: { top: 0, right: 0, bottom: 0, left: 0 },
      mobile: { top: 0, right: 0, bottom: 0, left: 0 }
    },
    containerBackground: 'theme:secondary',
    containerBorderRadius: 0,
    containerMaxWidth: '1400px',
    containerJustifyContent: 'space-between',
    containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
    containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
    containerAlignItems: 'stretch',
    containerWrap: 'nowrap',
    containerGap: { desktop: 16, tablet: 16, mobile: 16 },
    containerWidth: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
    containerGridCols: { desktop: 3, tablet: 2, mobile: 1 },
    containerGridAutoFlow: { desktop: 'row', tablet: 'row', mobile: 'row' },
    visibilityRule: 'always',
    sticky: false,
    // Children are simplified for the fallback config - full structure is in database
    children: []
  };

  // If platform is not available (development without D1), return defaults
  if (!platform?.env?.DB) {
    return {
      themeColorsLight: null,
      themeColorsDark: null,
      systemLightThemeId: 'vibrant',
      systemDarkThemeId: 'midnight',
      currentUser: locals.currentUser || null,
      storeName: 'Hermes eCommerce',
      layoutData: {
        navbar: { type: 'navbar' as const, config: defaultNavbarConfig, position: undefined },
        footer: null
      }
    };
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    // Get general settings, system default theme IDs, and layout data
    const [generalSettings, systemLightThemeId, systemDarkThemeId, defaultLayout] =
      await Promise.all([
        getGeneralSettings(db, siteId),
        colorThemes.getThemePreference(db, siteId, 'system-light-theme'),
        colorThemes.getThemePreference(db, siteId, 'system-dark-theme'),
        getDefaultLayout(db, siteId)
      ]);

    // Fetch all themes
    const allThemes = await colorThemes.getAllColorThemes(db, siteId);

    // Get the system default themes (or fallback to vibrant/midnight)
    const lightTheme = allThemes.find((t) => t.id === (systemLightThemeId || 'vibrant'));
    const darkTheme = allThemes.find((t) => t.id === (systemDarkThemeId || 'midnight'));

    // Map color_themes colors to the old SiteThemeColors format for compatibility
    const mapThemeColors = (theme: { colors: Record<string, string> } | null | undefined) => {
      if (!theme) return null;
      const colors = theme.colors;
      return {
        primary: colors.primary,
        primaryHover: colors.primary, // Use same as primary
        primaryLight: colors.accent,
        secondary: colors.secondary,
        secondaryHover: colors.secondary,
        bgPrimary: colors.background,
        bgSecondary: colors.surface,
        bgTertiary: colors.surface,
        textPrimary: colors.text,
        textSecondary: colors.textSecondary,
        borderPrimary: colors.border,
        borderSecondary: colors.border
      };
    };

    // Load layout widgets if we have a default layout
    const layoutData: LayoutData = { navbar: null, footer: null };
    if (defaultLayout) {
      const layoutWidgets = await getLayoutComponents(db, defaultLayout.id);

      // Process layout widgets to resolve component references
      for (const widget of layoutWidgets) {
        // Extract position settings from the layout widget (if set)
        const widgetPosition = widget.config?.position as
          | ResponsiveValue<PositionConfig>
          | undefined;

        // Handle component_ref widgets that reference navbar or footer components
        if (widget.type === 'component_ref' && widget.config?.componentId) {
          const component = await getComponent(db, siteId, widget.config.componentId as number);
          if (component) {
            const config: WidgetConfig = { ...component.config };

            if (component.type === 'navbar') {
              // Use site title from settings if logo text is default
              if (config.logo && config.logo.text === 'Store') {
                config.logo.text = generalSettings.storeName || 'Hermes eCommerce';
              }
              layoutData.navbar = { type: 'navbar', config, position: widgetPosition };
            } else if (component.type === 'footer') {
              layoutData.footer = { type: 'footer', config, position: widgetPosition };
            }
          }
        }
        // Handle direct navbar/footer widgets (legacy or with componentId)
        else if (widget.type === 'navbar' || widget.type === 'footer') {
          let config: WidgetConfig = widget.config || {};

          // If the widget references a component, load the component's config
          if (config.componentId) {
            const component = await getComponent(db, siteId, config.componentId as number);
            if (component) {
              config = { ...component.config, ...config };
              // Remove componentId from the final config since we've resolved it
              delete config.componentId;
            }
          }

          if (widget.type === 'navbar') {
            // Use site title from settings if logo text is default
            if (config.logo && config.logo.text === 'Store') {
              config.logo.text = generalSettings.storeName || 'Hermes eCommerce';
            }
            layoutData.navbar = { type: 'navbar', config, position: widgetPosition };
          } else if (widget.type === 'footer') {
            layoutData.footer = { type: 'footer', config, position: widgetPosition };
          }
        }
      }
    }

    // If no navbar in layout, try to load the global "Navigation Bar" component from the builder
    if (!layoutData.navbar) {
      const navbarComponent = await getGlobalComponentByName(db, 'Navigation Bar');
      if (navbarComponent) {
        // Use the component's config (cast to WidgetConfig for type safety)
        const config: WidgetConfig = { ...navbarComponent.config };
        // Update site title if logo text is default
        if (
          config.logo &&
          (config.logo.text === 'Store' || config.logo.text === 'Hermes eCommerce')
        ) {
          config.logo.text = generalSettings.storeName || 'Hermes eCommerce';
        }
        layoutData.navbar = { type: 'navbar', config };
      } else {
        // Fall back to hardcoded default if component doesn't exist
        const navbarWithStoreName = {
          ...defaultNavbarConfig,
          logo: {
            ...defaultNavbarConfig.logo,
            text: generalSettings.storeName || 'Hermes eCommerce'
          }
        };
        layoutData.navbar = { type: 'navbar', config: navbarWithStoreName };
      }
    }

    return {
      themeColorsLight: mapThemeColors(lightTheme as never),
      themeColorsDark: mapThemeColors(darkTheme as never),
      systemLightThemeId: systemLightThemeId || 'vibrant',
      systemDarkThemeId: systemDarkThemeId || 'midnight',
      currentUser: locals.currentUser || null,
      storeName: generalSettings.storeName || 'Hermes eCommerce',
      siteContext: createSiteContext(generalSettings),
      layoutData
    };
  } catch (error) {
    console.error('Error loading theme colors:', error);
    return {
      themeColorsLight: null,
      themeColorsDark: null,
      systemLightThemeId: 'vibrant',
      systemDarkThemeId: 'midnight',
      currentUser: locals.currentUser || null,
      storeName: 'Hermes eCommerce',
      siteContext: createDefaultSiteContext(),
      layoutData: {
        navbar: { type: 'navbar' as const, config: defaultNavbarConfig, position: undefined },
        footer: null
      }
    };
  }
};
