# NavBar Widget - Advanced Navigation Builder

## Overview

The NavBar Widget has been significantly enhanced to replicate the capabilities
of the main site's navigation bar. It now supports advanced features including
theme toggles, account menus, dropdowns, cart badges, and responsive mobile
navigation.

## Features

### Logo Configuration

- **Text Logo**: Simple text-based branding
- **Image Logo**: Custom logo image support with configurable height
- **Logo URL**: Customizable link destination
- **Logo Position**: Choose between left or center alignment

### Navigation Links

- **Multi-level Navigation**: Support for dropdown submenus
- **Link Management**: Add, edit, and remove links dynamically
- **Open in New Tab**: Configure per-link behavior
- **Position Control**: Align links left, center, or right

### Action Buttons

The navbar can display various action buttons:

- **Search**: Search functionality button
- **Cart**: Shopping cart with badge showing item count
- **Authentication**: Login link or account menu when authenticated
- **Theme Toggle**: Allow users to switch between light/dark/system themes
- **Account Menu**: Comprehensive dropdown menu for authenticated users

### Account Menu Features

When a user is authenticated, the account menu displays:

- **User Information**: Name, email, and role
- **Theme Selector**: Inline theme switching (light/dark/system)
- **Custom Menu Items**: Add custom links with icons and dividers
- **Admin Dashboard**: Link to admin panel (when authorized)
- **Logout**: Sign out functionality

### Styling Options

#### Colors

- **Background Color**: Navbar background
- **Text Color**: Primary text and icons
- **Hover Color**: Link hover state
- **Border Color**: Bottom border
- **Shadow**: Optional drop shadow

#### Dropdown Styling

- **Dropdown Background**: Background for dropdown menus
- **Dropdown Text**: Text color in dropdowns
- **Dropdown Hover**: Hover background for menu items

#### Layout

- **Navbar Height**: Fixed height or auto
- **Sticky Behavior**: Fixed to top on scroll
- **Padding**: Responsive padding for different devices

### Responsive Design

- **Mobile Breakpoint**: Customizable width threshold (default: 768px)
- **Hamburger Menu**: Automatic mobile menu on smaller screens
- **Responsive Padding**: Different padding values per device
- **Mobile-Optimized**: Touch-friendly interface on mobile devices

## Usage in Builder

### Adding a NavBar

1. Open the page builder
2. Click "Components" in the sidebar
3. Select "Navigation Bar" from the Layout category
4. The navbar will be added to your page

### Configuring the Logo

In the Content tab:

- Set **Logo Text** for text-based branding
- Add **Logo Image URL** for image logos
- Set **Logo Height** (20-100px, default: 40px)
- Choose **Logo Position** (left or center)

### Adding Navigation Links

1. In the Content tab, find "Navigation Links"
2. Click "Add Link"
3. Configure:
   - **Link Text**: Display text
   - **Link URL**: Destination
   - **Open in New Tab**: Optional

#### Creating Dropdown Menus

Dropdown submenus are configured in the widget properties (currently requires
manual configuration of the `children` array in the config).

### Configuring Actions

Toggle these options in the Content tab:

- **Show Search**: Enable/disable search button
- **Show Cart**: Enable/disable shopping cart
- **Show Auth/Login**: Enable/disable authentication
- **Show Theme Toggle**: Enable/disable theme switcher
- **Show Account Menu**: Enable/disable dropdown menu for authenticated users

### Custom Account Menu Items

Add custom links to the account dropdown:

1. In "Account Menu Items", click "Add Item"
2. Configure:
   - **Icon**: Emoji or text icon
   - **Item Text**: Menu item label
   - **Item URL**: Link destination
   - **Divider Before**: Show separator above this item

### Styling the NavBar

Switch to the Style tab:

#### Colors Section

- Set background, text, and hover colors
- Configure border color
- Choose dropdown colors

#### Layout Section

- Set navbar height (0 for automatic)
- Enable/disable shadow

### Responsive Settings

Switch to the Responsive tab:

#### Padding Configuration

Set padding for each breakpoint (desktop, tablet, mobile):

- Top, Right, Bottom, Left values in pixels
- Adjust spacing per device size

## Technical Details

### Widget Type

```typescript
type: 'navbar';
```

### Configuration Interface

```typescript
interface NavBarConfig {
  // Logo
  logo?: {
    text?: string;
    image?: string;
    url?: string;
    imageHeight?: number;
  };
  logoPosition?: 'left' | 'center';

  // Links
  links?: Array<{
    text: string;
    url: string;
    openInNewTab?: boolean;
    children?: Array<{
      text: string;
      url: string;
      openInNewTab?: boolean;
    }>;
  }>;
  linksPosition?: 'left' | 'center' | 'right';

  // Actions
  showSearch?: boolean;
  showCart?: boolean;
  showAuth?: boolean;
  showThemeToggle?: boolean;
  showAccountMenu?: boolean;
  actionsPosition?: 'left' | 'right';

  // Account Menu
  accountMenuItems?: Array<{
    text: string;
    url: string;
    icon?: string;
    dividerBefore?: boolean;
  }>;

  // Styling
  navbarBackground?: string;
  navbarTextColor?: string;
  navbarHoverColor?: string;
  navbarBorderColor?: string;
  navbarShadow?: boolean;
  sticky?: boolean;
  navbarHeight?: number;
  navbarPadding?: ResponsiveValue<SpacingConfig>;

  // Dropdown
  dropdownBackground?: string;
  dropdownTextColor?: string;
  dropdownHoverBackground?: string;

  // Mobile
  mobileBreakpoint?: number;
}
```

### Default Configuration

When you add a new navbar widget, it comes with these defaults:

```javascript
{
  logo: { text: 'Store', url: '/', image: '', imageHeight: 40 },
  logoPosition: 'left',
  links: [
    { text: 'Home', url: '/' },
    { text: 'Products', url: '/products' },
    { text: 'About', url: '/about' },
    { text: 'Contact', url: '/contact' }
  ],
  linksPosition: 'center',
  showSearch: false,
  showCart: true,
  showAuth: true,
  showThemeToggle: true,
  showAccountMenu: true,
  actionsPosition: 'right',
  accountMenuItems: [
    { text: 'Profile', url: '/user/profile', icon: '👤' },
    { text: 'Settings', url: '/settings', icon: '⚙️', dividerBefore: true }
  ],
  navbarBackground: '#ffffff',
  navbarTextColor: '#000000',
  navbarHoverColor: 'var(--color-primary)',
  navbarBorderColor: '#e5e7eb',
  navbarShadow: false,
  sticky: true,
  navbarHeight: 0,
  navbarPadding: {
    desktop: { top: 16, right: 24, bottom: 16, left: 24 },
    tablet: { top: 12, right: 20, bottom: 12, left: 20 },
    mobile: { top: 12, right: 16, bottom: 12, left: 16 }
  },
  dropdownBackground: '#ffffff',
  dropdownTextColor: '#000000',
  dropdownHoverBackground: '#f3f4f6',
  mobileBreakpoint: 768
}
```

## Integration with Stores

The NavBar widget integrates with several stores:

- **authState**: Displays user information and authentication state
- **cartStore**: Shows cart item count badge
- **themeStore**: Controls theme switching

## Best Practices

1. **Keep Links Organized**: Use clear, descriptive link text
2. **Mobile First**: Test on mobile devices to ensure usability
3. **Theme Colors**: Use theme variables for consistent styling
4. **Accessibility**: Ensure all interactive elements are keyboard accessible
5. **Performance**: Avoid too many menu items for better performance

## Limitations

- Custom mobile breakpoint is configured via the properties panel but media
  queries use a fixed 768px threshold due to CSS limitations
- Dropdown menus (submenus) configuration currently requires manual JSON editing
- Account menu items can't include SVG icons directly (use emojis instead)

## Future Enhancements

Potential improvements for future versions:

- Visual dropdown menu builder
- SVG icon picker for menu items
- Mega menu support (multi-column dropdowns)
- Search integration with search bar
- Notification badges for alerts
- Multiple navbar styles/templates

## Related Documentation

- [WYSIWYG Page Builder](./WYSIWYG_PAGE_BUILDER.md)
- [Theme System](./THEME_SYSTEM.md)
- [Authentication Setup](./AUTHENTICATION_SETUP.md)
- [Responsive Design](./RESPONSIVE_DESIGN.md)
