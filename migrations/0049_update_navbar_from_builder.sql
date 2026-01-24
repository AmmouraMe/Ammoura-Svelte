-- Migration: 0049_update_navbar_from_builder
-- Description: Update Navigation Bar component to match the config designed in the builder
-- This includes the new container-based architecture with proper children structure
-- Rollback: See previous navbar migrations for restoration

-- Update the Navigation Bar component with the new config from the builder
UPDATE components
SET 
  config = '{
    "containerPadding": {
      "desktop": {"top": 16, "right": 24, "bottom": 16, "left": 24},
      "tablet": {"top": 12, "right": 20, "bottom": 12, "left": 20},
      "mobile": {"top": 12, "right": 16, "bottom": 12, "left": 16}
    },
    "containerMargin": {
      "desktop": {"top": 0, "right": "auto", "bottom": 0, "left": "auto"},
      "tablet": {"top": 0, "right": "auto", "bottom": 0, "left": "auto"},
      "mobile": {"top": 0, "right": 0, "bottom": 0, "left": 0}
    },
    "containerBackground": "theme:secondary",
    "containerBorderRadius": 0,
    "containerMaxWidth": "1400px",
    "containerJustifyContent": "space-between",
    "containerDisplay": {"desktop": "flex", "tablet": "flex", "mobile": "flex"},
    "containerFlexDirection": {"desktop": "row", "tablet": "row", "mobile": "column"},
    "containerAlignItems": "stretch",
    "containerWrap": "nowrap",
    "containerGap": {"desktop": 16, "tablet": 16, "mobile": 16},
    "containerWidth": {"desktop": "auto", "tablet": "auto", "mobile": "auto"},
    "containerGridCols": {"desktop": 3, "tablet": 2, "mobile": 1},
    "containerGridAutoFlow": {"desktop": "row", "tablet": "row", "mobile": "row"},
    "containerPlaceItems": null,
    "visibilityRule": "always",
    "position": "sticky",
    "positionType": "sticky",
    "children": [
      {
        "id": "logo-container",
        "type": "container",
        "config": {
          "containerPadding": {
            "desktop": {"top": 40, "right": 40, "bottom": 40, "left": 40},
            "tablet": {"top": 30, "right": 30, "bottom": 30, "left": 30},
            "mobile": {"top": 20, "right": 20, "bottom": 20, "left": 20}
          },
          "containerMargin": {
            "desktop": {"top": 0, "right": 0, "bottom": 0, "left": 0},
            "tablet": {"top": 0, "right": 0, "bottom": 0, "left": 0},
            "mobile": {"top": 0, "right": 0, "bottom": 0, "left": 0}
          },
          "containerBackground": "transparent",
          "containerBorderRadius": 0,
          "containerMaxWidth": "1200px",
          "containerGap": {"desktop": 16, "tablet": 12, "mobile": 8},
          "containerJustifyContent": "flex-start",
          "containerAlignItems": "center",
          "containerWrap": "wrap",
          "children": [
            {
              "id": "site-name-heading",
              "type": "heading",
              "config": {
                "heading": "${site.name}",
                "level": 2,
                "textColor": "theme:text",
                "link": "/"
              },
              "position": 0
            }
          ]
        },
        "position": 0
      },
      {
        "id": "nav-links-container",
        "type": "container",
        "config": {
          "containerPadding": {
            "desktop": {"top": 0, "right": 40, "bottom": 0, "left": 40},
            "tablet": {"top": 30, "right": 30, "bottom": 30, "left": 30},
            "mobile": {"top": 20, "right": 20, "bottom": 20, "left": 20}
          },
          "containerMargin": {
            "desktop": {"top": 0, "right": 0, "bottom": 0, "left": 0},
            "tablet": {"top": 0, "right": 0, "bottom": 0, "left": 0},
            "mobile": {"top": 0, "right": 0, "bottom": 0, "left": 0}
          },
          "containerBackground": "transparent",
          "containerBorderRadius": 0,
          "containerMaxWidth": "1200px",
          "containerGap": {"desktop": 16, "tablet": 12, "mobile": 8},
          "containerJustifyContent": "flex-end",
          "containerAlignItems": "center",
          "containerWrap": "wrap",
          "containerDisplay": {"desktop": "flex", "tablet": "flex", "mobile": "flex"},
          "containerFlexDirection": {"desktop": "row", "tablet": "row", "mobile": "column"},
          "containerWidth": {"desktop": "auto", "tablet": "auto", "mobile": "auto"},
          "containerGridCols": {"desktop": 3, "tablet": 2, "mobile": 1},
          "containerGridAutoFlow": {"desktop": "row", "tablet": "row", "mobile": "row"},
          "children": [
            {
              "id": "products-link",
              "type": "button",
              "config": {
                "label": "Products",
                "url": "/#products",
                "variant": "text",
                "size": "medium",
                "fullWidth": {"desktop": false, "tablet": false, "mobile": true}
              },
              "position": 0
            },
            {
              "id": "pricing-link",
              "type": "button",
              "config": {
                "label": "Pricing",
                "url": "/#pricing",
                "variant": "text",
                "size": "medium",
                "fullWidth": {"desktop": false, "tablet": false, "mobile": true}
              },
              "position": 1
            },
            {
              "id": "login-button",
              "type": "button",
              "config": {
                "label": "Login",
                "url": "/auth/login",
                "variant": "outline",
                "size": "medium",
                "fullWidth": {"desktop": false, "tablet": false, "mobile": true},
                "icon": "LogIn",
                "visibilityRule": "unauthenticated"
              },
              "position": 2
            },
            {
              "id": "user-dropdown",
              "type": "dropdown",
              "config": {
                "label": "Select Option",
                "placeholder": "Choose...",
                "options": [
                  {"value": "option1", "label": "Option 1"},
                  {"value": "option2", "label": "Option 2"},
                  {"value": "option3", "label": "Option 3"}
                ],
                "required": false,
                "searchable": false,
                "size": "medium",
                "defaultValue": "",
                "triggerIcon": "",
                "triggerVariant": "text",
                "menuAlign": "left",
                "triggerLabel": "${user.display_name}",
                "visibilityRule": "authenticated",
                "children": [
                  {
                    "id": "admin-dashboard-link",
                    "type": "button",
                    "config": {
                      "label": "Admin Dashboard",
                      "url": "/admin/dashboard",
                      "variant": "text",
                      "size": "medium",
                      "fullWidth": {"desktop": false, "tablet": false, "mobile": true},
                      "visibilityRule": "role",
                      "requiredRoles": ["admin"]
                    },
                    "position": 0
                  },
                  {
                    "id": "dropdown-divider",
                    "type": "divider",
                    "config": {
                      "thickness": 1,
                      "dividerColor": "theme:border",
                      "dividerStyle": "solid",
                      "spacing": {"desktop": 20, "tablet": 15, "mobile": 10}
                    },
                    "position": 1
                  },
                  {
                    "id": "logout-button",
                    "type": "button",
                    "config": {
                      "label": "Logout",
                      "url": "/auth/logout",
                      "variant": "text",
                      "size": "medium",
                      "fullWidth": {"desktop": false, "tablet": false, "mobile": true}
                    },
                    "position": 2
                  },
                  {
                    "id": "profile-button",
                    "type": "button",
                    "config": {
                      "label": "Profile",
                      "url": "#",
                      "variant": "text",
                      "size": "medium",
                      "fullWidth": {"desktop": false, "tablet": false, "mobile": true}
                    },
                    "position": 3
                  }
                ]
              },
              "position": 3
            },
            {
              "id": "cart-button",
              "type": "button",
              "config": {
                "label": "Cart",
                "url": "/cart",
                "variant": "text",
                "size": "medium",
                "fullWidth": {"desktop": false, "tablet": false, "mobile": true},
                "icon": "ShoppingCart"
              },
              "position": 4
            }
          ]
        },
        "position": 1
      }
    ]
  }',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' 
  AND is_global = 1;
