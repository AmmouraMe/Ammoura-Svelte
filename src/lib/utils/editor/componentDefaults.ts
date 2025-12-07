import type { ComponentType, ComponentConfig } from '$lib/types/pages';

export function getDefaultConfig(type: ComponentType): ComponentConfig {
  switch (type) {
    case 'text':
      return { text: 'Enter your text here', alignment: 'left' };

    case 'heading':
      return {
        heading: 'Heading Text',
        level: 2,
        textColor: 'theme:text'
      };

    case 'image':
      return { src: '', alt: '', imageWidth: '100%', imageHeight: 'auto' };

    case 'hero':
      return {
        title: 'Hero Title',
        subtitle: 'Hero subtitle text',
        backgroundColor: 'theme:primary',
        backgroundImage: '',
        heroHeight: { desktop: '500px', tablet: '400px', mobile: '300px' },
        contentAlign: 'center',
        overlay: false,
        overlayOpacity: 50,
        ctaText: 'Get Started',
        ctaLink: '#',
        ctaBackgroundColor: 'theme:surface',
        ctaTextColor: 'theme:primary',
        ctaFontSize: '16px',
        ctaFontWeight: '600',
        secondaryCtaText: '',
        secondaryCtaLink: '#',
        secondaryCtaBackgroundColor: 'transparent',
        secondaryCtaTextColor: 'theme:text',
        secondaryCtaBorderColor: 'theme:border',
        secondaryCtaFontSize: '16px',
        secondaryCtaFontWeight: '600'
      };

    case 'button':
      return {
        label: 'Click Here',
        url: '#',
        variant: 'primary',
        size: 'medium',
        fullWidth: { desktop: false, tablet: false, mobile: true }
      };

    case 'spacer':
      return { space: { desktop: 40, tablet: 30, mobile: 20 } };

    case 'divider':
      return {
        thickness: 1,
        dividerColor: 'theme:border',
        dividerStyle: 'solid',
        spacing: { desktop: 20, tablet: 15, mobile: 10 }
      };

    case 'columns':
      return {
        columnCount: { desktop: 2, tablet: 2, mobile: 1 },
        gap: { desktop: 20 },
        verticalAlign: 'stretch'
      };

    case 'single_product':
      return {
        productId: '',
        layout: 'card',
        showPrice: true,
        showDescription: true
      };

    case 'product_list':
      return {
        category: '',
        limit: 6,
        sortBy: 'created_at',
        sortOrder: 'desc',
        columns: { desktop: 3, tablet: 2, mobile: 1 }
      };

    case 'features':
      return {
        title: 'Features',
        subtitle: 'Why choose us',
        features: [
          { icon: '🎯', title: 'Feature 1', description: 'Description of feature 1' },
          { icon: '✨', title: 'Feature 2', description: 'Description of feature 2' },
          { icon: '📦', title: 'Feature 3', description: 'Description of feature 3' }
        ],
        cardBackground: 'theme:surface',
        cardBorderColor: 'theme:border'
      };

    case 'pricing':
      return {
        title: 'Pricing',
        tagline: 'Simple and transparent pricing',
        subtitle: 'Choose the plan that works for you',
        pricingFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
        tiers: [
          { range: '$0 - $100', fee: '5%', description: 'Starter' },
          { range: '$100+', fee: '3%', description: 'Professional', highlight: true }
        ],
        ctaText: 'Get Started',
        ctaLink: '#',
        ctaNote: 'No credit card required'
      };

    case 'cta':
      return {
        title: 'Ready to Get Started?',
        subtitle: 'Join us today and start building',
        primaryCtaText: 'Get Started',
        primaryCtaLink: '#',
        secondaryCtaText: 'Learn More',
        secondaryCtaLink: '#',
        backgroundColor: 'theme:primary'
      };

    case 'container':
      return {
        containerPadding: {
          desktop: { top: 40, right: 40, bottom: 40, left: 40 },
          tablet: { top: 30, right: 30, bottom: 30, left: 30 },
          mobile: { top: 20, right: 20, bottom: 20, left: 20 }
        },
        containerMargin: {
          desktop: { top: 0, right: 0, bottom: 0, left: 0 },
          tablet: { top: 0, right: 0, bottom: 0, left: 0 },
          mobile: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        containerBackground: 'transparent',
        containerBorderRadius: 0,
        containerMaxWidth: '1200px',
        containerGap: { desktop: 16, tablet: 12, mobile: 8 },
        containerJustifyContent: 'flex-start',
        containerAlignItems: 'center',
        containerWrap: 'wrap',
        children: []
      };

    case 'navbar':
      // The navbar uses a container-based architecture with children widgets.
      // This config matches the Navigation Bar component designed in the builder.
      // Note: We use type assertion because the runtime config is more flexible
      // than the strict TypeScript types (e.g., 'auto' margins, simplified children)
      return {
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
        sticky: true,
        // Children are simplified for the default config - full structure is in database migration
        children: []
      };

    case 'footer':
      // Container-based architecture matching Navigation Bar pattern
      return {
        containerPadding: {
          desktop: { top: 0, right: 0, bottom: 0, left: 0 },
          tablet: { top: 0, right: 0, bottom: 0, left: 0 },
          mobile: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        containerMargin: {
          desktop: { top: 0, right: 0, bottom: 0, left: 0 },
          tablet: { top: 0, right: 0, bottom: 0, left: 0 },
          mobile: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        containerBackground: 'transparent',
        containerBorderRadius: 0,
        containerMaxWidth: '100%',
        containerDisplay: { desktop: 'block', tablet: 'block', mobile: 'block' },
        containerWidth: { desktop: '100%', tablet: '100%', mobile: '100%' },
        visibilityRule: 'always',
        // Footer-specific styling
        footerBackground: 'theme:surface',
        footerTextColor: 'theme:textSecondary',
        footerHoverColor: 'theme:primary',
        footerBorderColor: 'theme:border',
        footerShadow: false,
        copyright: '© 2025 ${site.name}. All rights reserved.',
        columnsPerRow: { desktop: 4, tablet: 2, mobile: 1 },
        // Logo and tagline
        logo: {
          text: '${site.name}',
          url: '/',
          image: '',
          imageHeight: 32
        },
        tagline: '${site.tagline}',
        // Link sections for multi-column footer
        linkSections: [
          {
            title: 'Company',
            links: [
              { text: 'About', url: '/about' },
              { text: 'Careers', url: '/careers' },
              { text: 'Blog', url: '/blog' }
            ]
          },
          {
            title: 'Support',
            links: [
              { text: 'Help Center', url: '/help' },
              { text: 'Contact Us', url: '/contact' },
              { text: 'FAQ', url: '/faq' }
            ]
          },
          {
            title: 'Legal',
            links: [
              { text: 'Privacy Policy', url: '/privacy' },
              { text: 'Terms of Service', url: '/terms' },
              { text: 'Cookie Policy', url: '/cookies' }
            ]
          }
        ],
        // Social links
        socialLinks: [
          { platform: 'facebook', url: '#' },
          { platform: 'twitter', url: '#' },
          { platform: 'instagram', url: '#' },
          { platform: 'linkedin', url: '#' }
        ],
        // Legacy footer links for backward compatibility
        footerLinks: [],
        // Children structure for Container-based composition
        children: [
          {
            id: 'main-container',
            type: 'container',
            config: {
              containerPadding: {
                desktop: { top: 48, right: 24, bottom: 48, left: 24 },
                tablet: { top: 40, right: 20, bottom: 40, left: 20 },
                mobile: { top: 32, right: 16, bottom: 32, left: 16 }
              },
              containerMargin: {
                desktop: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
                tablet: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
                mobile: { top: 0, right: 0, bottom: 0, left: 0 }
              },
              containerBackground: 'transparent',
              containerBorderRadius: 0,
              containerMaxWidth: '1200px',
              containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
              containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
              containerAlignItems: 'stretch',
              containerWrap: 'nowrap',
              containerGap: { desktop: 32, tablet: 24, mobile: 16 },
              children: [
                {
                  id: 'footer-content-row',
                  type: 'container',
                  config: {
                    containerPadding: {
                      desktop: { top: 0, right: 0, bottom: 0, left: 0 }
                    },
                    containerDisplay: { desktop: 'flex', tablet: 'grid', mobile: 'grid' },
                    containerGridCols: { desktop: 4, tablet: 2, mobile: 1 },
                    containerGap: { desktop: 32, tablet: 24, mobile: 24 },
                    containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
                    containerJustifyContent: 'space-around',
                    containerAlignItems: 'stretch',
                    containerWrap: 'nowrap',
                    containerMaxWidth: '1200px',
                    containerWidth: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
                    containerGridAutoFlow: { desktop: 'row', tablet: 'row', mobile: 'row' },
                    containerPlaceItems: '',
                    children: [
                      {
                        id: 'footer-about-btn',
                        type: 'button',
                        position: 0,
                        config: {
                          label: 'About',
                          url: '/about',
                          variant: 'text',
                          size: 'medium',
                          fullWidth: { desktop: false, tablet: false, mobile: true }
                        }
                      },
                      {
                        id: 'footer-products-btn',
                        type: 'button',
                        position: 1,
                        config: {
                          label: 'Products',
                          url: '/#products',
                          variant: 'text',
                          size: 'medium',
                          fullWidth: { desktop: false, tablet: false, mobile: true }
                        }
                      },
                      {
                        id: 'footer-admin-btn',
                        type: 'button',
                        position: 2,
                        config: {
                          label: 'Admin Dashboard',
                          url: '/admin/dashboard',
                          variant: 'text',
                          size: 'medium',
                          fullWidth: { desktop: false, tablet: false, mobile: true },
                          icon: 'Settings',
                          visibilityRule: 'role',
                          requiredRoles: ['admin']
                        }
                      },
                      {
                        id: 'footer-login-btn',
                        type: 'button',
                        position: 3,
                        config: {
                          label: 'Login',
                          url: '/auth/login',
                          variant: 'text',
                          size: 'medium',
                          fullWidth: { desktop: false, tablet: false, mobile: true },
                          icon: 'LogIn',
                          visibilityRule: 'unauthenticated'
                        }
                      }
                    ]
                  },
                  position: 0
                },
                {
                  id: 'footer-copyright',
                  type: 'text',
                  config: {
                    text: '© 2025 ${site.name}. All rights reserved.',
                    alignment: 'center',
                    fontSize: { desktop: 14, tablet: 14, mobile: 12 },
                    color: 'theme:textSecondary'
                  },
                  position: 1
                }
              ]
            },
            position: 0
          }
        ]
      };

    case 'composite':
      return {
        children: []
      };

    case 'dropdown':
      return {
        triggerLabel: 'Menu',
        triggerIcon: '',
        triggerVariant: 'text',
        showChevron: true,
        menuWidth: '200px',
        menuAlign: 'left',
        menuBackground: 'var(--color-bg-primary)',
        menuBorderRadius: 8,
        menuShadow: true,
        menuPadding: { top: 8, right: 8, bottom: 8, left: 8 },
        children: []
      };

    case 'theme_toggle':
      return {
        size: 'medium',
        toggleVariant: 'icon',
        alignment: 'left'
      };

    case 'yield':
      return {};

    default:
      return {};
  }
}

export function getComponentLabel(type: ComponentType): string {
  const labels: Record<ComponentType, string> = {
    text: 'Text Content',
    heading: 'Heading',
    image: 'Image',
    hero: 'Hero Section',
    button: 'Button',
    dropdown: 'Dropdown',
    spacer: 'Spacer',
    divider: 'Divider',
    columns: 'Columns',
    single_product: 'Single Product',
    product_list: 'Product List',
    features: 'Features Section',
    pricing: 'Pricing Section',
    cta: 'Call to Action',
    navbar: 'Navigation Bar',
    footer: 'Footer',
    theme_toggle: 'Theme Toggle',
    yield: 'Page Content (Yield)',
    container: 'Container',
    composite: 'Composite',
    component_ref: 'Component Reference'
  };
  return labels[type] || type;
}

// Deprecated: Use getComponentLabel instead
export const getWidgetLabel = getComponentLabel;

/**
 * Get the display label for a component, resolving component names for component_ref types.
 * @param component - The component to get the label for
 * @param components - Optional list of components to look up component names
 * @returns The display label for the component
 */
export function getComponentDisplayLabel(
  component: { type: ComponentType; config?: { componentId?: number } },
  components?: { id: number; name: string }[]
): string {
  // For component_ref types, try to resolve the component name
  if (component.type === 'component_ref' && component.config?.componentId && components) {
    const found = components.find((c) => c.id === component.config?.componentId);
    if (found) {
      return found.name;
    }
  }

  return getComponentLabel(component.type);
}

// Deprecated: Use getComponentDisplayLabel instead
export const getWidgetDisplayLabel = getComponentDisplayLabel;
