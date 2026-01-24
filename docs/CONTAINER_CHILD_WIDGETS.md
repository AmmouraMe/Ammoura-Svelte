# Container Child Widgets Implementation

## Overview

Implemented the ability to add child widgets to Container widgets, transforming
containers into horizontal flex rows that can hold other widgets.

## Implementation Date

January 2025

## Changes Made

### 1. Type System Updates

**File**: `src/lib/types/pages.ts`

- Removed `'row'` from `WidgetType` union (row widget made redundant)
- Added container layout properties to `WidgetConfig`:
  - `containerGap?: ResponsiveValue<number>` - Spacing between child widgets
  - `containerJustifyContent?: FlexJustifyContent` - Horizontal alignment
  - `containerAlignItems?: FlexAlignItems` - Vertical alignment
  - `containerWrap?: FlexWrap` - Wrap behavior for children

### 2. Widget Renderer Updates

**File**: `src/lib/components/admin/WidgetRenderer.svelte`

- **Removed**: Row widget rendering logic
- **Enhanced**: Container rendering to support children
  - Applies flexbox layout with configurable gap, justify, align, wrap
  - Recursively renders child widgets using `<svelte:self>`
  - Shows "Drop widgets here" empty state when no children
  - Supports responsive gap values from theme breakpoints

### 3. Builder Sidebar Updates

**File**: `src/lib/components/builder/BuilderSidebar.svelte`

- **Removed**: Row widget from layout widget library
- **Updated**: Container default config with layout properties
  - `containerGap: { desktop: 16, tablet: 12, mobile: 8 }`
  - `containerJustifyContent: 'flex-start'`
  - `containerAlignItems: 'center'`
  - `containerWrap: 'wrap'`
  - `children: []` - Empty array for child widgets

### 4. Widget Defaults Updates

**File**: `src/lib/utils/editor/widgetDefaults.ts`

- **Removed**: Row case from `getDefaultConfig()`
- **Removed**: `'row': 'Row'` from widget labels
- **Updated**: Container defaults to match BuilderSidebar

### 5. Properties Panel Implementation

**File**: `src/lib/components/admin/WidgetPropertiesPanel.svelte`

Added comprehensive container configuration in Content and Style tabs:

#### Content Tab - Container Configuration

**Layout Settings**:

- **Justify Content** dropdown: `flex-start`, `center`, `flex-end`,
  `space-between`, `space-around`, `space-evenly`
- **Align Items** dropdown: `flex-start`, `center`, `flex-end`, `stretch`,
  `baseline`
- **Wrap** dropdown: `nowrap`, `wrap`, `wrap-reverse`

**Child Widget Management**:

- **Add Button** - Creates new button widget with default config
- **Add Text** - Creates new text widget with default content
- **Children List** - Shows existing child widgets with:
  - Widget type badge
  - Remove button for each child

#### Style Tab - Container Styling

**Layout Spacing**:

- **Gap** - Numeric input with responsive value support
- **Background** - Theme color picker with transparency
- **Border Radius** - Numeric input in pixels
- **Max Width** - Numeric input with "none" for full width

#### Helper Functions

```typescript
function createButtonWidget(): PageWidget {
  return {
    id: `temp-${Date.now()}`,
    type: 'button',
    config: {
      label: 'Button',
      url: '#',
      variant: 'primary',
      fullWidth: { desktop: false, tablet: false, mobile: false }
    },
    position: 0,
    page_id: '',
    created_at: Date.now(),
    updated_at: Date.now()
  };
}

function createTextWidget(): PageWidget {
  return {
    id: `temp-${Date.now()}`,
    type: 'text',
    config: {
      text: 'Text content',
      alignment: 'left',
      fontSize: 16
    },
    position: 0,
    page_id: '',
    created_at: Date.now(),
    updated_at: Date.now()
  };
}
```

## Usage

### Adding a Container to a Page

1. Open the page builder
2. Drag "Container" from the Layout section of the sidebar
3. Drop it on the canvas

### Adding Widgets to Container

1. Select the container widget
2. In the properties panel, switch to "Content" tab
3. Scroll to "Child Widgets" section
4. Click "Add Button" or "Add Text" to add widgets
5. Configure each child widget by selecting it in the canvas

### Configuring Container Layout

**In Content Tab**:

- Set horizontal alignment with "Justify Content"
- Set vertical alignment with "Align Items"
- Enable/disable wrapping with "Wrap"

**In Style Tab**:

- Adjust spacing between children with "Gap"
- Set background color
- Round corners with "Border Radius"
- Constrain width with "Max Width"

### Removing Child Widgets

1. Select the container
2. In the properties panel, find the child in the list
3. Click the "×" button next to the child widget

## Technical Details

### Widget Structure

```typescript
{
  type: 'container',
  config: {
    // Layout
    containerGap: { desktop: 16, tablet: 12, mobile: 8 },
    containerJustifyContent: 'flex-start',
    containerAlignItems: 'center',
    containerWrap: 'wrap',

    // Children
    children: [
      {
        id: 'button-1',
        type: 'button',
        config: { ... },
        position: 0,
        page_id: '',
        created_at: 1234567890,
        updated_at: 1234567890
      },
      {
        id: 'text-1',
        type: 'text',
        config: { ... },
        position: 1,
        page_id: '',
        created_at: 1234567890,
        updated_at: 1234567890
      }
    ],

    // Styling
    background: { color: 'primary', opacity: 0.1 },
    borderRadius: 8,
    maxWidth: 1200,
    padding: { desktop: 24, tablet: 16, mobile: 12 }
  }
}
```

### Rendering Flow

1. **WidgetRenderer** encounters container widget
2. Applies flex layout styles from config
3. Iterates through `config.children` array
4. Recursively renders each child with `<svelte:self>`
5. Child widgets can also be containers (nested support)

### Responsive Behavior

Container gap automatically adjusts based on viewport:

- **Desktop** (>1024px): Uses `desktop` value
- **Tablet** (768-1024px): Uses `tablet` value
- **Mobile** (<768px): Uses `mobile` value

## Future Enhancements

### Drag and Drop

Potential addition: Drag widgets from sidebar directly into container via
properties panel or canvas.

**Implementation approach**:

- Add drop zone indicator in container empty state
- Handle `ondrop` events in WidgetRenderer
- Update `config.children` array on successful drop

### More Widget Types

Currently supports Button and Text. Could add:

- Image widgets
- Icon widgets
- Spacer widgets
- Heading widgets

**Implementation**:

- Add `createImageWidget()`, `createHeadingWidget()`, etc.
- Add corresponding buttons in properties panel
- Ensure proper default configs for each type

### Reordering Children

Allow reordering child widgets within container.

**Implementation approach**:

- Add up/down arrows next to each child in properties panel
- Implement position swapping logic
- Update `children` array and call `handleImmediateUpdate()`

### Container Presets

Provide preset layouts (e.g., "3 buttons", "image + text", "CTA section").

**Implementation**:

- Add preset dropdown above "Add Button"/"Add Text" buttons
- Define preset configurations in widgetDefaults.ts
- Apply preset when selected

## Testing

### Manual Testing Steps

1. **Add container** - Verify it appears on canvas
2. **Add button** - Click "Add Button", verify it renders inside container
3. **Add text** - Click "Add Text", verify it renders after button
4. **Remove child** - Click × button, verify child disappears
5. **Adjust gap** - Change gap value, verify spacing updates
6. **Change justify** - Try different justify options, verify alignment
7. **Change align** - Try different align options, verify vertical positioning
8. **Enable wrap** - Add multiple children, set wrap to "wrap", resize window
9. **Background** - Set background color, verify container background changes
10. **Border radius** - Set radius, verify corners are rounded
11. **Max width** - Set max width, verify container constrains

### Unit Tests

No new unit tests added yet. Existing tests:

- ✅ All 1320 tests pass
- ✅ `widgetDefaults.test.ts` - Verifies row removed from labels
- ✅ Widget rendering tests - Verify container renders correctly

**Recommended additions**:

- Test `createButtonWidget()` and `createTextWidget()` functions
- Test child widget addition/removal logic
- Test container layout property updates

## Related Documentation

- [WYSIWYG Page Builder](./WYSIWYG_PAGE_BUILDER.md) - Overall builder
  architecture
- [Responsive Design](./RESPONSIVE_DESIGN.md) - Responsive value system
- [Theme System](./THEME_SYSTEM.md) - Theme color integration

## Troubleshooting

### Children not rendering

**Issue**: Added children but they don't appear in container.

**Solution**:

- Verify `config.children` is an array
- Check that each child has valid `type` and `config`
- Ensure WidgetRenderer is using `<svelte:self>` recursion

### TypeScript errors when creating widgets

**Issue**: Type 'string' is not assignable to type 'WidgetType'.

**Solution**:

- Use helper functions (`createButtonWidget()`, `createTextWidget()`)
- Don't create widgets inline in Svelte event handlers
- Type assertions ('as') don't work in Svelte templates

### Container not showing flex layout

**Issue**: Container renders but children stack vertically.

**Solution**:

- Verify container has `display: flex` style
- Check `containerJustifyContent` and `containerAlignItems` are set
- Ensure CSS class `.container-widget` is applied

## Notes

- **Row widget removed**: Container replaces row functionality
- **Recursive rendering**: Containers can contain other containers
- **Temporary IDs**: Child widgets created with `temp-${Date.now()}` IDs until
  saved
- **Auto-save**: Changes trigger `handleImmediateUpdate()` for instant
  persistence
