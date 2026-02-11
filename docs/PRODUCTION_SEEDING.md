# Production Seeding System

## Overview

The production seeding system allows you to safely update built-in components,
layouts, and pages in production databases while respecting user customizations.
It uses a versioned revision system to track platform-provided default
configurations.

## Supported Entity Types

The seeding system manages all built-in entity types:

| Entity Type | Source of Truth                             | Revision Table   |
| ----------- | ------------------------------------------- | ---------------- |
| Components  | `src/lib/utils/editor/componentDefaults.ts` | `revisions`      |
| Primitives  | `src/lib/utils/editor/primitiveWidgets.ts`  | `revisions`      |
| Layouts     | `src/lib/utils/editor/layoutDefaults.ts`    | `revisions`      |
| Pages       | `src/lib/utils/editor/pageDefaults.ts`      | `page_revisions` |

## Key Concepts

### Default Revisions

Default revisions are platform-provided configurations identified by their
message format:

- `Default configuration v1` - Initial default
- `Default configuration v2` - Updated default
- etc.

For pages, the `notes` column is used instead of `message`.

### Upgrade Logic

When seeding:

1. **A) Create items that don't exist** - New built-ins are created with an
   initial default revision
2. **B) Fork from the last default** - New versions are created as children of
   the previous default revision
3. **C) Auto-upgrade unchanged sites** - Sites still using the previous default
   are automatically upgraded to the new default
4. **Custom configurations preserved** - Sites with custom configurations are
   NOT upgraded; they get the new default available for manual selection

## Usage

### Via API Endpoint

The seeding system provides a platform-engineer-only API endpoint:

```bash
# Check current status
GET /api/admin/seed-builtins

# Preview changes (dry run)
POST /api/admin/seed-builtins?dryRun=true

# Apply changes
POST /api/admin/seed-builtins
```

### Example Response (GET)

```json
{
  "currentBuiltinVersion": 1,
  "builtinComponents": 6,
  "primitiveComponents": 10,
  "builtinLayouts": 1,
  "builtinPages": 1,
  "totalDefinitions": 18,
  "components": [
    {
      "siteId": "default-site",
      "entityId": "1",
      "entityName": "Navigation Bar",
      "currentVersion": 1,
      "latestDefaultVersion": 1,
      "isOnLatestDefault": true
    }
  ],
  "layouts": [
    {
      "siteId": "default-site",
      "entityId": "5",
      "entityName": "Default Layout",
      "currentVersion": 1,
      "latestDefaultVersion": 1,
      "isOnLatestDefault": true
    }
  ],
  "pages": [
    {
      "siteId": "default-site",
      "entityId": "1",
      "entityName": "Home",
      "currentVersion": 1,
      "latestDefaultVersion": 1,
      "isOnLatestDefault": true
    }
  ],
  "upgradeAvailable": false
}
```

### Example Response (POST with dryRun)

```json
{
  "dryRun": true,
  "currentBuiltinVersion": 2,
  "wouldCreate": [],
  "wouldUpgrade": {
    "components": ["Navigation Bar", "Footer", "Hero"],
    "layouts": ["Default Layout"],
    "pages": ["Home"]
  },
  "wouldSkip": {
    "components": ["Features", "Pricing"],
    "layouts": [],
    "pages": []
  }
}
```

### Example Response (POST)

```json
{
  "success": true,
  "currentBuiltinVersion": 2,
  "migrated": 0,
  "summary": {
    "created": 0,
    "upgraded": 6,
    "skipped": 10
  },
  "results": [
    {
      "action": "upgraded",
      "entityType": "component",
      "entityName": "Navigation Bar",
      "entityId": "1",
      "siteId": "default-site",
      "previousVersion": 1,
      "newVersion": 2,
      "message": "Upgraded component \"Navigation Bar\" from default v1 to v2"
    }
  ]
}
```

## How to Update Built-in Defaults

### Updating Components

Make your changes in `src/lib/utils/editor/componentDefaults.ts`:

```typescript
case 'navbar':
  return {
    // Your new navbar configuration
    brand: 'Updated Brand',
    // ... other config
  };
```

### Updating Layouts

Make your changes in `src/lib/utils/editor/layoutDefaults.ts`:

```typescript
export const BUILTIN_LAYOUTS: BuiltinLayoutDefinition[] = [
  {
    slug: 'default',
    name: 'Default Layout',
    isDefault: true,
    getWidgets: () => [
      // Updated layout widgets
      getNavbarWidget(),
      getYieldWidget(),
      getFooterWidget()
    ]
  }
];
```

### Updating Pages

Make your changes in `src/lib/utils/editor/pageDefaults.ts`:

```typescript
export const BUILTIN_PAGES: BuiltinPageDefinition[] = [
  {
    id: 1,
    title: 'Home',
    slug: '',
    getWidgets: () => [
      // Updated home page widgets
      getHeroSectionWidget(),
      getFeaturesSectionWidget()
      // ... more sections
    ]
  }
];
```

### Increment the Version

Update `CURRENT_BUILTIN_VERSION` in `src/lib/server/db/builtin-seeding.ts`:

```typescript
/**
 * Version history:
 * - v1: Initial release (migrations 0033-0059)
 * - v2: Updated navbar with new theme toggle position
 * - v3: Added new hero animations to Home page
 */
export const CURRENT_BUILTIN_VERSION = 3;
```

### Deploy and Seed

1. Deploy your changes to production
2. Log in as a platform engineer
3. Call the seed endpoint:

```bash
# Preview first
curl -X POST "https://your-site.com/api/admin/seed-builtins?dryRun=true" \
  -H "Cookie: session=your-session-cookie"

# Then apply
curl -X POST "https://your-site.com/api/admin/seed-builtins" \
  -H "Cookie: session=your-session-cookie"
```

## Migration from Initial Default Configuration

If your database has revisions with the old message format
(`Initial default configuration`), the seeding system will automatically migrate
them to `Default configuration v1` before processing.

## Architecture

### Files

| File                                            | Purpose                      |
| ----------------------------------------------- | ---------------------------- |
| `src/lib/server/db/builtin-seeding.ts`          | Core seeding service         |
| `src/lib/server/db/builtin-seeding.test.ts`     | Unit tests (24 tests)        |
| `src/routes/api/admin/seed-builtins/+server.ts` | API endpoint                 |
| `src/lib/utils/editor/componentDefaults.ts`     | Component configurations     |
| `src/lib/utils/editor/primitiveWidgets.ts`      | Primitive widget definitions |
| `src/lib/utils/editor/layoutDefaults.ts`        | Layout configurations        |
| `src/lib/utils/editor/pageDefaults.ts`          | Page configurations          |
| `scripts/seed-production-builtins.ts`           | Script exports               |

### Database Tables

The system uses two tables for revisions:

**For Components and Layouts:** `revisions` table

```sql
CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'component' or 'layout'
  entity_id TEXT NOT NULL,
  revision_hash TEXT NOT NULL UNIQUE,
  parent_revision_id TEXT,
  data TEXT NOT NULL,        -- JSON snapshot
  user_id TEXT,
  created_at INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  message TEXT               -- 'Default configuration vN'
);
```

**For Pages:** `page_revisions` table

```sql
CREATE TABLE page_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  revision_hash TEXT NOT NULL,
  parent_id INTEGER,
  components TEXT NOT NULL,  -- JSON array of widgets
  user_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  notes TEXT                 -- 'Default configuration vN'
);
```

### Version Detection

The system identifies default revisions by their message:

```typescript
const DEFAULT_REVISION_MESSAGE_PREFIX = 'Default configuration v';

// Example: "Default configuration v2" → version 2
const versionMatch = message.match(/Default configuration v(\d+)/);
```

## Best Practices

1. **Always preview first** - Use `dryRun=true` before applying changes
2. **Document version history** - Add comments explaining what changed in each
   version
3. **Test locally first** - Run the seed on local database before production
4. **Log the results** - Store the seed results for audit purposes
5. **Don't force upgrades** - Let users with custom configs choose when to
   update

## Troubleshooting

### "Component already has default vN, skipping"

This means the component already has the target version. No action needed.

### "Site has custom configuration (not upgraded)"

This is expected behavior. The site admin has customized the component/layout/page,
so it won't be auto-upgraded. The new default is available for them to apply manually
via the reset feature.

### Missing components after seed

Check if the component definition exists in `BUILTIN_COMPONENTS` or
`PRIMITIVE_COMPONENTS` arrays in `builtin-seeding.ts`.

### Missing layouts after seed

Check if the layout definition exists in `BUILTIN_LAYOUTS` array in
`src/lib/utils/editor/layoutDefaults.ts`.

### Missing pages after seed

Check if the page definition exists in `BUILTIN_PAGES` array in
`src/lib/utils/editor/pageDefaults.ts`.

### Layout widgets show "component not found"

Layout widgets (navbar, footer) reference component IDs. The seeding system
uses `resolveLayoutWidgetComponentIds()` to dynamically link widgets to
the correct component IDs for each site. If components haven't been seeded
yet, run the full seed which seeds in order: components → layouts → pages.

## Seeding Order

The seeding system processes entities in the correct dependency order:

1. **Components** - Base building blocks (no dependencies)
2. **Layouts** - Depend on component IDs for navbar/footer
3. **Pages** - Depend on layouts for rendering

This ensures layout widgets can properly reference component IDs.
