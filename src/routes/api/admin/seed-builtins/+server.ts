/**
 * API endpoint for seeding built-in components in production
 *
 * This endpoint allows platform engineers to:
 * - Seed new built-in components
 * - Upgrade existing defaults to new versions
 * - Preview what changes would be made (dry-run mode)
 *
 * POST /api/admin/seed-builtins
 * Query params:
 *   ?dryRun=true - Preview changes without applying them
 *
 * Requires platform_engineer role.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import {
  getDefaultRevisionsSummary,
  runProductionSeed,
  BUILTIN_COMPONENTS,
  PRIMITIVE_COMPONENTS,
  CURRENT_BUILTIN_VERSION
} from '$lib/server/db/builtin-seeding';

export const GET: RequestHandler = async ({ platform, locals }) => {
  // Only platform engineers can view seed status
  if (locals.currentUser?.role !== 'platform_engineer') {
    throw error(403, 'Only platform engineers can access this endpoint');
  }

  const db = getDB(platform);

  try {
    // Get current state of all built-in components
    const componentsSummary = await getDefaultRevisionsSummary(db, 'component');
    const layoutsSummary = await getDefaultRevisionsSummary(db, 'layout');

    return json({
      currentBuiltinVersion: CURRENT_BUILTIN_VERSION,
      builtinComponents: BUILTIN_COMPONENTS.length,
      primitiveComponents: PRIMITIVE_COMPONENTS.length,
      totalDefinitions: BUILTIN_COMPONENTS.length + PRIMITIVE_COMPONENTS.length,
      components: componentsSummary,
      layouts: layoutsSummary,
      upgradeAvailable: componentsSummary.some(
        (c) => c.latestDefaultVersion !== null && c.currentVersion !== c.latestDefaultVersion
      )
    });
  } catch (e) {
    console.error('Failed to get seed status:', e);
    throw error(500, 'Failed to get seed status');
  }
};

export const POST: RequestHandler = async ({ platform, locals, url }) => {
  // Only platform engineers can seed production
  if (locals.currentUser?.role !== 'platform_engineer') {
    throw error(403, 'Only platform engineers can seed production');
  }

  const db = getDB(platform);
  const dryRun = url.searchParams.get('dryRun') === 'true';

  if (dryRun) {
    // Preview mode - show what would be done
    const componentsSummary = await getDefaultRevisionsSummary(db, 'component');

    const preview = {
      dryRun: true,
      currentBuiltinVersion: CURRENT_BUILTIN_VERSION,
      wouldCreate: [] as string[],
      wouldUpgrade: [] as string[],
      wouldSkip: [] as string[]
    };

    // Check what would happen for each definition
    const allDefinitions = [...BUILTIN_COMPONENTS, ...PRIMITIVE_COMPONENTS];
    const existingNames = new Set(componentsSummary.map((c) => c.entityName));

    for (const def of allDefinitions) {
      if (!existingNames.has(def.name)) {
        preview.wouldCreate.push(def.name);
      } else {
        const existing = componentsSummary.find((c) => c.entityName === def.name);
        if (
          existing &&
          existing.isOnLatestDefault &&
          existing.latestDefaultVersion !== null &&
          existing.latestDefaultVersion < CURRENT_BUILTIN_VERSION
        ) {
          preview.wouldUpgrade.push(def.name);
        } else {
          preview.wouldSkip.push(def.name);
        }
      }
    }

    return json(preview);
  }

  try {
    // Actually run the seed
    const result = await runProductionSeed(db);

    return json({
      success: true,
      currentBuiltinVersion: CURRENT_BUILTIN_VERSION,
      migrated: result.migrated,
      summary: result.summary,
      results: result.results
    });
  } catch (e) {
    console.error('Failed to seed production:', e);
    throw error(500, 'Failed to seed production');
  }
};
