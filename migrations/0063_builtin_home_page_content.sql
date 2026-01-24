-- Migration: 0063_builtin_home_page_content
-- Description: Add default content to the built-in Home page with hero, features, pricing, products, and CTA sections
-- This creates a published revision for the Home page so it renders properly on first load
-- Rollback: DELETE FROM page_revisions WHERE page_id = 'builtin-home-page';

-- Insert the default revision for the Home page
-- Note: Using INSERT OR IGNORE to be idempotent if re-run
INSERT OR IGNORE INTO page_revisions (
  id,
  page_id,
  revision_hash,
  parent_revision_id,
  title,
  slug,
  status,
  color_theme,
  widgets_snapshot,
  created_by,
  created_at,
  is_published,
  notes
)
VALUES (
  'builtin-home-rev-1',
  'builtin-home-page',
  'home0001',
  NULL,
  'Home',
  '/',
  'published',
  NULL,
  '[
    {
      "id": "home-hero",
      "type": "hero",
      "position": 0,
      "config": {
        "backgroundColor": "transparent",
        "containerPadding": {
          "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "tablet": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerMargin": {
          "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "tablet": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "100%",
        "containerMinHeight": { "desktop": "600px", "tablet": "500px", "mobile": "450px" },
        "containerDisplay": { "desktop": "block", "tablet": "block", "mobile": "block" },
        "containerWidth": { "desktop": "100%", "tablet": "100%", "mobile": "100%" },
        "visibilityRule": "always",
        "children": [
          {
            "id": "hero-main-container",
            "type": "container",
            "position": 0,
            "config": {
              "containerPadding": {
                "desktop": { "top": 80, "right": 24, "bottom": 80, "left": 24 },
                "tablet": { "top": 60, "right": 20, "bottom": 60, "left": 20 },
                "mobile": { "top": 48, "right": 16, "bottom": 48, "left": 16 }
              },
              "containerMargin": {
                "desktop": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
                "tablet": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
                "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
              },
              "containerBackground": "transparent",
              "containerBorderRadius": 0,
              "containerMaxWidth": "1200px",
              "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
              "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
              "containerAlignItems": "center",
              "containerJustifyContent": "center",
              "containerWrap": "nowrap",
              "containerGap": { "desktop": 24, "tablet": 20, "mobile": 16 },
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
                    "fullWidth": { "desktop": false, "tablet": false, "mobile": false },
                    "buttonAlign": "center",
                    "borderRadius": 999,
                    "backgroundColor": "theme:surface",
                    "textColor": "theme:text",
                    "borderColor": "theme:border",
                    "padding": { "desktop": { "top": 8, "right": 20, "bottom": 8, "left": 20 } },
                    "fontSize": { "desktop": 14, "tablet": 13, "mobile": 12 }
                  }
                },
                {
                  "id": "hero-title-container",
                  "type": "container",
                  "position": 1,
                  "config": {
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "column" },
                    "containerAlignItems": "center",
                    "containerJustifyContent": "center",
                    "containerGap": { "desktop": 12, "tablet": 10, "mobile": 4 },
                    "containerWrap": "wrap",
                    "children": [
                      {
                        "id": "hero-title-part1",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Create Your Own",
                          "alignment": "center",
                          "fontSize": { "desktop": 56, "tablet": 42, "mobile": 32 },
                          "textColor": "theme:text",
                          "typography": { "fontWeight": "bold", "lineHeight": 1.1 }
                        }
                      },
                      {
                        "id": "hero-title-part2",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Online Store",
                          "alignment": "center",
                          "fontSize": { "desktop": 56, "tablet": 42, "mobile": 32 },
                          "textColor": "theme:accent",
                          "typography": { "fontWeight": "bold", "lineHeight": 1.1 }
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
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                    "containerAlignItems": "center",
                    "containerGap": { "desktop": 8, "tablet": 6, "mobile": 4 },
                    "children": [
                      {
                        "id": "hero-subtitle-1",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Everything you need to start selling products online.",
                          "alignment": "center",
                          "fontSize": { "desktop": 20, "tablet": 18, "mobile": 16 },
                          "textColor": "theme:textSecondary",
                          "typography": { "lineHeight": 1.6 }
                        }
                      },
                      {
                        "id": "hero-subtitle-2",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "Simple, beautiful, and ready for your business.",
                          "alignment": "center",
                          "fontSize": { "desktop": 20, "tablet": 18, "mobile": 16 },
                          "textColor": "theme:accent",
                          "typography": { "fontWeight": "600", "lineHeight": 1.6 }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "hero-actions",
                  "type": "container",
                  "position": 3,
                  "config": {
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "column" },
                    "containerAlignItems": "center",
                    "containerJustifyContent": "center",
                    "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                    "containerMargin": { "desktop": { "top": 16, "right": 0, "bottom": 0, "left": 0 } },
                    "children": [
                      {
                        "id": "hero-btn-primary",
                        "type": "button",
                        "position": 0,
                        "config": {
                          "label": "See Example Store",
                          "url": "#products",
                          "variant": "primary",
                          "size": "large",
                          "fullWidth": { "desktop": false, "tablet": false, "mobile": true },
                          "backgroundColor": "theme:accent",
                          "textColor": "theme:text"
                        }
                      },
                      {
                        "id": "hero-btn-secondary",
                        "type": "button",
                        "position": 1,
                        "config": {
                          "label": "Start Your Store",
                          "url": "/auth/login",
                          "variant": "outline",
                          "size": "large",
                          "fullWidth": { "desktop": false, "tablet": false, "mobile": true },
                          "textColor": "theme:text",
                          "borderColor": "theme:border"
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "hero-stats",
                  "type": "container",
                  "position": 4,
                  "config": {
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "row" },
                    "containerAlignItems": "center",
                    "containerJustifyContent": "center",
                    "containerGap": { "desktop": 32, "tablet": 24, "mobile": 16 },
                    "containerMargin": { "desktop": { "top": 32, "right": 0, "bottom": 0, "left": 0 } },
                    "children": [
                      {
                        "id": "stat-1",
                        "type": "container",
                        "position": 0,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "center",
                          "children": [
                            {
                              "id": "stat-1-value",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "Simple",
                                "alignment": "center",
                                "fontSize": { "desktop": 24, "tablet": 20, "mobile": 18 },
                                "textColor": "theme:accent",
                                "typography": { "fontWeight": "bold" }
                              }
                            },
                            {
                              "id": "stat-1-label",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "SETUP",
                                "alignment": "center",
                                "fontSize": { "desktop": 12, "tablet": 11, "mobile": 10 },
                                "textColor": "theme:textSecondary",
                                "typography": { "letterSpacing": "0.1em" }
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "stat-divider-1",
                        "type": "divider",
                        "position": 1,
                        "config": {
                          "thickness": 1,
                          "dividerColor": "theme:border",
                          "dividerStyle": "solid",
                          "orientation": "vertical",
                          "spacing": { "desktop": 0, "tablet": 0, "mobile": 0 }
                        }
                      },
                      {
                        "id": "stat-2",
                        "type": "container",
                        "position": 2,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "center",
                          "children": [
                            {
                              "id": "stat-2-value",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "Beautiful",
                                "alignment": "center",
                                "fontSize": { "desktop": 24, "tablet": 20, "mobile": 18 },
                                "textColor": "theme:accent",
                                "typography": { "fontWeight": "bold" }
                              }
                            },
                            {
                              "id": "stat-2-label",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "DESIGN",
                                "alignment": "center",
                                "fontSize": { "desktop": 12, "tablet": 11, "mobile": 10 },
                                "textColor": "theme:textSecondary",
                                "typography": { "letterSpacing": "0.1em" }
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "stat-divider-2",
                        "type": "divider",
                        "position": 3,
                        "config": {
                          "thickness": 1,
                          "dividerColor": "theme:border",
                          "dividerStyle": "solid",
                          "orientation": "vertical",
                          "spacing": { "desktop": 0, "tablet": 0, "mobile": 0 }
                        }
                      },
                      {
                        "id": "stat-3",
                        "type": "container",
                        "position": 4,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "center",
                          "children": [
                            {
                              "id": "stat-3-value",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "Your",
                                "alignment": "center",
                                "fontSize": { "desktop": 24, "tablet": 20, "mobile": 18 },
                                "textColor": "theme:accent",
                                "typography": { "fontWeight": "bold" }
                              }
                            },
                            {
                              "id": "stat-3-label",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "BRAND",
                                "alignment": "center",
                                "fontSize": { "desktop": 12, "tablet": 11, "mobile": 10 },
                                "textColor": "theme:textSecondary",
                                "typography": { "letterSpacing": "0.1em" }
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
    {
      "id": "home-features",
      "type": "features",
      "position": 1,
      "config": {
        "backgroundColor": "transparent",
        "containerPadding": {
          "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "tablet": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerMargin": {
          "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "tablet": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "100%",
        "containerDisplay": { "desktop": "block", "tablet": "block", "mobile": "block" },
        "containerWidth": { "desktop": "100%", "tablet": "100%", "mobile": "100%" },
        "visibilityRule": "always",
        "children": [
          {
            "id": "features-main-container",
            "type": "container",
            "position": 0,
            "config": {
              "containerPadding": {
                "desktop": { "top": 80, "right": 24, "bottom": 80, "left": 24 },
                "tablet": { "top": 60, "right": 20, "bottom": 60, "left": 20 },
                "mobile": { "top": 48, "right": 16, "bottom": 48, "left": 16 }
              },
              "containerMargin": {
                "desktop": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
                "tablet": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
                "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
              },
              "containerBackground": "transparent",
              "containerBorderRadius": 0,
              "containerMaxWidth": "1200px",
              "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
              "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
              "containerAlignItems": "center",
              "containerJustifyContent": "center",
              "containerWrap": "nowrap",
              "containerGap": { "desktop": 48, "tablet": 40, "mobile": 32 },
              "children": [
                {
                  "id": "features-header",
                  "type": "container",
                  "position": 0,
                  "config": {
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                    "containerAlignItems": "center",
                    "containerGap": { "desktop": 16, "tablet": 12, "mobile": 10 },
                    "children": [
                      {
                        "id": "features-title",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "Everything You Need to Succeed",
                          "alignment": "center",
                          "fontSize": { "desktop": 48, "tablet": 36, "mobile": 28 },
                          "textColor": "theme:text",
                          "typography": { "fontWeight": "bold", "lineHeight": 1.2 }
                        }
                      },
                      {
                        "id": "features-subtitle",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "All the tools to run your online business, right out of the box",
                          "alignment": "center",
                          "fontSize": { "desktop": 18, "tablet": 16, "mobile": 14 },
                          "textColor": "theme:textSecondary",
                          "typography": { "lineHeight": 1.6 }
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
                    "containerDisplay": { "desktop": "grid", "tablet": "grid", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "column" },
                    "containerGridCols": { "desktop": 3, "tablet": 2, "mobile": 1 },
                    "containerGap": { "desktop": 24, "tablet": 20, "mobile": 16 },
                    "containerAlignItems": "stretch",
                    "containerWidth": { "desktop": "100%", "tablet": "100%", "mobile": "100%" },
                    "children": [
                      {
                        "id": "feature-card-1",
                        "type": "container",
                        "position": 0,
                        "config": {
                          "containerPadding": { "desktop": { "top": 32, "right": 24, "bottom": 32, "left": 24 } },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "flex-start",
                          "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                          "children": [
                            { "id": "f1-icon", "type": "text", "position": 0, "config": { "text": "🎯", "fontSize": { "desktop": 48 } } },
                            { "id": "f1-title", "type": "text", "position": 1, "config": { "text": "Easy Setup", "fontSize": { "desktop": 20 }, "textColor": "theme:text", "typography": { "fontWeight": "600" } } },
                            { "id": "f1-desc", "type": "text", "position": 2, "config": { "text": "Get your online store up and running in minutes, no technical skills needed", "fontSize": { "desktop": 15 }, "textColor": "theme:textSecondary", "typography": { "lineHeight": 1.6 } } }
                          ]
                        }
                      },
                      {
                        "id": "feature-card-2",
                        "type": "container",
                        "position": 1,
                        "config": {
                          "containerPadding": { "desktop": { "top": 32, "right": 24, "bottom": 32, "left": 24 } },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "flex-start",
                          "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                          "children": [
                            { "id": "f2-icon", "type": "text", "position": 0, "config": { "text": "✨", "fontSize": { "desktop": 48 } } },
                            { "id": "f2-title", "type": "text", "position": 1, "config": { "text": "Beautiful Design", "fontSize": { "desktop": 20 }, "textColor": "theme:text", "typography": { "fontWeight": "600" } } },
                            { "id": "f2-desc", "type": "text", "position": 2, "config": { "text": "Gorgeous, modern storefront that looks professional on any device", "fontSize": { "desktop": 15 }, "textColor": "theme:textSecondary", "typography": { "lineHeight": 1.6 } } }
                          ]
                        }
                      },
                      {
                        "id": "feature-card-3",
                        "type": "container",
                        "position": 2,
                        "config": {
                          "containerPadding": { "desktop": { "top": 32, "right": 24, "bottom": 32, "left": 24 } },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "flex-start",
                          "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                          "children": [
                            { "id": "f3-icon", "type": "text", "position": 0, "config": { "text": "📦", "fontSize": { "desktop": 48 } } },
                            { "id": "f3-title", "type": "text", "position": 1, "config": { "text": "Manage Products", "fontSize": { "desktop": 20 }, "textColor": "theme:text", "typography": { "fontWeight": "600" } } },
                            { "id": "f3-desc", "type": "text", "position": 2, "config": { "text": "Simple dashboard to add, edit, and organize your products effortlessly", "fontSize": { "desktop": 15 }, "textColor": "theme:textSecondary", "typography": { "lineHeight": 1.6 } } }
                          ]
                        }
                      },
                      {
                        "id": "feature-card-4",
                        "type": "container",
                        "position": 3,
                        "config": {
                          "containerPadding": { "desktop": { "top": 32, "right": 24, "bottom": 32, "left": 24 } },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "flex-start",
                          "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                          "children": [
                            { "id": "f4-icon", "type": "text", "position": 0, "config": { "text": "💳", "fontSize": { "desktop": 48 } } },
                            { "id": "f4-title", "type": "text", "position": 1, "config": { "text": "Accept Payments", "fontSize": { "desktop": 20 }, "textColor": "theme:text", "typography": { "fontWeight": "600" } } },
                            { "id": "f4-desc", "type": "text", "position": 2, "config": { "text": "Secure checkout ready to connect with your preferred payment processor", "fontSize": { "desktop": 15 }, "textColor": "theme:textSecondary", "typography": { "lineHeight": 1.6 } } }
                          ]
                        }
                      },
                      {
                        "id": "feature-card-5",
                        "type": "container",
                        "position": 4,
                        "config": {
                          "containerPadding": { "desktop": { "top": 32, "right": 24, "bottom": 32, "left": 24 } },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "flex-start",
                          "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                          "children": [
                            { "id": "f5-icon", "type": "text", "position": 0, "config": { "text": "🎨", "fontSize": { "desktop": 48 } } },
                            { "id": "f5-title", "type": "text", "position": 1, "config": { "text": "Customize Everything", "fontSize": { "desktop": 20 }, "textColor": "theme:text", "typography": { "fontWeight": "600" } } },
                            { "id": "f5-desc", "type": "text", "position": 2, "config": { "text": "Make your store uniquely yours with flexible customization options", "fontSize": { "desktop": 15 }, "textColor": "theme:textSecondary", "typography": { "lineHeight": 1.6 } } }
                          ]
                        }
                      },
                      {
                        "id": "feature-card-6",
                        "type": "container",
                        "position": 5,
                        "config": {
                          "containerPadding": { "desktop": { "top": 32, "right": 24, "bottom": 32, "left": 24 } },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "flex-start",
                          "containerGap": { "desktop": 16, "tablet": 12, "mobile": 12 },
                          "children": [
                            { "id": "f6-icon", "type": "text", "position": 0, "config": { "text": "📱", "fontSize": { "desktop": 48 } } },
                            { "id": "f6-title", "type": "text", "position": 1, "config": { "text": "Mobile Ready", "fontSize": { "desktop": 20 }, "textColor": "theme:text", "typography": { "fontWeight": "600" } } },
                            { "id": "f6-desc", "type": "text", "position": 2, "config": { "text": "Your customers can shop from anywhere, on any device", "fontSize": { "desktop": 15 }, "textColor": "theme:textSecondary", "typography": { "lineHeight": 1.6 } } }
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
    {
      "id": "home-pricing",
      "type": "pricing",
      "position": 2,
      "config": {
        "anchorName": "pricing",
        "backgroundColor": "transparent",
        "containerPadding": {
          "desktop": { "top": 80, "right": 24, "bottom": 80, "left": 24 },
          "tablet": { "top": 60, "right": 20, "bottom": 60, "left": 20 },
          "mobile": { "top": 48, "right": 16, "bottom": 48, "left": 16 }
        },
        "containerMargin": {
          "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "tablet": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerBackground": "transparent",
        "containerBorderRadius": 0,
        "containerMaxWidth": "100%",
        "containerMinHeight": { "desktop": "auto", "tablet": "auto", "mobile": "auto" },
        "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
        "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
        "containerAlignItems": "center",
        "containerJustifyContent": "center",
        "containerGap": { "desktop": 48, "tablet": 40, "mobile": 32 },
        "visibilityRule": "always",
        "children": [
          {
            "id": "pricing-header",
            "type": "container",
            "position": 0,
            "config": {
              "containerPadding": { "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 } },
              "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
              "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
              "containerAlignItems": "center",
              "containerJustifyContent": "center",
              "containerGap": { "desktop": 16, "tablet": 12, "mobile": 8 },
              "containerMaxWidth": "800px",
              "children": [
                {
                  "id": "pricing-icon",
                  "type": "text",
                  "position": 0,
                  "config": {
                    "text": "🚀",
                    "alignment": "center",
                    "fontSize": { "desktop": 48, "tablet": 40, "mobile": 36 }
                  }
                },
                {
                  "id": "pricing-title",
                  "type": "heading",
                  "position": 1,
                  "config": {
                    "heading": "Hermes eCommerce Pricing",
                    "level": 2,
                    "textColor": "theme:text",
                    "alignment": "center",
                    "fontSize": { "desktop": 48, "tablet": 40, "mobile": 32 },
                    "fontWeight": 800
                  }
                },
                {
                  "id": "pricing-tagline",
                  "type": "text",
                  "position": 2,
                  "config": {
                    "text": "Zero monthly fees. We win when you win.",
                    "alignment": "center",
                    "textColor": "theme:textSecondary",
                    "fontSize": { "desktop": 20, "tablet": 18, "mobile": 16 },
                    "fontWeight": 500
                  }
                },
                {
                  "id": "pricing-subtitle",
                  "type": "text",
                  "position": 3,
                  "config": {
                    "text": "Every store gets full access — we only earn a small % per sale.",
                    "alignment": "center",
                    "textColor": "theme:textSecondary",
                    "fontSize": { "desktop": 16, "tablet": 15, "mobile": 14 }
                  }
                }
              ]
            }
          },
          {
            "id": "pricing-cards",
            "type": "container",
            "position": 1,
            "config": {
              "containerPadding": { "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 } },
              "containerDisplay": { "desktop": "grid", "tablet": "grid", "mobile": "flex" },
              "containerGridCols": { "desktop": 2, "tablet": 2, "mobile": 1 },
              "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "column" },
              "containerGap": { "desktop": 32, "tablet": 24, "mobile": 24 },
              "containerMaxWidth": "1200px",
              "containerWidth": { "desktop": "100%", "tablet": "100%", "mobile": "100%" },
              "children": [
                {
                  "id": "features-card",
                  "type": "container",
                  "position": 0,
                  "config": {
                    "containerPadding": {
                      "desktop": { "top": 32, "right": 32, "bottom": 32, "left": 32 },
                      "tablet": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
                      "mobile": { "top": 24, "right": 20, "bottom": 24, "left": 20 }
                    },
                    "containerBackground": "theme:surface",
                    "containerBorderRadius": 16,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                    "containerGap": { "desktop": 24, "tablet": 20, "mobile": 16 },
                    "children": [
                      {
                        "id": "features-header",
                        "type": "container",
                        "position": 0,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "center",
                          "containerGap": { "desktop": 8, "tablet": 8, "mobile": 6 },
                          "children": [
                            {
                              "id": "features-icon",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "💰",
                                "alignment": "center",
                                "fontSize": { "desktop": 40, "tablet": 36, "mobile": 32 }
                              }
                            },
                            {
                              "id": "features-title",
                              "type": "heading",
                              "position": 1,
                              "config": {
                                "heading": "Pay-as-You-Grow",
                                "level": 3,
                                "textColor": "theme:text",
                                "alignment": "center",
                                "fontSize": { "desktop": 24, "tablet": 22, "mobile": 20 },
                                "fontWeight": 700
                              }
                            },
                            {
                              "id": "features-subtitle",
                              "type": "text",
                              "position": 2,
                              "config": {
                                "text": "All features included, always.",
                                "alignment": "center",
                                "textColor": "theme:textSecondary",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 }
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "features-list",
                        "type": "container",
                        "position": 1,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerGap": { "desktop": 0, "tablet": 0, "mobile": 0 },
                          "children": [
                            {
                              "id": "feature-1",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "✓ Unlimited products",
                                "textColor": "theme:text",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 },
                                "padding": { "desktop": { "top": 16, "right": 0, "bottom": 16, "left": 0 } },
                                "borderBottom": "1px solid theme:border"
                              }
                            },
                            {
                              "id": "feature-2",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "✓ Free custom domain (optional)",
                                "textColor": "theme:text",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 },
                                "padding": { "desktop": { "top": 16, "right": 0, "bottom": 16, "left": 0 } },
                                "borderBottom": "1px solid theme:border"
                              }
                            },
                            {
                              "id": "feature-3",
                              "type": "text",
                              "position": 2,
                              "config": {
                                "text": "✓ AI-powered builder (voice + text)",
                                "textColor": "theme:text",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 },
                                "padding": { "desktop": { "top": 16, "right": 0, "bottom": 16, "left": 0 } },
                                "borderBottom": "1px solid theme:border"
                              }
                            },
                            {
                              "id": "feature-4",
                              "type": "text",
                              "position": 3,
                              "config": {
                                "text": "✓ Real-time analytics",
                                "textColor": "theme:text",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 },
                                "padding": { "desktop": { "top": 16, "right": 0, "bottom": 16, "left": 0 } },
                                "borderBottom": "1px solid theme:border"
                              }
                            },
                            {
                              "id": "feature-5",
                              "type": "text",
                              "position": 4,
                              "config": {
                                "text": "✓ Secure checkout (credit card/crypto)",
                                "textColor": "theme:text",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 },
                                "padding": { "desktop": { "top": 16, "right": 0, "bottom": 16, "left": 0 } },
                                "borderBottom": "1px solid theme:border"
                              }
                            },
                            {
                              "id": "feature-6",
                              "type": "text",
                              "position": 5,
                              "config": {
                                "text": "✓ AI product video generator",
                                "textColor": "theme:text",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 },
                                "padding": { "desktop": { "top": 16, "right": 0, "bottom": 16, "left": 0 } }
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "tiers-card",
                  "type": "container",
                  "position": 1,
                  "config": {
                    "containerPadding": {
                      "desktop": { "top": 32, "right": 32, "bottom": 32, "left": 32 },
                      "tablet": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
                      "mobile": { "top": 24, "right": 20, "bottom": 24, "left": 20 }
                    },
                    "containerBackground": "theme:surface",
                    "containerBorderRadius": 16,
                    "containerBorderWidth": 1,
                    "containerBorderColor": "theme:border",
                    "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                    "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                    "containerGap": { "desktop": 24, "tablet": 20, "mobile": 16 },
                    "children": [
                      {
                        "id": "tiers-header",
                        "type": "container",
                        "position": 0,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerAlignItems": "center",
                          "containerGap": { "desktop": 8, "tablet": 8, "mobile": 6 },
                          "children": [
                            {
                              "id": "tiers-icon",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "💎",
                                "alignment": "center",
                                "fontSize": { "desktop": 40, "tablet": 36, "mobile": 32 }
                              }
                            },
                            {
                              "id": "tiers-title",
                              "type": "heading",
                              "position": 1,
                              "config": {
                                "heading": "Revenue Share",
                                "level": 3,
                                "textColor": "theme:text",
                                "alignment": "center",
                                "fontSize": { "desktop": 24, "tablet": 22, "mobile": 20 },
                                "fontWeight": 700
                              }
                            },
                            {
                              "id": "tiers-subtitle",
                              "type": "text",
                              "position": 2,
                              "config": {
                                "text": "Includes payment processor fees",
                                "alignment": "center",
                                "textColor": "theme:textSecondary",
                                "fontSize": { "desktop": 15, "tablet": 14, "mobile": 14 }
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "tiers-table",
                        "type": "container",
                        "position": 1,
                        "config": {
                          "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                          "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                          "containerGap": { "desktop": 8, "tablet": 6, "mobile": 6 },
                          "children": [
                            {
                              "id": "table-header",
                              "type": "container",
                              "position": 0,
                              "config": {
                                "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "row" },
                                "containerJustifyContent": "space-between",
                                "containerPadding": { "desktop": { "top": 8, "right": 16, "bottom": 8, "left": 16 } },
                                "children": [
                                  {
                                    "id": "header-sales",
                                    "type": "text",
                                    "position": 0,
                                    "config": {
                                      "text": "MONTHLY SALES",
                                      "textColor": "theme:textSecondary",
                                      "fontSize": { "desktop": 11, "tablet": 10, "mobile": 10 },
                                      "fontWeight": 600,
                                      "letterSpacing": "0.05em"
                                    }
                                  },
                                  {
                                    "id": "header-fee",
                                    "type": "text",
                                    "position": 1,
                                    "config": {
                                      "text": "FEE",
                                      "textColor": "theme:textSecondary",
                                      "fontSize": { "desktop": 11, "tablet": 10, "mobile": 10 },
                                      "fontWeight": 600,
                                      "letterSpacing": "0.05em"
                                    }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-1",
                              "type": "container",
                              "position": 1,
                              "config": {
                                "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "row" },
                                "containerJustifyContent": "space-between",
                                "containerAlignItems": "center",
                                "containerPadding": { "desktop": { "top": 16, "right": 20, "bottom": 16, "left": 20 } },
                                "containerBackground": "theme:surface",
                                "containerBorderRadius": 12,
                                "containerBorderWidth": 1,
                                "containerBorderColor": "theme:border",
                                "children": [
                                  {
                                    "id": "tier-1-info",
                                    "type": "container",
                                    "position": 0,
                                    "config": {
                                      "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                      "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                                      "containerGap": { "desktop": 4, "tablet": 4, "mobile": 2 },
                                      "children": [
                                        {
                                          "id": "tier-1-range",
                                          "type": "text",
                                          "position": 0,
                                          "config": { "text": "$0 – $1,000", "textColor": "theme:text", "fontSize": { "desktop": 16, "tablet": 15, "mobile": 14 }, "fontWeight": 600 }
                                        },
                                        {
                                          "id": "tier-1-desc",
                                          "type": "text",
                                          "position": 1,
                                          "config": { "text": "Perfect for getting started", "textColor": "theme:textSecondary", "fontSize": { "desktop": 14, "tablet": 13, "mobile": 12 } }
                                        }
                                      ]
                                    }
                                  },
                                  {
                                    "id": "tier-1-fee",
                                    "type": "text",
                                    "position": 1,
                                    "config": { "text": "8%", "textColor": "theme:accent", "fontSize": { "desktop": 28, "tablet": 24, "mobile": 22 }, "fontWeight": 700 }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-2",
                              "type": "container",
                              "position": 2,
                              "config": {
                                "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "row" },
                                "containerJustifyContent": "space-between",
                                "containerAlignItems": "center",
                                "containerPadding": { "desktop": { "top": 16, "right": 20, "bottom": 16, "left": 20 } },
                                "containerBackground": "theme:surface",
                                "containerBorderRadius": 12,
                                "containerBorderWidth": 1,
                                "containerBorderColor": "theme:border",
                                "children": [
                                  {
                                    "id": "tier-2-info",
                                    "type": "container",
                                    "position": 0,
                                    "config": {
                                      "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                      "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                                      "containerGap": { "desktop": 4, "tablet": 4, "mobile": 2 },
                                      "children": [
                                        {
                                          "id": "tier-2-range",
                                          "type": "text",
                                          "position": 0,
                                          "config": { "text": "$1,001 – $5,000", "textColor": "theme:text", "fontSize": { "desktop": 16, "tablet": 15, "mobile": 14 }, "fontWeight": 600 }
                                        },
                                        {
                                          "id": "tier-2-desc",
                                          "type": "text",
                                          "position": 1,
                                          "config": { "text": "Growing your business", "textColor": "theme:textSecondary", "fontSize": { "desktop": 14, "tablet": 13, "mobile": 12 } }
                                        }
                                      ]
                                    }
                                  },
                                  {
                                    "id": "tier-2-fee",
                                    "type": "text",
                                    "position": 1,
                                    "config": { "text": "6%", "textColor": "theme:accent", "fontSize": { "desktop": 28, "tablet": 24, "mobile": 22 }, "fontWeight": 700 }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-3",
                              "type": "container",
                              "position": 3,
                              "config": {
                                "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "row" },
                                "containerJustifyContent": "space-between",
                                "containerAlignItems": "center",
                                "containerPadding": { "desktop": { "top": 16, "right": 20, "bottom": 16, "left": 20 } },
                                "containerBackground": "theme:surface",
                                "containerBorderRadius": 12,
                                "containerBorderWidth": 1,
                                "containerBorderColor": "theme:border",
                                "children": [
                                  {
                                    "id": "tier-3-info",
                                    "type": "container",
                                    "position": 0,
                                    "config": {
                                      "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                      "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                                      "containerGap": { "desktop": 4, "tablet": 4, "mobile": 2 },
                                      "children": [
                                        {
                                          "id": "tier-3-range",
                                          "type": "text",
                                          "position": 0,
                                          "config": { "text": "$5,001 – $20,000", "textColor": "theme:text", "fontSize": { "desktop": 16, "tablet": 15, "mobile": 14 }, "fontWeight": 600 }
                                        },
                                        {
                                          "id": "tier-3-desc",
                                          "type": "text",
                                          "position": 1,
                                          "config": { "text": "Established sales", "textColor": "theme:textSecondary", "fontSize": { "desktop": 14, "tablet": 13, "mobile": 12 } }
                                        }
                                      ]
                                    }
                                  },
                                  {
                                    "id": "tier-3-fee",
                                    "type": "text",
                                    "position": 1,
                                    "config": { "text": "4%", "textColor": "theme:accent", "fontSize": { "desktop": 28, "tablet": 24, "mobile": 22 }, "fontWeight": 700 }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-4",
                              "type": "container",
                              "position": 4,
                              "config": {
                                "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                "containerFlexDirection": { "desktop": "row", "tablet": "row", "mobile": "row" },
                                "containerJustifyContent": "space-between",
                                "containerAlignItems": "center",
                                "containerPadding": { "desktop": { "top": 16, "right": 20, "bottom": 16, "left": 20 } },
                                "containerBackground": "theme:surface",
                                "containerBorderRadius": 12,
                                "containerBorderWidth": 2,
                                "containerBorderColor": "theme:accent",
                                "children": [
                                  {
                                    "id": "tier-4-info",
                                    "type": "container",
                                    "position": 0,
                                    "config": {
                                      "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
                                      "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
                                      "containerGap": { "desktop": 4, "tablet": 4, "mobile": 2 },
                                      "children": [
                                        {
                                          "id": "tier-4-range",
                                          "type": "text",
                                          "position": 0,
                                          "config": { "text": "$20,001+", "textColor": "theme:text", "fontSize": { "desktop": 16, "tablet": 15, "mobile": 14 }, "fontWeight": 600 }
                                        },
                                        {
                                          "id": "tier-4-desc",
                                          "type": "text",
                                          "position": 1,
                                          "config": { "text": "High volume discounts", "textColor": "theme:textSecondary", "fontSize": { "desktop": 14, "tablet": 13, "mobile": 12 } }
                                        }
                                      ]
                                    }
                                  },
                                  {
                                    "id": "tier-4-fee",
                                    "type": "text",
                                    "position": 1,
                                    "config": { "text": "3%", "textColor": "theme:accent", "fontSize": { "desktop": 28, "tablet": 24, "mobile": 22 }, "fontWeight": 700 }
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
          {
            "id": "pricing-cta",
            "type": "container",
            "position": 2,
            "config": {
              "containerPadding": { "desktop": { "top": 0, "right": 0, "bottom": 0, "left": 0 } },
              "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
              "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
              "containerAlignItems": "center",
              "containerGap": { "desktop": 16, "tablet": 12, "mobile": 8 },
              "children": [
                {
                  "id": "cta-button",
                  "type": "button",
                  "position": 0,
                  "config": {
                    "label": "Get Started Free →",
                    "url": "/auth/login",
                    "variant": "filled",
                    "size": "large",
                    "fullWidth": { "desktop": false, "tablet": false, "mobile": true },
                    "borderRadius": 12,
                    "backgroundColor": "theme:accent",
                    "textColor": "theme:text",
                    "padding": { "desktop": { "top": 16, "right": 40, "bottom": 16, "left": 40 } },
                    "fontSize": { "desktop": 18, "tablet": 16, "mobile": 16 },
                    "fontWeight": 600
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "id": "home-products",
      "type": "container",
      "position": 3,
      "config": {
        "anchorName": "products",
        "containerPadding": {
          "desktop": { "top": 80, "right": 24, "bottom": 80, "left": 24 },
          "tablet": { "top": 60, "right": 20, "bottom": 60, "left": 20 },
          "mobile": { "top": 48, "right": 16, "bottom": 48, "left": 16 }
        },
        "containerMargin": {
          "desktop": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
          "tablet": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerBackground": "transparent",
        "containerMaxWidth": "1200px",
        "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
        "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
        "containerAlignItems": "center",
        "containerGap": { "desktop": 48, "tablet": 40, "mobile": 32 },
        "children": [
          {
            "id": "products-header",
            "type": "container",
            "position": 0,
            "config": {
              "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
              "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
              "containerAlignItems": "center",
              "containerGap": { "desktop": 16, "tablet": 12, "mobile": 10 },
              "children": [
                {
                  "id": "products-title",
                  "type": "text",
                  "position": 0,
                  "config": {
                    "text": "Example Store",
                    "alignment": "center",
                    "fontSize": { "desktop": 48, "tablet": 36, "mobile": 28 },
                    "textColor": "theme:text",
                    "typography": { "fontWeight": "bold", "lineHeight": 1.2 }
                  }
                },
                {
                  "id": "products-subtitle",
                  "type": "text",
                  "position": 1,
                  "config": {
                    "text": "Here is what your store could look like - this is a real, working example",
                    "alignment": "center",
                    "fontSize": { "desktop": 18, "tablet": 16, "mobile": 14 },
                    "textColor": "theme:textSecondary",
                    "typography": { "lineHeight": 1.6 }
                  }
                }
              ]
            }
          },
          {
            "id": "products-list",
            "type": "product_list",
            "position": 1,
            "config": {
              "category": "",
              "limit": 6,
              "sortBy": "created_at",
              "sortOrder": "desc",
              "columns": { "desktop": 3, "tablet": 2, "mobile": 1 },
              "backgroundColor": "transparent"
            }
          }
        ]
      }
    },
    {
      "id": "home-cta",
      "type": "container",
      "position": 4,
      "config": {
        "containerPadding": {
          "desktop": { "top": 80, "right": 24, "bottom": 80, "left": 24 },
          "tablet": { "top": 60, "right": 20, "bottom": 60, "left": 20 },
          "mobile": { "top": 48, "right": 16, "bottom": 48, "left": 16 }
        },
        "containerMargin": {
          "desktop": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
          "tablet": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
          "mobile": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
        },
        "containerBackground": "theme:surface",
        "containerBorderRadius": 16,
        "containerMaxWidth": "800px",
        "containerDisplay": { "desktop": "flex", "tablet": "flex", "mobile": "flex" },
        "containerFlexDirection": { "desktop": "column", "tablet": "column", "mobile": "column" },
        "containerAlignItems": "center",
        "containerGap": { "desktop": 24, "tablet": 20, "mobile": 16 },
        "children": [
          {
            "id": "cta-title",
            "type": "text",
            "position": 0,
            "config": {
              "text": "Ready to Start Your Business?",
              "alignment": "center",
              "fontSize": { "desktop": 36, "tablet": 28, "mobile": 24 },
              "textColor": "theme:text",
              "typography": { "fontWeight": "bold", "lineHeight": 1.2 }
            }
          },
          {
            "id": "cta-subtitle",
            "type": "text",
            "position": 1,
            "config": {
              "text": "Join entrepreneurs around the world who are building their dreams with their own online stores.",
              "alignment": "center",
              "fontSize": { "desktop": 18, "tablet": 16, "mobile": 14 },
              "textColor": "theme:textSecondary",
              "typography": { "lineHeight": 1.6 }
            }
          },
          {
            "id": "cta-button",
            "type": "button",
            "position": 2,
            "config": {
              "label": "Create Your Store",
              "url": "/auth/login",
              "variant": "primary",
              "size": "large",
              "fullWidth": { "desktop": false, "tablet": false, "mobile": true },
              "backgroundColor": "theme:accent",
              "textColor": "theme:text"
            }
          }
        ]
      }
    }
  ]',
  'system',
  strftime('%s', 'now'),
  1,
  'Initial built-in home page content'
);

-- Update the page status to published since we have published content
UPDATE pages 
SET status = 'published', 
    updated_at = strftime('%s', 'now')
WHERE id = 'builtin-home-page';
