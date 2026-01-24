# Component Composition System

## Overview

The Component Composition System allows components to be built from root widgets
(Container, Button, Text, etc.) instead of being monolithic single-config
entities. This enables site builders to create reusable, complex components
using the same WYSIWYG builder interface used for pages and layouts.

## Key Features

- **Compositional Components**: Build components from root widgets like
  Container, Button, Text, Image, etc.
- **Visual Builder**: Use the same drag-and-drop builder interface to create and
  edit components
- **Reusable Across Site**: Place component references in pages and layouts that
  render the component's widget composition
- **Default Components**: Every site starts with pre-built components like
  "Default Navigation Bar"
- **Backward Compatible**: Existing single-config components continue to work

## Architecture

### Database Schema

#### `component_widgets` Table

Stores the widget composition of components (similar to `page_widgets` and
`layout_widgets`).

```sql
CREATE TABLE component_widgets (
  id TEXT PRIMARY KEY,              -- UUID
  component_id INTEGER NOT NULL,    -- References components table
  type TEXT NOT NULL,               -- Widget type (text, image, button, etc.)
  position INTEGER NOT NULL,        -- Order of widget in component
  config TEXT NOT NULL,             -- JSON configuration
  parent_id TEXT,                   -- Parent widget ID for nested widgets
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES component_widgets(id) ON DELETE CASCADE
);
```

### Type System

#### New Types

```typescript
// Component widget type
export interface ComponentWidget {
  id: string;
  component_id: number;
  type: WidgetType;
  config: WidgetConfig;
  position: number;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

// Component with widgets
export interface ComponentWithWidgets extends Component {
  widgets: ComponentWidget[];
}

// New widget type for referencing components
export type WidgetType =
  | ... // existing types
  | 'component_ref'; // Reference to a component

// Widget config for component_ref
export interface WidgetConfig {
  componentId?: number; // For component_ref widgets
  // ... other fields
}
```

### Database Functions

#### Component Widgets (`src/lib/server/db/componentWidgets.ts`)

- `getComponentWidgets(db, componentId)` - Get all widgets for a component
- `getComponentWidget(db, widgetId)` - Get a single widget
- `createComponentWidget(db, data)` - Create a new widget
- `updateComponentWidget(db, widgetId, data)` - Update a widget
- `deleteComponentWidget(db, widgetId)` - Delete a widget
- `deleteComponentWidgets(db, componentId)` - Delete all widgets for a component
- `saveComponentWidgets(db, componentId, widgets)` - Bulk save (replace all
  widgets)

#### Enhanced Components Functions (`src/lib/server/db/components.ts`)

- `getComponentWithWidgets(db, siteId, componentId)` - Get component with its
  widgets
- `saveComponentWithWidgets(db, siteId, componentId, data)` - Save component and
  its widgets

## Usage

### Creating a Component

1. Navigate to **Builder > Components**
2. Click **Create Component** or **+** button
3. Use the visual builder to add and arrange widgets:
   - Container widgets for layout structure
   - Text widgets for content
   - Button widgets for actions
   - Image widgets for logos/graphics
4. Configure each widget's properties in the properties panel
5. Click **Save** to save the component

### Using a Component in Pages/Layouts

1. Open a page or layout in the builder
2. Open the **Components** sidebar
3. Navigate to the **Custom** category
4. Drag the desired component onto the canvas
5. The component will be inserted as a `component_ref` widget
6. When rendered, it expands to show its full widget composition

### Editing a Component

1. Go to **Builder > Components**
2. Click **Edit** on the component you want to modify
3. Make changes using the visual builder
4. Click **Save** to update the component
5. All references to this component will automatically show the updated version

## Default Components

### Default Navigation Bar

Every site starts with a "Default Navigation Bar" component that includes:

- **Container** widget (outer wrapper with padding)
- **Image** widget (logo)
- **Text** widgets (navigation links: Home, Products, About, Contact)
- **Button** widget (Login button)

This component is automatically created during site initialization and converted
from the old monolithic navbar config to a widget composition.

## Migration Strategy

### Migration 0030: Component Widgets Table

Creates the `component_widgets` table with proper indexes and foreign key
constraints.

### Migration 0031: Convert Navbar to Composition

Converts all existing "Default Navigation Bar" components from single-config
entities to widget compositions. Creates:

1. Container widget with flexbox layout
2. Logo image widget
3. Text widgets for each nav link
4. Button widget for login action

## API Endpoints

### Component Widgets API

```typescript
// Get component widgets
GET /api/components/[id]/widgets
Response: { widgets: ComponentWidget[] }

// Create component (with widgets)
POST /api/components
Body: {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  widgets?: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }>;
}

// Update component (with widgets)
PUT /api/components/[id]
Body: {
  name?: string;
  type?: string;
  widgets?: Array<{...}>; // Same as create
}
```

## Rendering

### Component Reference Widget (`component_ref`)

When a `component_ref` widget is encountered:

1. **ComponentRefRenderer** component is loaded
2. Fetches the component's widgets via `/api/components/[id]/widgets`
3. Recursively renders each widget using **WidgetRenderer**
4. Widgets are rendered in their parent's layout context using
   `display: contents`

### Example Usage in Templates

```svelte
<!-- In WidgetRenderer.svelte -->
{#if widget.type === 'component_ref'}
  <ComponentRefRenderer
    componentId={widget.config.componentId}
    {currentBreakpoint}
    {colorTheme}
    {isEditable}
  />
{/if}
```

## Best Practices

### Component Design

1. **Use Container widgets** for layout structure and spacing
2. **Keep components focused** - Each component should serve a specific purpose
3. **Make responsive** - Use responsive values for padding, margins, and gaps
4. **Theme-aware** - Use theme colors where appropriate
5. **Test across breakpoints** - Preview on mobile, tablet, and desktop

### Component Naming

- **Descriptive names** - "Primary Navigation", "Footer with Newsletter", etc.
- **Avoid generic names** - Instead of "Component 1", use "Hero Section"
- **Include purpose** - "Contact Form", "Product Card", "CTA Banner"

### Component Organization

- **Group related components** - Create multiple navbar variants if needed
- **Document components** - Add clear descriptions explaining purpose and usage
- **Versioning strategy** - Create new components instead of radically changing
  existing ones

## Limitations & Future Enhancements

### Current Limitations

- **No parent_id nesting yet** - Widgets are stored flat, not hierarchically
  nested
- **No component slots** - Can't create placeholder areas for dynamic content
- **No component props** - Can't pass parameters when referencing a component

### Planned Enhancements

1. **Hierarchical widget nesting** - Store parent-child relationships properly
2. **Component slots** - Define areas that can accept content from parent page
3. **Component props** - Pass parameters (e.g., title, color, size) to component
   instances
4. **Component variants** - Create multiple versions of a component with
   different configs
5. **Component library** - Global components available across all sites
6. **Import/export** - Share components between sites

## Backward Compatibility

The system maintains backward compatibility with existing components:

- **Old-style components** (single config) continue to work
- **Automatic conversion** - When loading, old components are converted to
  single-widget format
- **Type field preserved** - Component type stored for compatibility
- **Graceful degradation** - Missing widgets show helpful placeholder messages

## Testing

### Manual Testing Checklist

- [ ] Create a new component with multiple widgets
- [ ] Edit an existing component and verify changes
- [ ] Add component reference to a page
- [ ] Verify component renders correctly on page
- [ ] Test responsive behavior across breakpoints
- [ ] Delete a component and verify references show error state
- [ ] Test Default Navigation Bar renders correctly

### Automated Testing

```typescript
// Example test
describe('Component Composition', () => {
  it('creates component with widgets', async () => {
    const component = await createComponent(db, siteId, {
      name: 'Test Component',
      type: 'composite',
      config: {}
    });

    await saveComponentWidgets(db, component.id, [
      { id: 'w1', type: 'text', position: 0, config: { text: 'Hello' } },
      { id: 'w2', type: 'button', position: 1, config: { label: 'Click' } }
    ]);

    const loaded = await getComponentWithWidgets(db, siteId, component.id);
    expect(loaded.widgets).toHaveLength(2);
  });
});
```

## Troubleshooting

### Component Not Rendering

- Check browser console for errors
- Verify `componentId` is set in widget config
- Ensure component exists and is accessible to the site
- Check network tab for failed API requests

### Widgets Not Saving

- Verify widgets array is properly formatted
- Check component ID is valid
- Ensure user has permission to edit component
- Review server logs for database errors

### Migration Errors

- Ensure migrations run in order (0030 before 0031)
- Check for existing `component_widgets` table
- Verify components table has data before converting

## Summary

The Component Composition System transforms components from simple config
objects into powerful, compositional building blocks. Site builders can now
create complex, reusable components using the same intuitive visual builder,
making it easier to maintain consistent design patterns across the site.
