# AI Context-Aware Widget Management Implementation

## Overview

The AI assistant now has full context awareness in the builder and can
immediately add, remove, update, and reorder widgets based on natural language
commands. Users can say things like "add a hero widget" and the widget will be
immediately added to their current page.

## Changes Made

### 1. Updated AI System Prompts

**File**: `src/lib/server/ai/prompts.ts`

Updated the following prompts to emphasize immediate action and context
awareness:

- **PAGE_BUILDER_SYSTEM_PROMPT**: Added context awareness instructions and
  widget_changes JSON format
- **PAGE_EDIT_SYSTEM_PROMPT**: Enhanced with conversation history awareness and
  immediate action instructions
- **LAYOUT_BUILDER_SYSTEM_PROMPT**: Updated to emphasize immediate widget
  manipulation

**Key Changes**:

- All prompts now use the `widget_changes` JSON format consistently
- Added "Context Awareness" sections explaining how AI should use conversation
  history
- Included clear examples showing the AI should act immediately without asking
  for confirmation
- Documented all available widget types: hero, text, image, video, product_grid,
  custom_html, container, navbar
- Provided action-response examples for common user requests

### 2. Enhanced Widget Processing

**Files**:

- `src/lib/server/ai/widget-parser.ts`
- `src/lib/utils/widgetChanges.ts`

**Changes**:

- Added `generateWidgetId()` function to create unique temporary IDs
- Enhanced `handleAddWidgets()` to automatically populate missing fields:
  - Generates temp IDs if not provided
  - Fills in `page_id` from existing widgets
  - Sets `created_at` and `updated_at` timestamps
  - Handles partial widget data from AI responses

This ensures that when the AI provides minimal widget data (just type and
config), the system fills in all required fields automatically.

### 3. Comprehensive Test Coverage

**File**: `src/lib/utils/widgetChanges.test.ts`

Created 11 tests covering:

- Adding widgets (at end, at specific position, with missing fields)
- Removing widgets (single, multiple, with reindexing)
- Updating widgets (single field, multiple fields, config merging)
- Reordering widgets

**All tests pass ✓**

## How It Works

### User Flow

1. User opens the AI panel in the builder
2. User types: "add a hero widget"
3. AI receives message with full page context (title, slug, existing widgets)
4. AI immediately outputs `widget_changes` JSON with the new hero widget
5. `AIAssistant` component parses the JSON
6. `BuilderAIPanel` applies changes using `applyWidgetChanges()`
7. Widget appears in the canvas immediately
8. Change is added to undo/redo history

### Technical Flow

```
User Message
    ↓
AIAssistant.svelte (sends to API with context)
    ↓
/api/ai-chat/+server.ts (includes conversation history + entityData)
    ↓
AI Provider (with enhanced system prompt)
    ↓
Returns widget_changes JSON
    ↓
AIAssistant.svelte (parses response, dispatches applyChanges event)
    ↓
BuilderAIPanel.svelte (applies widget changes)
    ↓
AdvancedBuilder.svelte (updates widgets array, adds to history)
    ↓
BuilderCanvas.svelte (renders new widget)
```

## Context Data Provided to AI

The AI receives comprehensive context through `entityData`:

```typescript
{
  builder: {
    mode: 'page' | 'layout' | 'component',
    entityId: 'page-id',
    entityName: 'Page Title',
    slug: '/page-slug',
    widgets: [...], // Full widget array with IDs, types, configs
    layoutId: 1,
    availableWidgetTypes: ['hero', 'text', 'image', ...],
    widgetCount: 5
  },
  page: {
    id: 'page-id',
    title: 'Page Title',
    slug: '/page-slug',
    widgets: [...]
  }
}
```

## Widget Changes JSON Format

The AI outputs this structure:

```json
{
  "type": "widget_changes",
  "changes": {
    "action": "add|remove|update|reorder",
    "widgets": [
      {
        "id": "temp-1234567890",
        "type": "hero",
        "position": 0,
        "config": {
          "heading": "Welcome",
          "subheading": "Your subtitle here",
          "ctaText": "Get Started",
          "ctaLink": "#"
        }
      }
    ],
    "widgetIds": ["widget-id-to-remove"], // For remove action
    "position": 0 // For add action (optional)
  }
}
```

## Action Types

### Add

Adds new widgets to the page. Can specify position or add at end.

### Remove

Removes widgets by ID. Automatically reindexes remaining widgets.

### Update

Updates existing widget configs. Merges with existing config instead of
replacing.

### Reorder

Changes widget sequence. Provides new order and reindexes.

## Examples

### Add a Hero Widget

**User**: "add a hero widget"

**AI Response**:

```
I've added a hero section at the top of your page.
```

**JSON Output**:

```json
{
  "type": "widget_changes",
  "changes": {
    "action": "add",
    "widgets": [
      {
        "id": "temp-1234567890",
        "type": "hero",
        "position": 0,
        "config": {
          "heading": "Welcome",
          "subheading": "Your subtitle here",
          "ctaText": "Get Started",
          "ctaLink": "#"
        }
      }
    ]
  }
}
```

### Update Hero Heading

**User**: "change the hero heading to Welcome Home"

**AI Response**:

```
I've updated the hero heading to 'Welcome Home'.
```

**JSON Output**:

```json
{
  "type": "widget_changes",
  "changes": {
    "action": "update",
    "widgets": [
      {
        "id": "widget-1",
        "config": {
          "heading": "Welcome Home"
        }
      }
    ]
  }
}
```

### Remove a Widget

**User**: "remove the second section"

**AI Response**:

```
I've removed the second section from your page.
```

**JSON Output**:

```json
{
  "type": "widget_changes",
  "changes": {
    "action": "remove",
    "widgetIds": ["widget-2"]
  }
}
```

## Builder Context Store

The `builderContextStore` maintains current builder state and is automatically:

- Activated when builder opens
- Updated when widgets/title/slug change
- Deactivated when builder closes

This store provides the AI with real-time context about what the user is working
on.

## Benefits

1. **Natural Interaction**: Users can describe what they want in plain language
2. **Immediate Feedback**: Widgets appear instantly without confirmation dialogs
3. **Context Awareness**: AI understands references like "that section" or "the
   hero"
4. **Conversation Flow**: Multi-turn conversations build on previous context
5. **Undo/Redo Support**: All AI changes are tracked in history
6. **Type Safety**: Full TypeScript support with proper types throughout

## Testing

Run tests with:

```bash
npm test -- src/lib/utils/widgetChanges.test.ts
```

All 11 tests pass, covering:

- Widget addition (with auto-generated IDs and timestamps)
- Widget removal (with position reindexing)
- Widget updates (with config merging)
- Widget reordering

## Future Enhancements

- Voice commands for widget manipulation
- AI-suggested layouts based on page purpose
- Bulk widget operations (e.g., "make all headings blue")
- Smart widget placement based on page context
- Widget templates and presets
