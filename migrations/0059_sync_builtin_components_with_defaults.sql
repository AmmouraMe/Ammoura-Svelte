-- Migration: 0059_sync_builtin_components_with_defaults
-- Description: Sync all built-in components with the defaults from componentDefaults.ts
-- This ensures the database initial state matches exactly what resetBuiltInComponent produces.
-- Generated automatically - do not edit manually. Re-run the generation script if componentDefaults.ts changes.
-- Rollback: See previous component migrations for restoration

-- Built-in Components
-- Update Navigation Bar component
UPDATE components
SET
  config = '{
  "containerPadding": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerMargin": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerBackground": "transparent",
  "containerBorderRadius": 0,
  "containerMaxWidth": "100%",
  "containerDisplay": {
    "desktop": "block",
    "tablet": "block",
    "mobile": "block"
  },
  "containerWidth": {
    "desktop": "100%",
    "tablet": "100%",
    "mobile": "100%"
  },
  "visibilityRule": "always",
  "position": {
    "desktop": {
      "type": "sticky",
      "top": "0"
    },
    "tablet": {
      "type": "sticky",
      "top": "0"
    },
    "mobile": {
      "type": "sticky",
      "top": "0"
    }
  },
  "children": [
    {
      "id": "main-container",
      "type": "container",
      "position": 0,
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 16,
            "right": 24,
            "bottom": 16,
            "left": 24
          },
          "tablet": {
            "top": 12,
            "right": 20,
            "bottom": 12,
            "left": 20
          },
          "mobile": {
            "top": 12,
            "right": 16,
            "bottom": 12,
            "left": 16
          }
        },
        "containerMargin": {
          "desktop": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "tablet": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "mobile": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "1400px",
        "containerJustifyContent": "space-between",
        "containerDisplay": {
          "desktop": "flex",
          "tablet": "flex",
          "mobile": "flex"
        },
        "containerFlexDirection": {
          "desktop": "row",
          "tablet": "row",
          "mobile": "column"
        },
        "containerAlignItems": "stretch",
        "containerWrap": "nowrap",
        "containerGap": {
          "desktop": 16,
          "tablet": 16,
          "mobile": 16
        },
        "containerWidth": {
          "desktop": "auto",
          "tablet": "auto",
          "mobile": "auto"
        },
        "containerGridCols": {
          "desktop": 3,
          "tablet": 2,
          "mobile": 1
        },
        "containerGridAutoFlow": {
          "desktop": "row",
          "tablet": "row",
          "mobile": "row"
        },
        "containerPlaceItems": null,
        "children": [
          {
            "id": "logo-container",
            "type": "container",
            "position": 0,
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "tablet": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "mobile": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerMargin": {
                "desktop": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "tablet": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "mobile": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerBackground": "transparent",
              "containerBorderRadius": 0,
              "containerMaxWidth": "1200px",
              "containerGap": {
                "desktop": 16,
                "tablet": 12,
                "mobile": 8
              },
              "containerJustifyContent": "flex-start",
              "containerAlignItems": "center",
              "containerWrap": "wrap",
              "children": [
                {
                  "id": "site-name-heading",
                  "type": "heading",
                  "position": 0,
                  "config": {
                    "heading": "${site.name}",
                    "level": 2,
                    "textColor": "theme:text",
                    "link": "/"
                  }
                }
              ]
            }
          },
          {
            "id": "nav-links-container",
            "type": "container",
            "position": 1,
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "tablet": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "mobile": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerMargin": {
                "desktop": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "tablet": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "mobile": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerBackground": "transparent",
              "containerBorderRadius": 0,
              "containerMaxWidth": "1200px",
              "containerGap": {
                "desktop": 16,
                "tablet": 12,
                "mobile": 8
              },
              "containerJustifyContent": "flex-end",
              "containerAlignItems": "center",
              "containerWrap": "wrap",
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "column"
              },
              "containerWidth": {
                "desktop": "auto",
                "tablet": "auto",
                "mobile": "auto"
              },
              "containerGridCols": {
                "desktop": 3,
                "tablet": 2,
                "mobile": 1
              },
              "containerGridAutoFlow": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "row"
              },
              "children": [
                {
                  "id": "products-link",
                  "type": "button",
                  "position": 0,
                  "config": {
                    "label": "Products",
                    "url": "/#products",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    }
                  }
                },
                {
                  "id": "pricing-link",
                  "type": "button",
                  "position": 1,
                  "config": {
                    "label": "Pricing",
                    "url": "/#pricing",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    }
                  }
                },
                {
                  "id": "login-button",
                  "type": "button",
                  "position": 2,
                  "config": {
                    "label": "Login",
                    "url": "/auth/login",
                    "variant": "outline",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    },
                    "icon": "LogIn",
                    "visibilityRule": "unauthenticated"
                  }
                },
                {
                  "id": "user-dropdown",
                  "type": "dropdown",
                  "position": 3,
                  "config": {
                    "triggerLabel": "${user.display_name}",
                    "triggerIcon": "",
                    "triggerVariant": "text",
                    "menuAlign": "left",
                    "visibilityRule": "authenticated",
                    "children": [
                      {
                        "id": "admin-dashboard-link",
                        "type": "button",
                        "position": 0,
                        "config": {
                          "label": "Admin Dashboard",
                          "url": "/admin/dashboard",
                          "variant": "text",
                          "size": "medium",
                          "fullWidth": {
                            "desktop": false,
                            "tablet": false,
                            "mobile": true
                          },
                          "visibilityRule": "role",
                          "requiredRoles": [
                            "admin"
                          ]
                        }
                      },
                      {
                        "id": "dropdown-divider",
                        "type": "divider",
                        "position": 1,
                        "config": {
                          "thickness": 1,
                          "dividerColor": "theme:border",
                          "dividerStyle": "solid",
                          "spacing": {
                            "desktop": 8,
                            "tablet": 8,
                            "mobile": 8
                          }
                        }
                      },
                      {
                        "id": "profile-button",
                        "type": "button",
                        "position": 2,
                        "config": {
                          "label": "Profile",
                          "url": "/profile",
                          "variant": "text",
                          "size": "medium",
                          "fullWidth": {
                            "desktop": false,
                            "tablet": false,
                            "mobile": true
                          }
                        }
                      },
                      {
                        "id": "logout-button",
                        "type": "button",
                        "position": 3,
                        "config": {
                          "label": "Logout",
                          "url": "/auth/logout",
                          "variant": "text",
                          "size": "medium",
                          "fullWidth": {
                            "desktop": false,
                            "tablet": false,
                            "mobile": true
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "cart-button",
                  "type": "button",
                  "position": 4,
                  "config": {
                    "label": "Cart",
                    "url": "/cart",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    },
                    "icon": "ShoppingCart"
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}',
  type = 'navbar',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' AND is_global = 1;

-- Update Footer component
UPDATE components
SET
  config = '{
  "containerPadding": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerMargin": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerBackground": "transparent",
  "containerBorderRadius": 0,
  "containerMaxWidth": "100%",
  "containerDisplay": {
    "desktop": "block",
    "tablet": "block",
    "mobile": "block"
  },
  "containerWidth": {
    "desktop": "100%",
    "tablet": "100%",
    "mobile": "100%"
  },
  "visibilityRule": "always",
  "footerBackground": "transparent",
  "footerTextColor": "theme:textSecondary",
  "footerHoverColor": "theme:primary",
  "footerBorderColor": "theme:border",
  "footerShadow": false,
  "copyright": "© 2025 ${site.name}. All rights reserved.",
  "columnsPerRow": {
    "desktop": 4,
    "tablet": 2,
    "mobile": 1
  },
  "logo": {
    "text": "${site.name}",
    "url": "/",
    "image": "",
    "imageHeight": 32
  },
  "tagline": "${site.tagline}",
  "linkSections": [
    {
      "title": "Company",
      "links": [
        {
          "text": "About",
          "url": "/about"
        },
        {
          "text": "Careers",
          "url": "/careers"
        },
        {
          "text": "Blog",
          "url": "/blog"
        }
      ]
    },
    {
      "title": "Support",
      "links": [
        {
          "text": "Help Center",
          "url": "/help"
        },
        {
          "text": "Contact Us",
          "url": "/contact"
        },
        {
          "text": "FAQ",
          "url": "/faq"
        }
      ]
    },
    {
      "title": "Legal",
      "links": [
        {
          "text": "Privacy Policy",
          "url": "/privacy"
        },
        {
          "text": "Terms of Service",
          "url": "/terms"
        },
        {
          "text": "Cookie Policy",
          "url": "/cookies"
        }
      ]
    }
  ],
  "socialLinks": [
    {
      "platform": "facebook",
      "url": "#"
    },
    {
      "platform": "twitter",
      "url": "#"
    },
    {
      "platform": "instagram",
      "url": "#"
    },
    {
      "platform": "linkedin",
      "url": "#"
    }
  ],
  "footerLinks": [],
  "children": [
    {
      "id": "main-container",
      "type": "container",
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 48,
            "right": 24,
            "bottom": 48,
            "left": 24
          },
          "tablet": {
            "top": 40,
            "right": 20,
            "bottom": 40,
            "left": 20
          },
          "mobile": {
            "top": 32,
            "right": 16,
            "bottom": 32,
            "left": 16
          }
        },
        "containerMargin": {
          "desktop": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "tablet": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "mobile": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "1200px",
        "containerDisplay": {
          "desktop": "flex",
          "tablet": "flex",
          "mobile": "flex"
        },
        "containerFlexDirection": {
          "desktop": "column",
          "tablet": "column",
          "mobile": "column"
        },
        "containerAlignItems": "stretch",
        "containerWrap": "nowrap",
        "containerGap": {
          "desktop": 32,
          "tablet": 24,
          "mobile": 16
        },
        "children": [
          {
            "id": "footer-content-row",
            "type": "container",
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "grid",
                "mobile": "grid"
              },
              "containerGridCols": {
                "desktop": 4,
                "tablet": 2,
                "mobile": 1
              },
              "containerGap": {
                "desktop": 32,
                "tablet": 24,
                "mobile": 24
              },
              "containerFlexDirection": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "column"
              },
              "containerJustifyContent": "space-around",
              "containerAlignItems": "stretch",
              "containerWrap": "nowrap",
              "containerMaxWidth": "1200px",
              "containerWidth": {
                "desktop": "auto",
                "tablet": "auto",
                "mobile": "auto"
              },
              "containerGridAutoFlow": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "row"
              },
              "containerPlaceItems": "",
              "children": [
                {
                  "id": "footer-about-btn",
                  "type": "button",
                  "position": 0,
                  "config": {
                    "label": "About",
                    "url": "/about",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    }
                  }
                },
                {
                  "id": "footer-products-btn",
                  "type": "button",
                  "position": 1,
                  "config": {
                    "label": "Products",
                    "url": "/#products",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    }
                  }
                },
                {
                  "id": "footer-admin-btn",
                  "type": "button",
                  "position": 2,
                  "config": {
                    "label": "Admin Dashboard",
                    "url": "/admin/dashboard",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    },
                    "icon": "Settings",
                    "visibilityRule": "role",
                    "requiredRoles": [
                      "admin"
                    ]
                  }
                },
                {
                  "id": "footer-login-btn",
                  "type": "button",
                  "position": 3,
                  "config": {
                    "label": "Login",
                    "url": "/auth/login",
                    "variant": "text",
                    "size": "medium",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    },
                    "icon": "LogIn",
                    "visibilityRule": "unauthenticated"
                  }
                }
              ]
            },
            "position": 0
          },
          {
            "id": "footer-copyright",
            "type": "text",
            "config": {
              "text": "© 2025 ${site.name}. All rights reserved.",
              "alignment": "center",
              "fontSize": {
                "desktop": 14,
                "tablet": 14,
                "mobile": 12
              },
              "color": "theme:textSecondary"
            },
            "position": 1
          }
        ]
      },
      "position": 0
    }
  ]
}',
  type = 'footer',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Footer' AND is_global = 1;

-- Update Hero component
UPDATE components
SET
  config = '{
  "containerPadding": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerMargin": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerBackground": "transparent",
  "containerBorderRadius": 0,
  "containerMaxWidth": "100%",
  "containerMinHeight": {
    "desktop": "600px",
    "tablet": "500px",
    "mobile": "450px"
  },
  "containerDisplay": {
    "desktop": "block",
    "tablet": "block",
    "mobile": "block"
  },
  "containerWidth": {
    "desktop": "100%",
    "tablet": "100%",
    "mobile": "100%"
  },
  "visibilityRule": "always",
  "children": [
    {
      "id": "hero-main-container",
      "type": "container",
      "position": 0,
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 80,
            "right": 24,
            "bottom": 80,
            "left": 24
          },
          "tablet": {
            "top": 60,
            "right": 20,
            "bottom": 60,
            "left": 20
          },
          "mobile": {
            "top": 48,
            "right": 16,
            "bottom": 48,
            "left": 16
          }
        },
        "containerMargin": {
          "desktop": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "tablet": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "mobile": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "1200px",
        "containerDisplay": {
          "desktop": "flex",
          "tablet": "flex",
          "mobile": "flex"
        },
        "containerFlexDirection": {
          "desktop": "column",
          "tablet": "column",
          "mobile": "column"
        },
        "containerAlignItems": "center",
        "containerJustifyContent": "center",
        "containerWrap": "nowrap",
        "containerGap": {
          "desktop": 24,
          "tablet": 20,
          "mobile": 16
        },
        "children": [
          {
            "id": "hero-badge",
            "type": "button",
            "position": 0,
            "config": {
              "label": "✨ Start Selling Online Today",
              "url": "#",
              "variant": "outline",
              "size": "small",
              "fullWidth": {
                "desktop": false,
                "tablet": false,
                "mobile": false
              },
              "buttonAlign": "center",
              "borderRadius": 999,
              "backgroundColor": "rgba(30, 41, 59, 0.8)",
              "textColor": "#e2e8f0",
              "borderColor": "rgba(71, 85, 105, 0.5)",
              "padding": {
                "desktop": {
                  "top": 8,
                  "right": 20,
                  "bottom": 8,
                  "left": 20
                }
              },
              "fontSize": {
                "desktop": 14,
                "tablet": 13,
                "mobile": 12
              }
            }
          },
          {
            "id": "hero-title-container",
            "type": "container",
            "position": 1,
            "config": {
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "column"
              },
              "containerAlignItems": "center",
              "containerJustifyContent": "center",
              "containerGap": {
                "desktop": 12,
                "tablet": 10,
                "mobile": 4
              },
              "containerWrap": "wrap",
              "children": [
                {
                  "id": "hero-title-part1",
                  "type": "text",
                  "position": 0,
                  "config": {
                    "text": "Create Your Own",
                    "alignment": "center",
                    "fontSize": {
                      "desktop": 56,
                      "tablet": 42,
                      "mobile": 32
                    },
                    "textColor": "#ffffff",
                    "typography": {
                      "fontWeight": "bold",
                      "lineHeight": 1.1
                    }
                  }
                },
                {
                  "id": "hero-title-part2",
                  "type": "text",
                  "position": 1,
                  "config": {
                    "text": "Online Store",
                    "alignment": "center",
                    "fontSize": {
                      "desktop": 56,
                      "tablet": 42,
                      "mobile": 32
                    },
                    "textColor": "#a78bfa",
                    "typography": {
                      "fontWeight": "bold",
                      "lineHeight": 1.1
                    }
                  }
                }
              ]
            }
          },
          {
            "id": "hero-subtitle-container",
            "type": "container",
            "position": 2,
            "config": {
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "column",
                "tablet": "column",
                "mobile": "column"
              },
              "containerAlignItems": "center",
              "containerGap": {
                "desktop": 4,
                "tablet": 4,
                "mobile": 4
              },
              "children": [
                {
                  "id": "hero-subtitle-line1",
                  "type": "text",
                  "position": 0,
                  "config": {
                    "text": "Everything you need to start selling products online.",
                    "alignment": "center",
                    "fontSize": {
                      "desktop": 20,
                      "tablet": 18,
                      "mobile": 16
                    },
                    "textColor": "#94a3b8",
                    "typography": {
                      "lineHeight": 1.6
                    }
                  }
                },
                {
                  "id": "hero-subtitle-line2",
                  "type": "container",
                  "position": 1,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "row",
                      "tablet": "row",
                      "mobile": "row"
                    },
                    "containerAlignItems": "center",
                    "containerJustifyContent": "center",
                    "containerGap": {
                      "desktop": 6,
                      "tablet": 5,
                      "mobile": 4
                    },
                    "containerWrap": "wrap",
                    "children": [
                      {
                        "id": "hero-subtitle-line2-styled",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Simple, beautiful,",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#a78bfa",
                          "typography": {
                            "fontStyle": "italic",
                            "lineHeight": 1.6
                          }
                        }
                      },
                      {
                        "id": "hero-subtitle-line2-plain",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "and ready for your business.",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            "id": "hero-buttons-row",
            "type": "container",
            "position": 3,
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 16,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "column"
              },
              "containerGap": {
                "desktop": 16,
                "tablet": 12,
                "mobile": 12
              },
              "containerAlignItems": "center",
              "containerJustifyContent": "center",
              "children": [
                {
                  "id": "hero-cta-primary",
                  "type": "button",
                  "position": 0,
                  "config": {
                    "label": "See Example Store",
                    "url": "#products",
                    "variant": "outline",
                    "size": "large",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    },
                    "backgroundColor": "transparent",
                    "textColor": "#ffffff",
                    "borderColor": "rgba(148, 163, 184, 0.4)",
                    "iconAfter": "→",
                    "borderRadius": 8,
                    "padding": {
                      "desktop": {
                        "top": 14,
                        "right": 28,
                        "bottom": 14,
                        "left": 28
                      }
                    },
                    "fontSize": {
                      "desktop": 16,
                      "tablet": 15,
                      "mobile": 14
                    }
                  }
                },
                {
                  "id": "hero-cta-secondary",
                  "type": "button",
                  "position": 1,
                  "config": {
                    "label": "Start Your Store",
                    "url": "/auth/login",
                    "variant": "secondary",
                    "size": "large",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    },
                    "backgroundColor": "rgba(30, 41, 59, 0.9)",
                    "textColor": "#ffffff",
                    "borderColor": "rgba(71, 85, 105, 0.5)",
                    "borderRadius": 8,
                    "padding": {
                      "desktop": {
                        "top": 14,
                        "right": 28,
                        "bottom": 14,
                        "left": 28
                      }
                    },
                    "fontSize": {
                      "desktop": 16,
                      "tablet": 15,
                      "mobile": 14
                    }
                  }
                }
              ]
            }
          },
          {
            "id": "hero-stats-row",
            "type": "container",
            "position": 4,
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 32,
                  "right": 64,
                  "bottom": 32,
                  "left": 64
                },
                "tablet": {
                  "top": 24,
                  "right": 32,
                  "bottom": 24,
                  "left": 32
                },
                "mobile": {
                  "top": 20,
                  "right": 16,
                  "bottom": 20,
                  "left": 16
                }
              },
              "containerMargin": {
                "desktop": {
                  "top": 32,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                }
              },
              "containerBackground": "transparent",
              "containerBorderRadius": 0,
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "column"
              },
              "containerGap": {
                "desktop": 48,
                "tablet": 32,
                "mobile": 24
              },
              "containerAlignItems": "center",
              "containerJustifyContent": "center",
              "children": [
                {
                  "id": "hero-stat-1",
                  "type": "container",
                  "position": 0,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "center",
                    "containerGap": {
                      "desktop": 4,
                      "tablet": 4,
                      "mobile": 4
                    },
                    "children": [
                      {
                        "id": "hero-stat-1-value",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Simple",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 18
                          },
                          "textColor": "#a78bfa",
                          "typography": {
                            "fontWeight": "bold"
                          }
                        }
                      },
                      {
                        "id": "hero-stat-1-label",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "SETUP",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 12,
                            "tablet": 11,
                            "mobile": 11
                          },
                          "textColor": "#64748b",
                          "typography": {
                            "textTransform": "uppercase",
                            "letterSpacing": 1.5
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "hero-stat-divider-1",
                  "type": "divider",
                  "position": 1,
                  "config": {
                    "thickness": 1,
                    "dividerColor": "#334155",
                    "dividerStyle": "solid",
                    "dividerWidth": "1px",
                    "dividerHeight": "40px",
                    "orientation": "vertical"
                  }
                },
                {
                  "id": "hero-stat-2",
                  "type": "container",
                  "position": 2,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "center",
                    "containerGap": {
                      "desktop": 4,
                      "tablet": 4,
                      "mobile": 4
                    },
                    "children": [
                      {
                        "id": "hero-stat-2-value",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Beautiful",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 18
                          },
                          "textColor": "#a78bfa",
                          "typography": {
                            "fontWeight": "bold"
                          }
                        }
                      },
                      {
                        "id": "hero-stat-2-label",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "DESIGN",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 12,
                            "tablet": 11,
                            "mobile": 11
                          },
                          "textColor": "#64748b",
                          "typography": {
                            "textTransform": "uppercase",
                            "letterSpacing": 1.5
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "hero-stat-divider-2",
                  "type": "divider",
                  "position": 3,
                  "config": {
                    "thickness": 1,
                    "dividerColor": "#334155",
                    "dividerStyle": "solid",
                    "dividerWidth": "1px",
                    "dividerHeight": "40px",
                    "orientation": "vertical"
                  }
                },
                {
                  "id": "hero-stat-3",
                  "type": "container",
                  "position": 4,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "center",
                    "containerGap": {
                      "desktop": 4,
                      "tablet": 4,
                      "mobile": 4
                    },
                    "children": [
                      {
                        "id": "hero-stat-3-value",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Your",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 18
                          },
                          "textColor": "#a78bfa",
                          "typography": {
                            "fontWeight": "bold"
                          }
                        }
                      },
                      {
                        "id": "hero-stat-3-label",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "BRAND",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 12,
                            "tablet": 11,
                            "mobile": 11
                          },
                          "textColor": "#64748b",
                          "typography": {
                            "textTransform": "uppercase",
                            "letterSpacing": 1.5
                          }
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
}',
  type = 'hero',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Hero' AND is_global = 1;

-- Update Container component
UPDATE components
SET
  config = '{
  "containerPadding": {
    "desktop": {
      "top": 40,
      "right": 40,
      "bottom": 40,
      "left": 40
    },
    "tablet": {
      "top": 30,
      "right": 30,
      "bottom": 30,
      "left": 30
    },
    "mobile": {
      "top": 20,
      "right": 20,
      "bottom": 20,
      "left": 20
    }
  },
  "containerMargin": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerBackground": "transparent",
  "containerBorderRadius": 0,
  "containerBorderWidth": 0,
  "containerBorderColor": "theme:border",
  "containerBorderStyle": "solid",
  "containerMaxWidth": "1200px",
  "containerGap": {
    "desktop": 16,
    "tablet": 12,
    "mobile": 8
  },
  "containerJustifyContent": "flex-start",
  "containerAlignItems": "center",
  "containerWrap": "wrap",
  "children": []
}',
  type = 'container',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Container' AND is_global = 1;

-- Update Features component
UPDATE components
SET
  config = '{
  "containerPadding": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerMargin": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerBackground": "transparent",
  "containerBorderRadius": 0,
  "containerMaxWidth": "100%",
  "containerDisplay": {
    "desktop": "block",
    "tablet": "block",
    "mobile": "block"
  },
  "containerWidth": {
    "desktop": "100%",
    "tablet": "100%",
    "mobile": "100%"
  },
  "visibilityRule": "always",
  "children": [
    {
      "id": "features-main-container",
      "type": "container",
      "position": 0,
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 80,
            "right": 24,
            "bottom": 80,
            "left": 24
          },
          "tablet": {
            "top": 60,
            "right": 20,
            "bottom": 60,
            "left": 20
          },
          "mobile": {
            "top": 48,
            "right": 16,
            "bottom": 48,
            "left": 16
          }
        },
        "containerMargin": {
          "desktop": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "tablet": {
            "top": 0,
            "right": "auto",
            "bottom": 0,
            "left": "auto"
          },
          "mobile": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "1200px",
        "containerDisplay": {
          "desktop": "flex",
          "tablet": "flex",
          "mobile": "flex"
        },
        "containerFlexDirection": {
          "desktop": "column",
          "tablet": "column",
          "mobile": "column"
        },
        "containerAlignItems": "center",
        "containerJustifyContent": "center",
        "containerWrap": "nowrap",
        "containerGap": {
          "desktop": 48,
          "tablet": 40,
          "mobile": 32
        },
        "children": [
          {
            "id": "features-header",
            "type": "container",
            "position": 0,
            "config": {
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "column",
                "tablet": "column",
                "mobile": "column"
              },
              "containerAlignItems": "center",
              "containerGap": {
                "desktop": 16,
                "tablet": 12,
                "mobile": 10
              },
              "children": [
                {
                  "id": "features-title",
                  "type": "text",
                  "position": 0,
                  "config": {
                    "text": "Everything You Need to Succeed",
                    "alignment": "center",
                    "fontSize": {
                      "desktop": 48,
                      "tablet": 36,
                      "mobile": 28
                    },
                    "textColor": "#ffffff",
                    "typography": {
                      "fontWeight": "bold",
                      "lineHeight": 1.2
                    }
                  }
                },
                {
                  "id": "features-subtitle",
                  "type": "text",
                  "position": 1,
                  "config": {
                    "text": "All the tools to run your online business, right out of the box",
                    "alignment": "center",
                    "fontSize": {
                      "desktop": 18,
                      "tablet": 16,
                      "mobile": 14
                    },
                    "textColor": "#94a3b8",
                    "typography": {
                      "lineHeight": 1.6
                    }
                  }
                }
              ]
            }
          },
          {
            "id": "features-grid",
            "type": "container",
            "position": 1,
            "config": {
              "containerDisplay": {
                "desktop": "grid",
                "tablet": "grid",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "row",
                "tablet": "row",
                "mobile": "column"
              },
              "containerGridCols": {
                "desktop": 3,
                "tablet": 2,
                "mobile": 1
              },
              "containerGap": {
                "desktop": 24,
                "tablet": 20,
                "mobile": 16
              },
              "containerAlignItems": "stretch",
              "containerWidth": {
                "desktop": "100%",
                "tablet": "100%",
                "mobile": "100%"
              },
              "children": [
                {
                  "id": "feature-card-1",
                  "type": "container",
                  "position": 0,
                  "config": {
                    "containerPadding": {
                      "desktop": {
                        "top": 32,
                        "right": 24,
                        "bottom": 32,
                        "left": 24
                      },
                      "tablet": {
                        "top": 24,
                        "right": 20,
                        "bottom": 24,
                        "left": 20
                      },
                      "mobile": {
                        "top": 24,
                        "right": 16,
                        "bottom": 24,
                        "left": 16
                      }
                    },
                    "containerBackground": "rgba(15, 23, 42, 0.6)",
                    "containerBorderRadius": 12,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "flex-start",
                    "containerGap": {
                      "desktop": 16,
                      "tablet": 12,
                      "mobile": 12
                    },
                    "children": [
                      {
                        "id": "feature-1-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "🎯",
                          "fontSize": {
                            "desktop": 48,
                            "tablet": 40,
                            "mobile": 36
                          }
                        }
                      },
                      {
                        "id": "feature-1-title",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Easy Setup",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#ffffff",
                          "typography": {
                            "fontWeight": "600"
                          }
                        }
                      },
                      {
                        "id": "feature-1-desc",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Get your online store up and running in minutes, no technical skills needed",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "feature-card-2",
                  "type": "container",
                  "position": 1,
                  "config": {
                    "containerPadding": {
                      "desktop": {
                        "top": 32,
                        "right": 24,
                        "bottom": 32,
                        "left": 24
                      },
                      "tablet": {
                        "top": 24,
                        "right": 20,
                        "bottom": 24,
                        "left": 20
                      },
                      "mobile": {
                        "top": 24,
                        "right": 16,
                        "bottom": 24,
                        "left": 16
                      }
                    },
                    "containerBackground": "rgba(15, 23, 42, 0.6)",
                    "containerBorderRadius": 12,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "flex-start",
                    "containerGap": {
                      "desktop": 16,
                      "tablet": 12,
                      "mobile": 12
                    },
                    "children": [
                      {
                        "id": "feature-2-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "✨",
                          "fontSize": {
                            "desktop": 48,
                            "tablet": 40,
                            "mobile": 36
                          }
                        }
                      },
                      {
                        "id": "feature-2-title",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Beautiful Design",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#ffffff",
                          "typography": {
                            "fontWeight": "600"
                          }
                        }
                      },
                      {
                        "id": "feature-2-desc",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Gorgeous, modern storefront that looks professional on any device",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "feature-card-3",
                  "type": "container",
                  "position": 2,
                  "config": {
                    "containerPadding": {
                      "desktop": {
                        "top": 32,
                        "right": 24,
                        "bottom": 32,
                        "left": 24
                      },
                      "tablet": {
                        "top": 24,
                        "right": 20,
                        "bottom": 24,
                        "left": 20
                      },
                      "mobile": {
                        "top": 24,
                        "right": 16,
                        "bottom": 24,
                        "left": 16
                      }
                    },
                    "containerBackground": "rgba(15, 23, 42, 0.6)",
                    "containerBorderRadius": 12,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "flex-start",
                    "containerGap": {
                      "desktop": 16,
                      "tablet": 12,
                      "mobile": 12
                    },
                    "children": [
                      {
                        "id": "feature-3-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "📦",
                          "fontSize": {
                            "desktop": 48,
                            "tablet": 40,
                            "mobile": 36
                          }
                        }
                      },
                      {
                        "id": "feature-3-title",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Manage Products",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#ffffff",
                          "typography": {
                            "fontWeight": "600"
                          }
                        }
                      },
                      {
                        "id": "feature-3-desc",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Simple dashboard to add, edit, and organize your products effortlessly",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "feature-card-4",
                  "type": "container",
                  "position": 3,
                  "config": {
                    "containerPadding": {
                      "desktop": {
                        "top": 32,
                        "right": 24,
                        "bottom": 32,
                        "left": 24
                      },
                      "tablet": {
                        "top": 24,
                        "right": 20,
                        "bottom": 24,
                        "left": 20
                      },
                      "mobile": {
                        "top": 24,
                        "right": 16,
                        "bottom": 24,
                        "left": 16
                      }
                    },
                    "containerBackground": "rgba(15, 23, 42, 0.6)",
                    "containerBorderRadius": 12,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "flex-start",
                    "containerGap": {
                      "desktop": 16,
                      "tablet": 12,
                      "mobile": 12
                    },
                    "children": [
                      {
                        "id": "feature-4-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "💳",
                          "fontSize": {
                            "desktop": 48,
                            "tablet": 40,
                            "mobile": 36
                          }
                        }
                      },
                      {
                        "id": "feature-4-title",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Accept Payments",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#ffffff",
                          "typography": {
                            "fontWeight": "600"
                          }
                        }
                      },
                      {
                        "id": "feature-4-desc",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Secure checkout ready to connect with your preferred payment processor",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "feature-card-5",
                  "type": "container",
                  "position": 4,
                  "config": {
                    "containerPadding": {
                      "desktop": {
                        "top": 32,
                        "right": 24,
                        "bottom": 32,
                        "left": 24
                      },
                      "tablet": {
                        "top": 24,
                        "right": 20,
                        "bottom": 24,
                        "left": 20
                      },
                      "mobile": {
                        "top": 24,
                        "right": 16,
                        "bottom": 24,
                        "left": 16
                      }
                    },
                    "containerBackground": "rgba(15, 23, 42, 0.6)",
                    "containerBorderRadius": 12,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "flex-start",
                    "containerGap": {
                      "desktop": 16,
                      "tablet": 12,
                      "mobile": 12
                    },
                    "children": [
                      {
                        "id": "feature-5-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "🎨",
                          "fontSize": {
                            "desktop": 48,
                            "tablet": 40,
                            "mobile": 36
                          }
                        }
                      },
                      {
                        "id": "feature-5-title",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Customize Everything",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#ffffff",
                          "typography": {
                            "fontWeight": "600"
                          }
                        }
                      },
                      {
                        "id": "feature-5-desc",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Make your store uniquely yours with flexible customization options",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "feature-card-6",
                  "type": "container",
                  "position": 5,
                  "config": {
                    "containerPadding": {
                      "desktop": {
                        "top": 32,
                        "right": 24,
                        "bottom": 32,
                        "left": 24
                      },
                      "tablet": {
                        "top": 24,
                        "right": 20,
                        "bottom": 24,
                        "left": 20
                      },
                      "mobile": {
                        "top": 24,
                        "right": 16,
                        "bottom": 24,
                        "left": 16
                      }
                    },
                    "containerBackground": "rgba(15, 23, 42, 0.6)",
                    "containerBorderRadius": 12,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "flex-start",
                    "containerGap": {
                      "desktop": 16,
                      "tablet": 12,
                      "mobile": 12
                    },
                    "children": [
                      {
                        "id": "feature-6-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "📱",
                          "fontSize": {
                            "desktop": 48,
                            "tablet": 40,
                            "mobile": 36
                          }
                        }
                      },
                      {
                        "id": "feature-6-title",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Mobile Ready",
                          "fontSize": {
                            "desktop": 20,
                            "tablet": 18,
                            "mobile": 16
                          },
                          "textColor": "#ffffff",
                          "typography": {
                            "fontWeight": "600"
                          }
                        }
                      },
                      {
                        "id": "feature-6-desc",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Your customers can shop from anywhere, on any device",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "textColor": "#94a3b8",
                          "typography": {
                            "lineHeight": 1.6
                          }
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
}',
  type = 'features',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Features' AND is_global = 1;

-- Primitive Components
-- Update Text primitive
UPDATE components
SET
  config = '{
  "text": "Enter your text here",
  "alignment": "left"
}',
  type = 'text',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Text' AND is_primitive = 1;

-- Update Heading primitive
UPDATE components
SET
  config = '{
  "heading": "Heading Text",
  "level": 2,
  "textColor": "theme:text"
}',
  type = 'heading',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Heading' AND is_primitive = 1;

-- Update Button primitive
UPDATE components
SET
  config = '{
  "label": "Click Here",
  "url": "#",
  "variant": "primary",
  "size": "medium",
  "fullWidth": {
    "desktop": false,
    "tablet": false,
    "mobile": true
  }
}',
  type = 'button',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Button' AND is_primitive = 1;

-- Update Image primitive
UPDATE components
SET
  config = '{
  "src": "",
  "alt": "",
  "imageWidth": "100%",
  "imageHeight": "auto"
}',
  type = 'image',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Image' AND is_primitive = 1;

-- Update Spacer primitive
UPDATE components
SET
  config = '{
  "space": {
    "desktop": 40,
    "tablet": 30,
    "mobile": 20
  }
}',
  type = 'spacer',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Spacer' AND is_primitive = 1;

-- Update Divider primitive
UPDATE components
SET
  config = '{
  "thickness": 1,
  "dividerColor": "theme:border",
  "dividerStyle": "solid",
  "spacing": {
    "desktop": 20,
    "tablet": 15,
    "mobile": 10
  }
}',
  type = 'divider',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Divider' AND is_primitive = 1;

-- Update Icon primitive
UPDATE components
SET
  config = '{
  "iconName": "Star",
  "iconSize": 24,
  "iconColor": "theme:text",
  "strokeWidth": 2,
  "alignment": "center"
}',
  type = 'icon',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Icon' AND is_primitive = 1;

-- Update Columns primitive
UPDATE components
SET
  config = '{
  "columnCount": {
    "desktop": 2,
    "tablet": 2,
    "mobile": 1
  },
  "gap": {
    "desktop": 20
  },
  "verticalAlign": "stretch"
}',
  type = 'columns',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Columns' AND is_primitive = 1;

-- Update Dropdown primitive
UPDATE components
SET
  config = '{
  "triggerLabel": "Menu",
  "triggerIcon": "",
  "triggerVariant": "text",
  "showChevron": true,
  "menuWidth": "200px",
  "menuAlign": "left",
  "menuBackground": "var(--color-bg-primary)",
  "menuBorderRadius": 8,
  "menuShadow": true,
  "menuPadding": {
    "top": 8,
    "right": 8,
    "bottom": 8,
    "left": 8
  },
  "children": []
}',
  type = 'dropdown',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Dropdown' AND is_primitive = 1;

-- Update Theme Toggle primitive
UPDATE components
SET
  config = '{
  "size": "medium",
  "toggleVariant": "icon",
  "alignment": "left"
}',
  type = 'theme_toggle',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Theme Toggle' AND is_primitive = 1;

-- Clean up component_widgets for built-in components (children are now inline in config)
DELETE FROM component_widgets
WHERE component_id IN (
  SELECT id FROM components WHERE is_global = 1
);
