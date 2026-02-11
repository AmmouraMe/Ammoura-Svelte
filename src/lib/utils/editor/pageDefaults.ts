/**
 * Built-in page defaults - Source of truth for built-in page configurations
 *
 * This module defines the default content for built-in pages.
 * When updating default configurations, increment CURRENT_BUILTIN_VERSION
 * in builtin-seeding.ts and the seeding system will propagate changes.
 */

import type { ComponentType } from '$lib/types/pages';

/**
 * Widget definition for page defaults (simplified from PageComponent)
 * Does not include database fields like page_id, created_at, updated_at
 */
export interface WidgetDefinition {
  id: string;
  type: ComponentType;
  position: number;
  config: Record<string, unknown>;
}

/**
 * Built-in page definition
 */
export interface BuiltinPageDefinition {
  id: string; // Stable ID like 'builtin-home-page'
  title: string;
  slug: string;
  description?: string;
  getWidgets: () => WidgetDefinition[];
}

/**
 * Get the default Home page widgets configuration
 * This is the source of truth for the built-in Home page
 */
export function getHomePageWidgets(): WidgetDefinition[] {
  return [
    {
      id: 'home-hero',
      type: 'hero',
      position: 0,
      config: {
        backgroundColor: 'transparent',
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
        containerMinHeight: { desktop: '600px', tablet: '500px', mobile: '450px' },
        containerDisplay: { desktop: 'block', tablet: 'block', mobile: 'block' },
        containerWidth: { desktop: '100%', tablet: '100%', mobile: '100%' },
        visibilityRule: 'always',
        children: [
          {
            id: 'hero-main-container',
            type: 'container',
            position: 0,
            config: {
              containerPadding: {
                desktop: { top: 80, right: 24, bottom: 80, left: 24 },
                tablet: { top: 60, right: 20, bottom: 60, left: 20 },
                mobile: { top: 48, right: 16, bottom: 48, left: 16 }
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
              containerAlignItems: 'center',
              containerJustifyContent: 'center',
              containerWrap: 'nowrap',
              containerGap: { desktop: 24, tablet: 20, mobile: 16 },
              children: [
                {
                  id: 'hero-badge',
                  type: 'button',
                  position: 0,
                  config: {
                    label: '✨ Start Selling Online Today',
                    url: '#',
                    variant: 'outline',
                    size: 'small',
                    fullWidth: { desktop: false, tablet: false, mobile: false },
                    buttonAlign: 'center',
                    borderRadius: 999,
                    backgroundColor: 'transparent',
                    textColor: 'theme:text',
                    borderColor: 'theme:border',
                    padding: { desktop: { top: 8, right: 20, bottom: 8, left: 20 } },
                    fontSize: { desktop: 14, tablet: 13, mobile: 12 }
                  }
                },
                {
                  id: 'hero-title-container',
                  type: 'container',
                  position: 1,
                  config: {
                    containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                    containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
                    containerAlignItems: 'center',
                    containerJustifyContent: 'center',
                    containerGap: { desktop: 12, tablet: 10, mobile: 4 },
                    containerWrap: 'wrap',
                    children: [
                      {
                        id: 'hero-title-part1',
                        type: 'text',
                        position: 0,
                        config: {
                          text: 'Create Your Own',
                          alignment: 'center',
                          fontSize: { desktop: 56, tablet: 42, mobile: 32 },
                          textColor: 'theme:text',
                          typography: { fontWeight: 'bold', lineHeight: 1.1 }
                        }
                      },
                      {
                        id: 'hero-title-part2',
                        type: 'text',
                        position: 1,
                        config: {
                          text: 'Online Store',
                          alignment: 'center',
                          fontSize: { desktop: 56, tablet: 42, mobile: 32 },
                          textColor: 'theme:accent',
                          typography: { fontWeight: 'bold', lineHeight: 1.1 }
                        }
                      }
                    ]
                  }
                },
                {
                  id: 'hero-subtitle-container',
                  type: 'container',
                  position: 2,
                  config: {
                    containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                    containerFlexDirection: {
                      desktop: 'column',
                      tablet: 'column',
                      mobile: 'column'
                    },
                    containerAlignItems: 'center',
                    containerGap: { desktop: 8, tablet: 6, mobile: 4 },
                    children: [
                      {
                        id: 'hero-subtitle-1',
                        type: 'text',
                        position: 0,
                        config: {
                          text: 'Everything you need to start selling products online.',
                          alignment: 'center',
                          fontSize: { desktop: 20, tablet: 18, mobile: 16 },
                          textColor: 'theme:textSecondary',
                          typography: { lineHeight: 1.6 }
                        }
                      },
                      {
                        id: 'hero-subtitle-2',
                        type: 'text',
                        position: 1,
                        config: {
                          text: 'Simple, beautiful, and ready for your business.',
                          alignment: 'center',
                          fontSize: { desktop: 20, tablet: 18, mobile: 16 },
                          textColor: 'theme:accent',
                          typography: { fontWeight: '600', lineHeight: 1.6 }
                        }
                      }
                    ]
                  }
                },
                {
                  id: 'hero-actions',
                  type: 'container',
                  position: 3,
                  config: {
                    containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                    containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
                    containerAlignItems: 'center',
                    containerJustifyContent: 'center',
                    containerGap: { desktop: 16, tablet: 12, mobile: 12 },
                    containerMargin: { desktop: { top: 16, right: 0, bottom: 0, left: 0 } },
                    children: [
                      {
                        id: 'hero-btn-primary',
                        type: 'button',
                        position: 0,
                        config: {
                          label: 'See Example Store',
                          url: '#products',
                          variant: 'primary',
                          size: 'large',
                          fullWidth: { desktop: false, tablet: false, mobile: true },
                          backgroundColor: 'theme:accent',
                          textColor: 'theme:text'
                        }
                      },
                      {
                        id: 'hero-btn-secondary',
                        type: 'button',
                        position: 1,
                        config: {
                          label: 'Start Your Store',
                          url: '/auth/login',
                          variant: 'outline',
                          size: 'large',
                          fullWidth: { desktop: false, tablet: false, mobile: true },
                          textColor: 'theme:text',
                          borderColor: 'theme:border'
                        }
                      }
                    ]
                  }
                },
                {
                  id: 'hero-stats',
                  type: 'container',
                  position: 4,
                  config: {
                    containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                    containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'row' },
                    containerAlignItems: 'center',
                    containerJustifyContent: 'center',
                    containerGap: { desktop: 32, tablet: 24, mobile: 16 },
                    containerMargin: { desktop: { top: 32, right: 0, bottom: 0, left: 0 } },
                    children: [
                      {
                        id: 'stat-1',
                        type: 'container',
                        position: 0,
                        config: {
                          containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                          containerFlexDirection: {
                            desktop: 'column',
                            tablet: 'column',
                            mobile: 'column'
                          },
                          containerAlignItems: 'center',
                          children: [
                            {
                              id: 'stat-1-value',
                              type: 'text',
                              position: 0,
                              config: {
                                text: 'Simple',
                                alignment: 'center',
                                fontSize: { desktop: 24, tablet: 20, mobile: 18 },
                                textColor: 'theme:accent',
                                typography: { fontWeight: 'bold' }
                              }
                            },
                            {
                              id: 'stat-1-label',
                              type: 'text',
                              position: 1,
                              config: {
                                text: 'SETUP',
                                alignment: 'center',
                                fontSize: { desktop: 12, tablet: 11, mobile: 10 },
                                textColor: 'theme:textSecondary',
                                typography: { letterSpacing: '0.1em' }
                              }
                            }
                          ]
                        }
                      },
                      {
                        id: 'stat-divider-1',
                        type: 'divider',
                        position: 1,
                        config: {
                          thickness: 1,
                          dividerColor: 'theme:border',
                          dividerStyle: 'solid',
                          orientation: 'vertical',
                          spacing: { desktop: 0, tablet: 0, mobile: 0 }
                        }
                      },
                      {
                        id: 'stat-2',
                        type: 'container',
                        position: 2,
                        config: {
                          containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                          containerFlexDirection: {
                            desktop: 'column',
                            tablet: 'column',
                            mobile: 'column'
                          },
                          containerAlignItems: 'center',
                          children: [
                            {
                              id: 'stat-2-value',
                              type: 'text',
                              position: 0,
                              config: {
                                text: 'Beautiful',
                                alignment: 'center',
                                fontSize: { desktop: 24, tablet: 20, mobile: 18 },
                                textColor: 'theme:accent',
                                typography: { fontWeight: 'bold' }
                              }
                            },
                            {
                              id: 'stat-2-label',
                              type: 'text',
                              position: 1,
                              config: {
                                text: 'DESIGN',
                                alignment: 'center',
                                fontSize: { desktop: 12, tablet: 11, mobile: 10 },
                                textColor: 'theme:textSecondary',
                                typography: { letterSpacing: '0.1em' }
                              }
                            }
                          ]
                        }
                      },
                      {
                        id: 'stat-divider-2',
                        type: 'divider',
                        position: 3,
                        config: {
                          thickness: 1,
                          dividerColor: 'theme:border',
                          dividerStyle: 'solid',
                          orientation: 'vertical',
                          spacing: { desktop: 0, tablet: 0, mobile: 0 }
                        }
                      },
                      {
                        id: 'stat-3',
                        type: 'container',
                        position: 4,
                        config: {
                          containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                          containerFlexDirection: {
                            desktop: 'column',
                            tablet: 'column',
                            mobile: 'column'
                          },
                          containerAlignItems: 'center',
                          children: [
                            {
                              id: 'stat-3-value',
                              type: 'text',
                              position: 0,
                              config: {
                                text: 'Your',
                                alignment: 'center',
                                fontSize: { desktop: 24, tablet: 20, mobile: 18 },
                                textColor: 'theme:accent',
                                typography: { fontWeight: 'bold' }
                              }
                            },
                            {
                              id: 'stat-3-label',
                              type: 'text',
                              position: 1,
                              config: {
                                text: 'BRAND',
                                alignment: 'center',
                                fontSize: { desktop: 12, tablet: 11, mobile: 10 },
                                textColor: 'theme:textSecondary',
                                typography: { letterSpacing: '0.1em' }
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    },
    // Features section
    getFeaturesSectionWidget(),
    // Pricing section
    getPricingSectionWidget(),
    // Products section
    getProductsSectionWidget(),
    // CTA section
    getCtaSectionWidget()
  ];
}

/**
 * Get the Features section widget
 */
function getFeaturesSectionWidget(): WidgetDefinition {
  return {
    id: 'home-features',
    type: 'features',
    position: 1,
    config: {
      backgroundColor: 'transparent',
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
      children: [
        {
          id: 'features-main-container',
          type: 'container',
          position: 0,
          config: {
            containerPadding: {
              desktop: { top: 80, right: 24, bottom: 80, left: 24 },
              tablet: { top: 60, right: 20, bottom: 60, left: 20 },
              mobile: { top: 48, right: 16, bottom: 48, left: 16 }
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
            containerAlignItems: 'center',
            containerJustifyContent: 'center',
            containerWrap: 'nowrap',
            containerGap: { desktop: 48, tablet: 40, mobile: 32 },
            children: [
              {
                id: 'features-header',
                type: 'container',
                position: 0,
                config: {
                  containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                  containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
                  containerAlignItems: 'center',
                  containerGap: { desktop: 16, tablet: 12, mobile: 10 },
                  children: [
                    {
                      id: 'features-title',
                      type: 'text',
                      position: 0,
                      config: {
                        text: 'Everything You Need to Succeed',
                        alignment: 'center',
                        fontSize: { desktop: 48, tablet: 36, mobile: 28 },
                        textColor: 'theme:text',
                        typography: { fontWeight: 'bold', lineHeight: 1.2 }
                      }
                    },
                    {
                      id: 'features-subtitle',
                      type: 'text',
                      position: 1,
                      config: {
                        text: 'All the tools to run your online business, right out of the box',
                        alignment: 'center',
                        fontSize: { desktop: 18, tablet: 16, mobile: 14 },
                        textColor: 'theme:textSecondary',
                        typography: { lineHeight: 1.6 }
                      }
                    }
                  ]
                }
              },
              {
                id: 'features-grid',
                type: 'container',
                position: 1,
                config: {
                  containerDisplay: { desktop: 'grid', tablet: 'grid', mobile: 'flex' },
                  containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
                  containerGridCols: { desktop: 3, tablet: 2, mobile: 1 },
                  containerGap: { desktop: 24, tablet: 20, mobile: 16 },
                  containerAlignItems: 'stretch',
                  containerWidth: { desktop: '100%', tablet: '100%', mobile: '100%' },
                  children: getFeatureCards()
                }
              }
            ]
          }
        }
      ]
    }
  };
}

/**
 * Get the feature cards for the Features section
 */
function getFeatureCards(): WidgetDefinition['config']['children'] {
  const features = [
    {
      icon: '🎯',
      title: 'Easy Setup',
      desc: 'Get your online store up and running in minutes, no technical skills needed'
    },
    {
      icon: '✨',
      title: 'Beautiful Design',
      desc: 'Gorgeous, modern storefront that looks professional on any device'
    },
    {
      icon: '📦',
      title: 'Manage Products',
      desc: 'Simple dashboard to add, edit, and organize your products effortlessly'
    },
    {
      icon: '💳',
      title: 'Accept Payments',
      desc: 'Secure checkout ready to connect with your preferred payment processor'
    },
    {
      icon: '🎨',
      title: 'Customize Everything',
      desc: 'Make your store uniquely yours with flexible customization options'
    },
    {
      icon: '📱',
      title: 'Mobile Ready',
      desc: 'Your customers can shop from anywhere, on any device'
    }
  ];

  return features.map((f, i) => ({
    id: `feature-card-${i + 1}`,
    type: 'container' as const,
    position: i,
    config: {
      containerPadding: { desktop: { top: 32, right: 24, bottom: 32, left: 24 } },
      containerBackground: 'theme:surface',
      containerBorderRadius: 12,
      containerBorderWidth: 1,
      containerBorderColor: 'theme:border',
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'flex-start',
      containerGap: { desktop: 16, tablet: 12, mobile: 12 },
      children: [
        {
          id: `f${i + 1}-icon`,
          type: 'text' as const,
          position: 0,
          config: { text: f.icon, fontSize: { desktop: 48 } }
        },
        {
          id: `f${i + 1}-title`,
          type: 'text' as const,
          position: 1,
          config: {
            text: f.title,
            fontSize: { desktop: 20 },
            textColor: 'theme:text',
            typography: { fontWeight: '600' }
          }
        },
        {
          id: `f${i + 1}-desc`,
          type: 'text' as const,
          position: 2,
          config: {
            text: f.desc,
            fontSize: { desktop: 15 },
            textColor: 'theme:textSecondary',
            typography: { lineHeight: 1.6 }
          }
        }
      ]
    }
  }));
}

/**
 * Get the Pricing section widget
 */
function getPricingSectionWidget(): WidgetDefinition {
  return {
    id: 'home-pricing',
    type: 'pricing',
    position: 2,
    config: {
      anchorName: 'pricing',
      backgroundColor: 'transparent',
      containerPadding: {
        desktop: { top: 80, right: 24, bottom: 80, left: 24 },
        tablet: { top: 60, right: 20, bottom: 60, left: 20 },
        mobile: { top: 48, right: 16, bottom: 48, left: 16 }
      },
      containerMargin: {
        desktop: { top: 0, right: 0, bottom: 0, left: 0 },
        tablet: { top: 0, right: 0, bottom: 0, left: 0 },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerBackground: 'transparent',
      containerBorderRadius: 0,
      containerMaxWidth: '100%',
      containerMinHeight: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'center',
      containerJustifyContent: 'center',
      containerGap: { desktop: 48, tablet: 40, mobile: 32 },
      visibilityRule: 'always',
      children: [getPricingHeader(), getPricingCards(), getPricingCta()]
    }
  };
}

/**
 * Get the pricing header
 */
function getPricingHeader(): unknown {
  return {
    id: 'pricing-header',
    type: 'container',
    position: 0,
    config: {
      containerPadding: { desktop: { top: 0, right: 0, bottom: 0, left: 0 } },
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'center',
      containerJustifyContent: 'center',
      containerGap: { desktop: 16, tablet: 12, mobile: 8 },
      containerMaxWidth: '800px',
      children: [
        {
          id: 'pricing-icon',
          type: 'text',
          position: 0,
          config: {
            text: '🚀',
            alignment: 'center',
            fontSize: { desktop: 48, tablet: 40, mobile: 36 }
          }
        },
        {
          id: 'pricing-title',
          type: 'heading',
          position: 1,
          config: {
            heading: 'Hermes eCommerce Pricing',
            level: 2,
            textColor: 'theme:text',
            alignment: 'center',
            fontSize: { desktop: 48, tablet: 40, mobile: 32 },
            fontWeight: 800
          }
        },
        {
          id: 'pricing-tagline',
          type: 'text',
          position: 2,
          config: {
            text: 'Zero monthly fees. We win when you win.',
            alignment: 'center',
            textColor: 'theme:textSecondary',
            fontSize: { desktop: 20, tablet: 18, mobile: 16 },
            fontWeight: 500
          }
        },
        {
          id: 'pricing-subtitle',
          type: 'text',
          position: 3,
          config: {
            text: 'Every store gets full access — we only earn a small % per sale.',
            alignment: 'center',
            textColor: 'theme:textSecondary',
            fontSize: { desktop: 16, tablet: 15, mobile: 14 }
          }
        }
      ]
    }
  };
}

/**
 * Get the pricing cards grid
 */
function getPricingCards(): unknown {
  return {
    id: 'pricing-cards',
    type: 'container',
    position: 1,
    config: {
      containerPadding: { desktop: { top: 0, right: 0, bottom: 0, left: 0 } },
      containerDisplay: { desktop: 'grid', tablet: 'grid', mobile: 'flex' },
      containerGridCols: { desktop: 2, tablet: 2, mobile: 1 },
      containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
      containerGap: { desktop: 32, tablet: 24, mobile: 24 },
      containerMaxWidth: '1200px',
      containerWidth: { desktop: '100%', tablet: '100%', mobile: '100%' },
      children: [getFeaturesCard(), getTiersCard()]
    }
  };
}

/**
 * Get the features card for pricing
 */
function getFeaturesCard(): unknown {
  return {
    id: 'features-card',
    type: 'container',
    position: 0,
    config: {
      containerPadding: {
        desktop: { top: 32, right: 32, bottom: 32, left: 32 },
        tablet: { top: 24, right: 24, bottom: 24, left: 24 },
        mobile: { top: 24, right: 20, bottom: 24, left: 20 }
      },
      containerBackground: 'theme:surface',
      containerBorderRadius: 16,
      containerBorderWidth: 1,
      containerBorderColor: 'theme:border',
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerGap: { desktop: 24, tablet: 20, mobile: 16 },
      children: [
        {
          id: 'features-header',
          type: 'container',
          position: 0,
          config: {
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
            containerAlignItems: 'center',
            containerGap: { desktop: 8, tablet: 8, mobile: 6 },
            children: [
              {
                id: 'features-icon',
                type: 'text',
                position: 0,
                config: {
                  text: '💰',
                  alignment: 'center',
                  fontSize: { desktop: 40, tablet: 36, mobile: 32 }
                }
              },
              {
                id: 'features-title',
                type: 'heading',
                position: 1,
                config: {
                  heading: 'Pay-as-You-Grow',
                  level: 3,
                  textColor: 'theme:text',
                  alignment: 'center',
                  fontSize: { desktop: 24, tablet: 22, mobile: 20 },
                  fontWeight: 700
                }
              },
              {
                id: 'features-subtitle',
                type: 'text',
                position: 2,
                config: {
                  text: 'All features included, always.',
                  alignment: 'center',
                  textColor: 'theme:textSecondary',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 }
                }
              }
            ]
          }
        },
        {
          id: 'features-list',
          type: 'container',
          position: 1,
          config: {
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
            containerGap: { desktop: 0, tablet: 0, mobile: 0 },
            children: [
              {
                id: 'feature-1',
                type: 'text',
                position: 0,
                config: {
                  text: '✓ Unlimited products',
                  textColor: 'theme:text',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 },
                  padding: { desktop: { top: 16, right: 0, bottom: 16, left: 0 } },
                  borderBottom: '1px solid theme:border'
                }
              },
              {
                id: 'feature-2',
                type: 'text',
                position: 1,
                config: {
                  text: '✓ Free custom domain (optional)',
                  textColor: 'theme:text',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 },
                  padding: { desktop: { top: 16, right: 0, bottom: 16, left: 0 } },
                  borderBottom: '1px solid theme:border'
                }
              },
              {
                id: 'feature-3',
                type: 'text',
                position: 2,
                config: {
                  text: '✓ AI-powered builder (voice + text)',
                  textColor: 'theme:text',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 },
                  padding: { desktop: { top: 16, right: 0, bottom: 16, left: 0 } },
                  borderBottom: '1px solid theme:border'
                }
              },
              {
                id: 'feature-4',
                type: 'text',
                position: 3,
                config: {
                  text: '✓ Real-time analytics',
                  textColor: 'theme:text',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 },
                  padding: { desktop: { top: 16, right: 0, bottom: 16, left: 0 } },
                  borderBottom: '1px solid theme:border'
                }
              },
              {
                id: 'feature-5',
                type: 'text',
                position: 4,
                config: {
                  text: '✓ Secure checkout (credit card/crypto)',
                  textColor: 'theme:text',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 },
                  padding: { desktop: { top: 16, right: 0, bottom: 16, left: 0 } },
                  borderBottom: '1px solid theme:border'
                }
              },
              {
                id: 'feature-6',
                type: 'text',
                position: 5,
                config: {
                  text: '✓ AI product video generator',
                  textColor: 'theme:text',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 },
                  padding: { desktop: { top: 16, right: 0, bottom: 16, left: 0 } }
                }
              }
            ]
          }
        }
      ]
    }
  };
}

/**
 * Get the pricing tiers card
 */
function getTiersCard(): unknown {
  const tiers = [
    { range: '$0 – $1,000', desc: 'Perfect for getting started', fee: '8%', highlight: false },
    { range: '$1,001 – $5,000', desc: 'Growing your business', fee: '6%', highlight: false },
    { range: '$5,001 – $20,000', desc: 'Established sales', fee: '4%', highlight: false },
    { range: '$20,001+', desc: 'High volume discounts', fee: '3%', highlight: true }
  ];

  return {
    id: 'tiers-card',
    type: 'container',
    position: 1,
    config: {
      containerPadding: {
        desktop: { top: 32, right: 32, bottom: 32, left: 32 },
        tablet: { top: 24, right: 24, bottom: 24, left: 24 },
        mobile: { top: 24, right: 20, bottom: 24, left: 20 }
      },
      containerBackground: 'theme:surface',
      containerBorderRadius: 16,
      containerBorderWidth: 1,
      containerBorderColor: 'theme:border',
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerGap: { desktop: 24, tablet: 20, mobile: 16 },
      children: [
        {
          id: 'tiers-header',
          type: 'container',
          position: 0,
          config: {
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
            containerAlignItems: 'center',
            containerGap: { desktop: 8, tablet: 8, mobile: 6 },
            children: [
              {
                id: 'tiers-icon',
                type: 'text',
                position: 0,
                config: {
                  text: '💎',
                  alignment: 'center',
                  fontSize: { desktop: 40, tablet: 36, mobile: 32 }
                }
              },
              {
                id: 'tiers-title',
                type: 'heading',
                position: 1,
                config: {
                  heading: 'Revenue Share',
                  level: 3,
                  textColor: 'theme:text',
                  alignment: 'center',
                  fontSize: { desktop: 24, tablet: 22, mobile: 20 },
                  fontWeight: 700
                }
              },
              {
                id: 'tiers-subtitle',
                type: 'text',
                position: 2,
                config: {
                  text: 'Includes payment processor fees',
                  alignment: 'center',
                  textColor: 'theme:textSecondary',
                  fontSize: { desktop: 15, tablet: 14, mobile: 14 }
                }
              }
            ]
          }
        },
        {
          id: 'tiers-table',
          type: 'container',
          position: 1,
          config: {
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
            containerGap: { desktop: 8, tablet: 6, mobile: 6 },
            children: [
              {
                id: 'table-header',
                type: 'container',
                position: 0,
                config: {
                  containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                  containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'row' },
                  containerJustifyContent: 'space-between',
                  containerPadding: { desktop: { top: 8, right: 16, bottom: 8, left: 16 } },
                  children: [
                    {
                      id: 'header-sales',
                      type: 'text',
                      position: 0,
                      config: {
                        text: 'MONTHLY SALES',
                        textColor: 'theme:textSecondary',
                        fontSize: { desktop: 11, tablet: 10, mobile: 10 },
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                      }
                    },
                    {
                      id: 'header-fee',
                      type: 'text',
                      position: 1,
                      config: {
                        text: 'FEE',
                        textColor: 'theme:textSecondary',
                        fontSize: { desktop: 11, tablet: 10, mobile: 10 },
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                      }
                    }
                  ]
                }
              },
              ...tiers.map((t, i) => ({
                id: `tier-${i + 1}`,
                type: 'container' as const,
                position: i + 1,
                config: {
                  containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                  containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'row' },
                  containerJustifyContent: 'space-between',
                  containerAlignItems: 'center',
                  containerPadding: { desktop: { top: 16, right: 20, bottom: 16, left: 20 } },
                  containerBackground: 'theme:surface',
                  containerBorderRadius: 12,
                  containerBorderWidth: t.highlight ? 2 : 1,
                  containerBorderColor: t.highlight ? 'theme:accent' : 'theme:border',
                  children: [
                    {
                      id: `tier-${i + 1}-info`,
                      type: 'container' as const,
                      position: 0,
                      config: {
                        containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                        containerFlexDirection: {
                          desktop: 'column',
                          tablet: 'column',
                          mobile: 'column'
                        },
                        containerGap: { desktop: 4, tablet: 4, mobile: 2 },
                        children: [
                          {
                            id: `tier-${i + 1}-range`,
                            type: 'text' as const,
                            position: 0,
                            config: {
                              text: t.range,
                              textColor: 'theme:text',
                              fontSize: { desktop: 16, tablet: 15, mobile: 14 },
                              fontWeight: 600
                            }
                          },
                          {
                            id: `tier-${i + 1}-desc`,
                            type: 'text' as const,
                            position: 1,
                            config: {
                              text: t.desc,
                              textColor: 'theme:textSecondary',
                              fontSize: { desktop: 14, tablet: 13, mobile: 12 }
                            }
                          }
                        ]
                      }
                    },
                    {
                      id: `tier-${i + 1}-fee`,
                      type: 'text' as const,
                      position: 1,
                      config: {
                        text: t.fee,
                        textColor: 'theme:accent',
                        fontSize: { desktop: 28, tablet: 24, mobile: 22 },
                        fontWeight: 700
                      }
                    }
                  ]
                }
              }))
            ]
          }
        }
      ]
    }
  };
}

/**
 * Get the pricing CTA button
 */
function getPricingCta(): unknown {
  return {
    id: 'pricing-cta',
    type: 'container',
    position: 2,
    config: {
      containerPadding: { desktop: { top: 0, right: 0, bottom: 0, left: 0 } },
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'center',
      containerGap: { desktop: 16, tablet: 12, mobile: 8 },
      children: [
        {
          id: 'cta-button',
          type: 'button',
          position: 0,
          config: {
            label: 'Get Started Free →',
            url: '/auth/login',
            variant: 'filled',
            size: 'large',
            fullWidth: { desktop: false, tablet: false, mobile: true },
            borderRadius: 12,
            backgroundColor: 'theme:accent',
            textColor: 'theme:text',
            padding: { desktop: { top: 16, right: 40, bottom: 16, left: 40 } },
            fontSize: { desktop: 18, tablet: 16, mobile: 16 },
            fontWeight: 600
          }
        }
      ]
    }
  };
}

/**
 * Get the Products section widget
 */
function getProductsSectionWidget(): WidgetDefinition {
  return {
    id: 'home-products',
    type: 'container',
    position: 3,
    config: {
      anchorName: 'products',
      containerPadding: {
        desktop: { top: 80, right: 24, bottom: 80, left: 24 },
        tablet: { top: 60, right: 20, bottom: 60, left: 20 },
        mobile: { top: 48, right: 16, bottom: 48, left: 16 }
      },
      containerMargin: {
        desktop: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
        tablet: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerBackground: 'transparent',
      containerMaxWidth: '1200px',
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'center',
      containerGap: { desktop: 48, tablet: 40, mobile: 32 },
      children: [
        {
          id: 'products-header',
          type: 'container',
          position: 0,
          config: {
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
            containerAlignItems: 'center',
            containerGap: { desktop: 16, tablet: 12, mobile: 10 },
            children: [
              {
                id: 'products-title',
                type: 'text',
                position: 0,
                config: {
                  text: 'Example Store',
                  alignment: 'center',
                  fontSize: { desktop: 48, tablet: 36, mobile: 28 },
                  textColor: 'theme:text',
                  typography: { fontWeight: 'bold', lineHeight: 1.2 }
                }
              },
              {
                id: 'products-subtitle',
                type: 'text',
                position: 1,
                config: {
                  text: 'Here is what your store could look like - this is a real, working example',
                  alignment: 'center',
                  fontSize: { desktop: 18, tablet: 16, mobile: 14 },
                  textColor: 'theme:textSecondary',
                  typography: { lineHeight: 1.6 }
                }
              }
            ]
          }
        },
        {
          id: 'products-list',
          type: 'product_list',
          position: 1,
          config: {
            category: '',
            limit: 6,
            sortBy: 'created_at',
            sortOrder: 'desc',
            columns: { desktop: 3, tablet: 2, mobile: 1 },
            backgroundColor: 'transparent'
          }
        }
      ]
    }
  };
}

/**
 * Get the CTA section widget
 */
function getCtaSectionWidget(): WidgetDefinition {
  return {
    id: 'home-cta',
    type: 'container',
    position: 4,
    config: {
      containerPadding: {
        desktop: { top: 80, right: 24, bottom: 80, left: 24 },
        tablet: { top: 60, right: 20, bottom: 60, left: 20 },
        mobile: { top: 48, right: 16, bottom: 48, left: 16 }
      },
      containerMargin: {
        desktop: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
        tablet: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerBackground: 'theme:surface',
      containerBorderRadius: 16,
      containerMaxWidth: '800px',
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'center',
      containerGap: { desktop: 24, tablet: 20, mobile: 16 },
      children: [
        {
          id: 'cta-title',
          type: 'text',
          position: 0,
          config: {
            text: 'Ready to Start Your Business?',
            alignment: 'center',
            fontSize: { desktop: 36, tablet: 28, mobile: 24 },
            textColor: 'theme:text',
            typography: { fontWeight: 'bold', lineHeight: 1.2 }
          }
        },
        {
          id: 'cta-subtitle',
          type: 'text',
          position: 1,
          config: {
            text: 'Join entrepreneurs around the world who are building their dreams with their own online stores.',
            alignment: 'center',
            fontSize: { desktop: 18, tablet: 16, mobile: 14 },
            textColor: 'theme:textSecondary',
            typography: { lineHeight: 1.6 }
          }
        },
        {
          id: 'cta-button',
          type: 'button',
          position: 2,
          config: {
            label: 'Create Your Store',
            url: '/auth/login',
            variant: 'primary',
            size: 'large',
            fullWidth: { desktop: false, tablet: false, mobile: true },
            backgroundColor: 'theme:accent',
            textColor: 'theme:text'
          }
        }
      ]
    }
  };
}

/**
 * All built-in page definitions
 */
export const BUILTIN_PAGES: BuiltinPageDefinition[] = [
  {
    id: 'builtin-home-page',
    title: 'Home',
    slug: '/',
    description: 'Default home page with hero, features, pricing, and products sections',
    getWidgets: getHomePageWidgets
  }
];

/**
 * Get the default widgets for a built-in page by ID
 */
export function getBuiltinPageWidgets(pageId: string): WidgetDefinition[] | null {
  const definition = BUILTIN_PAGES.find((p) => p.id === pageId);
  return definition ? definition.getWidgets() : null;
}
