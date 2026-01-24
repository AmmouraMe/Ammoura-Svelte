# Builder Layout System

## Overview

The Advanced Builder now supports a flexible grid and row layout system that
enables you to design complex components like navigation bars, footers, and
custom layouts using a visual drag-and-drop interface.

## New Layout Widgets

### 1. Container Widget

A wrapper container that provides padding, margins, and background styling.

**Use Cases:**

- Wrapping content with consistent spacing
- Creating centered layouts with max-width
- Adding backgrounds or borders to sections

**Configuration:**

- `containerPadding`: Responsive padding (top, right, bottom, left)
- `containerMargin`: Responsive margins
- `containerBackground`: Background color (supports theme colors)
- `containerBorderRadius`: Border radius in pixels
- `containerMaxWidth`: Maximum width (e.g., '1200px', '100%')

**Example:**

```typescript
{
  containerPadding: { desktop: { top: 40, right: 40, bottom: 40, left: 40 } },
  containerBackground: 'theme:surface',
  containerMaxWidth: '1200px'
}
```

### 2. Row Widget

A horizontal flexbox layout for arranging elements in a row.

**Use Cases:**

- Navigation bar with logo and links
- Button groups
- Horizontal content alignment

**Configuration:**

- `rowGap`: Space between items (responsive)
- `rowJustifyContent`: Horizontal alignment (flex-start, center, flex-end,
  space-between, etc.)
- `rowAlignItems`: Vertical alignment (flex-start, center, flex-end, stretch,
  baseline)
- `rowFlexWrap`: Whether items wrap to next line (nowrap, wrap, wrap-reverse)
- `rowPadding`: Internal padding (responsive)
- `rowBackground`: Background color

**Example - Navigation Bar:**

```typescript
{
  rowGap: { desktop: 32 },
  rowJustifyContent: 'space-between',
  rowAlignItems: 'center',
  rowPadding: { desktop: { top: 16, right: 24, bottom: 16, left: 24 } },
  rowBackground: '#ffffff'
}
```

### 3. Flex/Grid Widget

A flexible container that supports both CSS Flexbox and CSS Grid layouts.

**Use Cases:**

- Product grids
- Feature cards
- Complex multi-column layouts
- Responsive galleries

**Flexbox Mode Configuration:**

- `flexDirection`: Layout direction (row, column, row-reverse, column-reverse) -
  responsive
- `flexWrap`: Whether items wrap (nowrap, wrap, wrap-reverse)
- `flexJustifyContent`: Main axis alignment
- `flexAlignItems`: Cross axis alignment
- `flexGap`: Space between items (responsive)
- `flexPadding`: Internal padding (responsive)
- `flexBackground`: Background color
- `flexBorderRadius`: Border radius

**Grid Mode Configuration:**

- `useGrid`: Set to `true` to enable CSS Grid
- `gridColumns`: Number of columns or template (e.g., 3 or '1fr 2fr 1fr') -
  responsive
- `gridRows`: Number of rows or template (responsive)
- `gridAutoFlow`: How items fill the grid (row, column, dense)
- Other properties same as flexbox mode

**Example - Product Grid:**

```typescript
{
  useGrid: true,
  gridColumns: { desktop: 3, tablet: 2, mobile: 1 },
  flexGap: { desktop: 24, tablet: 16, mobile: 12 },
  flexPadding: { desktop: { top: 20, right: 20, bottom: 20, left: 20 } }
}
```

## Building a Navigation Bar

Here's how to build a navigation bar using the new layout widgets:

### Step 1: Add a Container

1. Drag a **Container** widget from the sidebar
2. Set `containerMaxWidth: '1200px'`
3. Set `containerBackground: 'theme:background'`

### Step 2: Add a Row Inside

1. Drag a **Row** widget inside the container
2. Set `rowJustifyContent: 'space-between'`
3. Set `rowAlignItems: 'center'`
4. Set `rowPadding` to add vertical spacing

### Step 3: Add Content to Row

1. Add an **Image** widget (logo) to the left side
2. Add another **Row** widget for navigation links
3. Add **Text** or **Button** widgets for each nav link
4. Add **Button** widgets for CTAs (login, sign up, etc.)

### Result:

```
[Container (max-width: 1200px, centered)]
  [Row (space-between, center aligned)]
    [Image: Logo]
    [Row (gap: 24px)]
      [Text: Home]
      [Text: About]
      [Text: Products]
      [Text: Contact]
    [Row (gap: 8px)]
      [Button: Login]
      [Button: Sign Up]
```

## Nesting Support

All layout widgets support nesting children. The `children` property is an array
of `PageWidget` objects that will be rendered inside the container.

**Note:** The current implementation shows placeholders when containers are
empty. Future updates will add drag-and-drop support for adding widgets directly
into containers in the builder interface.

## Responsive Design

All spacing, sizing, and layout properties support responsive values using the
`ResponsiveValue<T>` type:

```typescript
{
  desktop: value,
  tablet: value,
  mobile: value
}
```

The system automatically applies the appropriate value based on the current
breakpoint.

## Theme Integration

Layout widgets support theme color references using the `theme:` prefix:

- `theme:background`
- `theme:surface`
- `theme:text`
- `theme:textSecondary`
- `theme:primary`
- `theme:secondary`
- `theme:accent`
- `theme:border`

Example:

```typescript
{
  containerBackground: 'theme:surface',
  rowBackground: 'theme:primary'
}
```

## Implementation Status

✅ **Completed:**

- Widget type definitions
- Default configurations
- Widget renderer components (ContainerWidget, RowWidget, FlexWidget)
- Builder sidebar integration
- Basic preview rendering

🚧 **In Progress:**

- Properties panel UI for layout configuration
- Drag-and-drop nesting in BuilderCanvas
- Visual indicators for empty containers

📋 **Planned:**

- Copy/paste support for containers with children
- Container templates (pre-built nav bars, footers, etc.)
- Alignment guides and snapping
- Nested widget management UI

## Usage Tips

1. **Start with structure**: Add container/row widgets first, then populate with
   content
2. **Use responsive values**: Set different values for desktop/tablet/mobile for
   optimal layouts
3. **Theme colors**: Use theme references for consistency across your site
4. **Test breakpoints**: Switch between breakpoints in the builder to verify
   responsive behavior
5. **Keep it simple**: Start with basic layouts and add complexity gradually

## Component Examples

### Header Navigation

```
Container (max-width: 1200px)
└── Row (space-between, center)
    ├── Image (logo)
    ├── Row (gap: 24px)
    │   ├── Text (Home)
    │   ├── Text (Products)
    │   └── Text (About)
    └── Row (gap: 12px)
        ├── Button (Login)
        └── Button (Sign Up)
```

### Feature Grid

```
Container (max-width: 1200px)
└── Flex (grid, 3 columns)
    ├── Container (feature card)
    │   ├── Image (icon)
    │   ├── Heading
    │   └── Text
    ├── Container (feature card)
    └── Container (feature card)
```

### Footer

```
Container (full-width, background: dark)
└── Container (max-width: 1200px)
    ├── Row (space-between)
    │   ├── Column (logo + description)
    │   ├── Column (links)
    │   └── Column (social)
    └── Divider
    └── Text (copyright)
```

## Future Enhancements

- Visual drag-and-drop nesting
- Pre-built component templates
- Auto-layout suggestions based on content
- Advanced grid features (spanning, named grid areas)
- Animation and transition controls
- Accessibility features (ARIA labels, keyboard navigation)

## Questions or Issues?

If you encounter any issues or have suggestions for improvement, please file an
issue in the GitHub repository.
