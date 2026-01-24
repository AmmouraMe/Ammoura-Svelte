# Container Widget Redesign

## Overview

The Container widget has been completely redesigned with a professional
Tailwind-style property editor, organized tabs, and comprehensive flex/grid
controls. The component now provides a clean, intuitive interface for creating
complex layouts.

## Changes Made

### 1. TailwindContainerEditor Redesign

**Location**: `src/lib/components/builder/TailwindContainerEditor.svelte`

Created a comprehensive two-tab editor system:

#### Layout Tab

- **Display Mode Toggle**: Visual buttons for Flex/Grid with icons
- **Flexbox Controls**:
  - Direction (row, column) with responsive breakpoints
  - Justify Content with visual alignment buttons
  - Align Items with visual alignment buttons
  - Wrap control (nowrap, wrap, wrap-reverse)
  - Gap slider (0-100px)
- **Grid Controls**:
  - Column count slider (1-12) with template mode option
  - Row configuration (auto or custom template)
  - Auto-flow options (row, column, dense variants)
  - Place Items quick presets (start, center, end, stretch)
  - Gap controls (column and row gaps)
  - Grid presets: 2 Columns, 3 Columns, 4 Columns, Sidebar Left, Sidebar Right,
    Holy Grail

#### Style Tab

- **Spacing**:
  - Padding grid (top, right, bottom, left) with quick preset buttons
  - Values: 0px, 8px, 16px, 24px, 32px, 40px
- **Sizing**:
  - Width (auto, 100%, custom)
  - Max Width (1200px default)
  - Min Height
  - Max Height
- **Styling**:
  - Background color with ThemeColorInput
  - Background image URL
  - Border radius slider (0-50px) with quick preset buttons
  - Values: 0px (Square), 4px (Subtle), 8px (Rounded), 16px (Large), 999px
    (Pill)

### 2. Property Panel Organization

**Location**: `src/lib/components/admin/WidgetPropertiesPanel.svelte`

- **Content Tab**: Now shows simple instructional message:
  ```
  "Use the Style tab to configure the container layout (flex or grid) and styling.
  Add widgets to the container by dragging them into the container drop zone."
  ```
- **Style Tab**: Contains the full TailwindContainerEditor component
- Removed broken "Add Button" and "Add Text" functionality

### 3. Container Rendering Improvements

**Location**: `src/lib/components/admin/WidgetRenderer.svelte`

#### Initialization Fixes

- Proper default values for all container properties
- `containerWidth` defaults to 'auto'
- `containerGridCols` defaults to '3'
- `containerGridAutoFlow` defaults to 'row'
- Gap now properly checks for `undefined` instead of falsy check

#### Grid Column/Row Parsing

- Improved string parsing to handle various formats:
  - Simple numbers: `"3"` → `repeat(3, 1fr)`
  - CSS units: `"200px"`, `"1fr"`, `"50%"` → used as-is
  - Custom templates: `"200px 1fr 200px"` → used as-is
- Same logic applied to both columns and rows

#### Rendering Modes

- **Editable mode** (builder preview): Uses `ContainerDropZone` component
  - Provides drag-and-drop interface
  - Shows empty state with "Drop widgets here" message
  - Supports reordering children
- **Published mode** (live page): Direct child rendering
  - No drop zone UI
  - Clean layout presentation
  - Efficient rendering

## Configuration Properties

### Layout Properties

| Property                  | Type                                           | Default                                               | Description                       |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| `containerDisplay`        | `ResponsiveValue<'flex' \| 'grid' \| 'block'>` | `{ desktop: 'flex', tablet: 'flex', mobile: 'flex' }` | Display mode                      |
| `containerFlexDirection`  | `ResponsiveValue<'row' \| 'column'>`           | `{ desktop: 'row', tablet: 'row', mobile: 'column' }` | Flex direction                    |
| `containerJustifyContent` | `string`                                       | `'flex-start'`                                        | Flex justify content              |
| `containerAlignItems`     | `string`                                       | `'stretch'`                                           | Flex align items                  |
| `containerWrap`           | `'nowrap' \| 'wrap' \| 'wrap-reverse'`         | `'nowrap'`                                            | Flex wrap behavior                |
| `containerGridCols`       | `string`                                       | `'3'`                                                 | Grid columns (number or template) |
| `containerGridRows`       | `string`                                       | `'auto'`                                              | Grid rows (number or template)    |
| `containerGridAutoFlow`   | `string`                                       | `'row'`                                               | Grid auto flow direction          |
| `containerPlaceItems`     | `string`                                       | -                                                     | Grid place items shorthand        |
| `containerGap`            | `number`                                       | `16`                                                  | Gap between children (px)         |

### Sizing Properties

| Property             | Type                      | Default    | Description     |
| -------------------- | ------------------------- | ---------- | --------------- |
| `containerWidth`     | `ResponsiveValue<string>` | `'auto'`   | Container width |
| `containerMaxWidth`  | `string`                  | `'1200px'` | Maximum width   |
| `containerMinHeight` | `ResponsiveValue<string>` | `'auto'`   | Minimum height  |
| `containerMaxHeight` | `ResponsiveValue<string>` | `'none'`   | Maximum height  |

### Spacing Properties

| Property           | Type                           | Default                                        | Description  |
| ------------------ | ------------------------------ | ---------------------------------------------- | ------------ |
| `containerPadding` | `{ top, right, bottom, left }` | `{ top: 40, right: 40, bottom: 40, left: 40 }` | Padding (px) |
| `containerMargin`  | `{ top, right, bottom, left }` | -                                              | Margin (px)  |

### Styling Properties

| Property                   | Type                      | Default         | Description          |
| -------------------------- | ------------------------- | --------------- | -------------------- |
| `containerBackground`      | `string`                  | `'transparent'` | Background color     |
| `containerBackgroundImage` | `string`                  | -               | Background image URL |
| `containerBorderRadius`    | `number`                  | `0`             | Border radius (px)   |
| `containerOpacity`         | `ResponsiveValue<number>` | `1`             | Opacity (0-1)        |
| `containerOverflow`        | `ResponsiveValue<string>` | -               | Overflow behavior    |
| `containerZIndex`          | `ResponsiveValue<number>` | -               | Z-index stacking     |

## Usage

### Creating a Container

1. Drag the "Container" widget from the sidebar into the canvas
2. The container will initialize with default flex layout
3. Open the widget properties panel (Style tab)

### Configuring Layout

#### For Flexbox:

1. Click "Flex" display mode button
2. Set direction (row/column) for each breakpoint
3. Adjust justify-content and align-items with visual buttons
4. Set gap between children

#### For Grid:

1. Click "Grid" display mode button
2. Choose column count or enter custom template
3. Optionally set row configuration
4. Select auto-flow direction
5. Use quick presets for common layouts (2 columns, sidebar, etc.)
6. Adjust gaps independently for columns and rows

### Adding Children

In the builder:

- Drag widgets from the sidebar into the container drop zone
- Reorder children by dragging within the container
- Children will respect the container's flex/grid layout

On published page:

- Children render directly without drop zone UI
- Layout is automatically applied based on configuration

### Styling

1. Switch to Style tab within the editor
2. **Spacing**: Click padding preset buttons or use individual controls
3. **Sizing**: Set width, max-width, and height constraints
4. **Styling**: Choose background color, add background image, set border radius

## Responsive Behavior

The container supports responsive values for:

- Display mode (flex/grid per breakpoint)
- Flex direction (row/column per breakpoint)
- Width, min/max height
- Opacity, overflow, z-index

Use the Responsive tab in the main properties panel to adjust
breakpoint-specific values.

## Grid Presets

Quick presets for common grid layouts:

| Preset        | Columns           | Description                           |
| ------------- | ----------------- | ------------------------------------- |
| 2 Columns     | `repeat(2, 1fr)`  | Equal two-column layout               |
| 3 Columns     | `repeat(3, 1fr)`  | Equal three-column layout             |
| 4 Columns     | `repeat(4, 1fr)`  | Equal four-column layout              |
| Sidebar Left  | `250px 1fr`       | Fixed sidebar on left, fluid content  |
| Sidebar Right | `1fr 250px`       | Fluid content, fixed sidebar on right |
| Holy Grail    | `250px 1fr 250px` | Two sidebars with fluid center        |

## Technical Details

### Rendering Pipeline

1. **Configuration Extraction**: Properties are extracted from `widget.config`
2. **Responsive Resolution**: `getBreakpointValue()` resolves responsive values
   for current breakpoint
3. **Style String Generation**: All styles are computed into a single CSS string
4. **Conditional Rendering**: Display mode determines which layout system is
   applied
5. **Child Rendering**: Children render recursively via `<svelte:self>`

### Helper Functions

```typescript
// Get value for current breakpoint with fallback to desktop
function getResponsiveValue<T>(value: T | ResponsiveValue<T>): T;

// Set value for current breakpoint
function setResponsiveValue<T>(
  current: T | ResponsiveValue<T>,
  newValue: T
): T | ResponsiveValue<T>;

// Get breakpoint value from responsive object
function getBreakpointValue<T>(
  value: T | ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint
): T | undefined;
```

### Event Handling

The editor dispatches `update` events with the complete modified configuration:

```typescript
dispatch('update', { config: updatedConfig });
```

Parent components should listen for this event and update the widget
configuration accordingly.

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Grid**:
   - Named grid areas with visual editor
   - Grid gap controls per row/column
   - Auto-fit/auto-fill templates

2. **Flex Enhancements**:
   - Flex-grow/shrink/basis controls per child
   - Order control for children

3. **Visual Feedback**:
   - Live preview of layout changes
   - Visual grid overlay in builder
   - Alignment guides

4. **Templates**:
   - Save/load container configurations as templates
   - Library of pre-built layouts

5. **Accessibility**:
   - Semantic HTML options (nav, section, aside, etc.)
   - ARIA role configuration

## Testing

The container component has test coverage for:

- Initialization with default values
- Property updates
- Responsive breakpoint handling
- Child widget rendering
- Event dispatching

Related test files:

- `src/lib/components/admin/tests/WidgetRenderer.container.test.ts`
- `src/lib/components/builder/tests/TailwindContainerEditor.test.ts`
- `src/lib/components/builder/tests/ContainerDropZone.test.ts`

## Migration Notes

If you have existing container widgets:

1. Old configurations will automatically receive default values
2. No manual migration required
3. Existing children are preserved
4. Layout may need minor adjustments if defaults differ from old behavior

## Known Issues

1. **Test Failures**: Some tests in `TailwindGridEditor.test.ts` are failing due
   to button name mismatches (pre-existing issue, unrelated to this redesign)
2. **Responsive Values**: Some properties don't yet support full responsive
   control (to be added in Responsive tab)

## Conclusion

The Container widget is now a powerful, professional layout tool with:

- ✅ Clean, intuitive UI
- ✅ Comprehensive flex/grid controls
- ✅ Quick presets for common layouts
- ✅ Proper default initialization
- ✅ Working in both builder and published modes
- ✅ Responsive breakpoint support
- ✅ Extensive customization options

The component is ready for production use in creating complex, responsive
layouts.
