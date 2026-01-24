# Default Navigation Bar Component Enhancement

## Overview

The "Default Navigation Bar" component in the Components section now uses the
full-featured navbar widget configuration, allowing site builders to edit all
navbar properties including logo, navigation links, actions, account menu items,
styling, and responsive behavior.

## What Changed

### Database Migration: 0028_update_navbar_component.sql

Updated all existing "Default Navigation Bar" components in the database to use
the comprehensive navbar configuration that matches the navbar widget's
capabilities.

**Previous Config (Limited):**

```json
{
  "logo": { "text": "Store", "url": "/" },
  "links": [
    { "text": "Home", "url": "/" },
    { "text": "Products", "url": "/products" },
    { "text": "About", "url": "/about" },
    { "text": "Contact", "url": "/contact" }
  ],
  "style": { "background": "#ffffff", "text": "#000000" }
}
```

**New Config (Comprehensive):**

```json
{
  // Logo configuration
  "logo": { "text": "Store", "url": "/", "image": "", "imageHeight": 40 },
  "logoPosition": "left",

  // Navigation links
  "links": [
    { "text": "Home", "url": "/" },
    { "text": "Products", "url": "/products" },
    { "text": "About", "url": "/about" },
    { "text": "Contact", "url": "/contact" }
  ],
  "linksPosition": "center",

  // Action buttons
  "showSearch": false,
  "showCart": true,
  "showAuth": true,
  "showThemeToggle": true,
  "showAccountMenu": true,
  "actionsPosition": "right",

  // Account menu items
  "accountMenuItems": [
    { "text": "Profile", "url": "/user/profile", "icon": "👤" },
    {
      "text": "Settings",
      "url": "/settings",
      "icon": "⚙️",
      "dividerBefore": true
    }
  ],

  // Styling
  "navbarBackground": "#ffffff",
  "navbarTextColor": "#000000",
  "navbarHoverColor": "var(--color-primary)",
  "navbarBorderColor": "#e5e7eb",
  "navbarShadow": false,
  "sticky": true,
  "navbarHeight": 0,
  "navbarPadding": {
    "desktop": { "top": 16, "right": 24, "bottom": 16, "left": 24 },
    "tablet": { "top": 12, "right": 20, "bottom": 12, "left": 20 },
    "mobile": { "top": 12, "right": 16, "bottom": 12, "left": 16 }
  },

  // Dropdown styling
  "dropdownBackground": "#ffffff",
  "dropdownTextColor": "#000000",
  "dropdownHoverBackground": "#f3f4f6",

  // Mobile
  "mobileBreakpoint": 768
}
```

## How to Use

### Editing the Default Navigation Bar

1. **Navigate to Components**
   - Go to `/admin/components` in your admin dashboard
   - You'll see the "Default Navigation Bar" listed with a "Navigation Bar"
     badge

2. **Click Edit**
   - Click the "Edit" button on the Default Navigation Bar card
   - This opens the component builder at `/admin/builder/component/{id}`

3. **Configure in the Builder**
   - The component builder now shows full navbar configuration options
   - Use the properties panel on the right to configure:
     - **Content Tab**: Logo, navigation links, actions, account menu items
     - **Style Tab**: Colors, dropdown styling, layout options
     - **Responsive Tab**: Padding per breakpoint (desktop/tablet/mobile)

4. **Save Changes**
   - Click "Save" to update the component
   - All pages/layouts using this component will immediately reflect the changes

### Configuration Options

#### Logo Configuration

- **Text**: Logo text (e.g., "Store")
- **URL**: Logo link (usually "/")
- **Image**: Logo image URL (leave empty for text-only)
- **Image Height**: Logo image height in pixels

#### Navigation Links

- **Add/Remove Links**: Use the + button to add links, trash icon to remove
- **Link Properties**:
  - Text: Display text
  - URL: Link destination
  - Children: Nested links for dropdown menus
  - Open in New Tab: Optional external link behavior

#### Actions

- **Show Search**: Toggle search button (not yet implemented)
- **Show Cart**: Toggle cart icon with badge
- **Show Auth**: Toggle login/logout button
- **Show Theme Toggle**: Toggle light/dark mode switcher
- **Show Account Menu**: Toggle account dropdown with avatar

#### Account Menu Items

- **Add Custom Items**: Add profile, settings, or custom menu items
- **Item Properties**:
  - Text: Menu item text
  - URL: Link destination
  - Icon: Emoji or icon (e.g., 👤, ⚙️)
  - Divider Before: Add separator line above item

#### Styling

- **Background Color**: Navbar background (default: #ffffff)
- **Text Color**: Link text color (default: #000000)
- **Hover Color**: Link hover color (default: primary color)
- **Border Color**: Bottom border color (default: #e5e7eb)
- **Shadow**: Toggle drop shadow
- **Sticky**: Toggle sticky header on scroll
- **Dropdown Colors**: Background, text, and hover colors for dropdown menus

#### Responsive Settings

- **Padding**: Configure padding per breakpoint
  - Desktop (>1024px)
  - Tablet (768-1024px)
  - Mobile (<768px)
- **Mobile Breakpoint**: When to switch to mobile menu (default: 768px)

## Technical Details

### Component Architecture

```typescript
// Component record in database
interface Component {
  id: number;
  site_id: number;
  name: string; // "Default Navigation Bar"
  description: string;
  type: string; // "navbar"
  config: WidgetConfig; // Comprehensive navbar config
  is_global: boolean;
  created_at: string;
  updated_at: string;
}
```

### How Components Work

1. **Components are Reusable Widgets**
   - Stored in the `components` table
   - Can be used across multiple pages and layouts
   - Changes to a component affect all instances

2. **Layout Integration**
   - Layouts reference components via `componentId` in their widget config
   - When a layout renders, it loads the component's current config
   - Example layout widget: `{ type: 'navbar', componentId: 1 }`

3. **Component Builder**
   - Located at `/admin/builder/component/{id}`
   - Uses the same `AdvancedBuilder` as page builder
   - Saves only the first widget's config to the component record

### Migration Details

**File**: `migrations/0028_update_navbar_component.sql`

**What it does**:

- Updates all existing navbar components (where `type = 'navbar'`)
- Replaces the simple config with comprehensive navbar config
- Sets `updated_at` to current timestamp
- Only affects components named "Default Navigation Bar"

**To apply**:

```bash
# Local development
npm run db:migrate:local

# Preview environment
npm run db:migrate:preview

# Production (automatic on deploy)
npm run deploy
```

## Benefits

### Before (Limited Config)

- Could only edit logo text and basic links
- No control over colors, spacing, or responsive behavior
- No support for account menu, theme toggle, or cart
- Had to edit JSON manually for advanced features

### After (Full Config)

- Visual configuration for all navbar features
- Logo image support with height control
- Dropdown navigation support (nested links)
- Account menu with custom items
- Theme toggle integration
- Cart badge integration
- Full color customization
- Responsive padding per breakpoint
- Mobile hamburger menu configuration
- Position controls for logo, links, and actions

## Related Documentation

- **NAVBAR_WIDGET.md**: Full navbar widget documentation
- **WYSIWYG_PAGE_BUILDER.md**: Page builder overview
- **MULTI_TENANT.md**: Component multi-tenancy
- **COMPONENT_DIAGRAM.md**: Component architecture

## Best Practices

1. **Use Components for Consistent UI**
   - Edit the Default Navigation Bar component once
   - All layouts using it will update automatically
   - Ensures consistency across your site

2. **Create Custom Components**
   - Clone the Default Navigation Bar for variations
   - Create site-specific navbar components
   - Use different components for different layouts

3. **Leverage Responsive Settings**
   - Configure appropriate padding for each breakpoint
   - Test mobile menu behavior
   - Ensure logo scales properly on mobile

4. **Theme Integration**
   - Use theme color variables (`var(--color-primary)`)
   - Enable theme toggle for user preference
   - Test navbar in both light and dark modes

## Troubleshooting

### Component Not Updating

**Issue**: Changes to component don't appear on site

**Solution**:

- Ensure you clicked "Save" in the builder
- Refresh the page to clear cache
- Check that the layout is using the correct component ID

### Properties Panel Not Showing Options

**Issue**: Properties panel doesn't show navbar options

**Solution**:

- Verify the component type is "navbar"
- Check browser console for errors
- Ensure migration 0028 was applied successfully

### Mobile Menu Not Working

**Issue**: Hamburger menu doesn't appear on mobile

**Solution**:

- Check `mobileBreakpoint` value (default: 768)
- Verify viewport is below breakpoint
- Check for CSS conflicts in browser DevTools

## Future Enhancements

- [ ] Search functionality for navbar
- [ ] Mega menu support for multi-column dropdowns
- [ ] Animation options for dropdowns
- [ ] Accessibility improvements (ARIA labels)
- [ ] Sticky navbar scroll behavior options
- [ ] Logo transition effects
- [ ] Multi-language support for menu items

## Testing Checklist

When editing the Default Navigation Bar:

- [ ] Logo displays correctly (text or image)
- [ ] Navigation links are clickable
- [ ] Dropdown menus work (if configured)
- [ ] Theme toggle changes theme
- [ ] Account menu shows user avatar
- [ ] Cart badge shows correct count
- [ ] Mobile menu displays on small screens
- [ ] Colors match theme settings
- [ ] Responsive padding looks good on all devices
- [ ] Sticky behavior works on scroll
