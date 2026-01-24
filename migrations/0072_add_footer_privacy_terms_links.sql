-- Migration: 0072_add_footer_privacy_terms_links
-- Description: Add Privacy Policy and Terms of Service links to the footer component's children
-- This adds the links to the built-in footer so they appear on all pages
-- Rollback: Re-run 0059_sync_builtin_components_with_defaults.sql (original version without these links)

-- Update Footer component with privacy and terms buttons
UPDATE components
SET
  config = '{
  "backgroundColor": "transparent",
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
          "url": "/privacy-policy"
        },
        {
          "text": "Terms of Service",
          "url": "/terms-of-service"
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
                },
                {
                  "id": "footer-privacy-btn",
                  "type": "button",
                  "position": 4,
                  "config": {
                    "label": "Privacy Policy",
                    "url": "/privacy-policy",
                    "variant": "text",
                    "size": "small",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    }
                  }
                },
                {
                  "id": "footer-terms-btn",
                  "type": "button",
                  "position": 5,
                  "config": {
                    "label": "Terms of Service",
                    "url": "/terms-of-service",
                    "variant": "text",
                    "size": "small",
                    "fullWidth": {
                      "desktop": false,
                      "tablet": false,
                      "mobile": true
                    }
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
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Footer' AND is_global = 1;
