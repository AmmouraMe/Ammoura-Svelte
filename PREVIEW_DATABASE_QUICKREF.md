# Preview Database Quick Reference

## Overview

There are three database environments:

1. **Remote Preview D1** - Cloudflare's preview database (used by
   `npm run preview` and Cloudflare Pages preview deployments)
2. **Local D1** - SQLite-based emulation stored in `.wrangler/state/` (used by
   `npm run preview:local`)
3. **Remote Production D1** - Cloudflare's production database (used by
   `npm run preview:prod`)

## Preview Commands

```bash
# Local build + remote preview database (matches Cloudflare Pages preview)
npm run preview

# Local build + local database (fast development, no cloud connection)
npm run preview:local

# Local build + remote production database (test against prod data)
npm run preview:prod
```

### `npm run preview` (Remote Preview DB) ⭐ Recommended

- Builds the production bundle
- Connects to the **remote preview D1 database** via
  `wrangler dev --remote --env preview`
- Uses the same database as Cloudflare Pages preview deployments
- Available at `http://localhost:4236`
- **Best for:** Testing exactly what you'll see in Cloudflare preview builds

### `npm run preview:local` (Local DB)

- Builds the production bundle
- Sets up local D1 database with seed data
- Starts `wrangler pages dev` with local bindings
- Available at `http://localhost:4236`
- **Best for:** Fast iteration when offline or avoiding cloud costs

### `npm run preview:prod` (Remote Production DB)

- Builds the production bundle
- Connects to the **remote production D1 database**
- Available at `http://localhost:4236`
- **Best for:** Debugging production issues locally
- ⚠️ **Caution:** This uses live production data!

## Testing Against Remote Preview Database

When you run `npm run preview`, you're testing against the same remote preview
database that Cloudflare Pages uses for preview deployments. This ensures:

- What you see locally matches what you'll see on preview URLs
- Database schema and data are identical to cloud preview
- R2 storage uses the preview bucket (`hermes-media-preview`)

### Alternative: Deploy to Cloudflare Pages

1. Push your branch to GitHub
2. Wait for Cloudflare Pages to build
3. Access the preview URL (e.g., `https://your-branch.hermes-1dh.pages.dev/`)

Note: Cloudflare Pages preview builds automatically wipe and re-seed the
database on each push.

## Commands

### Automatic (Cloudflare Pages)

- **Preview builds**: Database automatically wiped → migrated → seeded
- **Production builds**: Database automatically migrated only

### Manual Database Commands

```bash
# Preview database (full reset with seed data)
npm run db:reset:preview

# Preview setup (migrate + seed, no wipe)
npm run db:setup:preview:seed

# Local database (full reset with seed data)
npm run db:reset:local

# Local setup (migrate + seed, no wipe)
npm run db:setup:local:seed
```

## Technical Details

### Why Different Commands?

| Command                 | Tool                                  | Bindings          | Use Case                        |
| ----------------------- | ------------------------------------- | ----------------- | ------------------------------- |
| `npm run preview`       | `wrangler dev --remote --env preview` | Remote preview    | Test against cloud preview data |
| `npm run preview:local` | `wrangler pages dev`                  | Local emulation   | Fast local testing (offline OK) |
| `npm run preview:prod`  | `wrangler dev --remote`               | Remote production | Debug prod issues               |

**Note:** `wrangler pages dev` only supports local D1/R2 emulation. To connect
to remote Cloudflare resources, we use `wrangler dev` with the `--remote` flag,
pointing to the compiled worker entry point
(`.svelte-kit/cloudflare/_worker.js`).

### First Run Notes

The first time you run `npm run preview`, wrangler may prompt you to
authenticate with Cloudflare if you haven't already. Run `wrangler login` first
if needed.

## Files Modified

1. ✅ `scripts/preview-build.js` - New automated build script
2. ✅ `package.json` - Added `build:pages` script
3. ✅ `wrangler.toml` - Added `[build]` configuration
4. ✅ `docs/DATABASE.md` - Added preview setup section
5. ✅ `docs/PREVIEW_DATABASE_SETUP.md` - New comprehensive guide

## How to Test

### Local Simulation

```powershell
# Simulate preview environment
$env:CF_PAGES = "1"
$env:CF_PAGES_BRANCH = "test-branch"
npm run build:pages

# Clean up
Remove-Item Env:\CF_PAGES
Remove-Item Env:\CF_PAGES_BRANCH
```

### Real Preview

1. Push to any non-main branch
2. Check Cloudflare Pages build logs
3. Visit preview URL and verify data

## Environment Detection

| Environment | CF_PAGES  | CF_PAGES_BRANCH | Database Actions      |
| ----------- | --------- | --------------- | --------------------- |
| Preview     | `"1"`     | Not `main`      | Wipe → Migrate → Seed |
| Production  | `"1"`     | `main`          | Migrate only          |
| Local       | undefined | undefined       | Skip (manual control) |

## Troubleshooting

**Build fails with wrangler errors?** → Check Cloudflare API credentials in
repository secrets

**Database not wiped?** → Verify you're on a non-main branch

**Seed data missing?** → Check `scripts/seed-data.sql` for errors

## Rollback

Remove the `[build]` section from `wrangler.toml` and Cloudflare will use
default build.
