-- Migration: 0076_add_theme_toggle_to_navbar
-- Description: Add Theme Toggle component to the Navigation Bar's nav-links-container
-- This adds a theme toggle at the far right of the navbar (after the cart button)
-- Rollback: Manually remove the theme-toggle from the navbar config.children

-- Update the Navigation Bar component to add theme toggle
-- We need to update the JSON config to include the theme toggle in nav-links-container.children
UPDATE components
SET 
  config = json_set(
    config,
    '$.children[0].config.children[1].config.children',
    json(
      '[
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
                  "url": "/user/profile",
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
        },
        {
          "id": "theme-toggle",
          "type": "theme_toggle",
          "config": {
            "backgroundColor": "transparent",
            "size": "medium",
            "toggleVariant": "icon",
            "alignment": "center"
          },
          "position": 5
        }
      ]'
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' 
  AND is_global = 1;
