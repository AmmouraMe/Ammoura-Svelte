/**
 * Script to generate a SQL migration that syncs built-in component configs
 * with the defaults defined in componentDefaults.ts
 *
 * Usage: npx tsx scripts/generate-builtin-component-migration.ts
 *
 * This ensures the database initial state matches exactly what resetBuiltInComponent produces.
 */

import { getDefaultConfig } from '../src/lib/utils/editor/componentDefaults';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Built-in component types that need to be synced
const BUILTIN_COMPONENTS: { name: string; type: string }[] = [
  { name: 'Navigation Bar', type: 'navbar' },
  { name: 'Footer', type: 'footer' },
  { name: 'Hero', type: 'hero' },
  { name: 'Container', type: 'container' },
  { name: 'Features', type: 'features' },
  { name: 'Pricing', type: 'pricing' }
];

// Primitive component types
const PRIMITIVE_COMPONENTS: { name: string; type: string }[] = [
  { name: 'Text', type: 'text' },
  { name: 'Heading', type: 'heading' },
  { name: 'Button', type: 'button' },
  { name: 'Image', type: 'image' },
  { name: 'Spacer', type: 'spacer' },
  { name: 'Divider', type: 'divider' },
  { name: 'Icon', type: 'icon' },
  { name: 'Columns', type: 'columns' },
  { name: 'Dropdown', type: 'dropdown' },
  { name: 'Theme Toggle', type: 'theme_toggle' }
];

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateMigration(): string {
  const migrationNumber = '0059';
  const lines: string[] = [];

  lines.push(`-- Migration: ${migrationNumber}_sync_builtin_components_with_defaults`);
  lines.push(
    '-- Description: Sync all built-in components with the defaults from componentDefaults.ts'
  );
  lines.push(
    '-- This ensures the database initial state matches exactly what resetBuiltInComponent produces.'
  );
  lines.push(
    '-- Generated automatically - do not edit manually. Re-run the generation script if componentDefaults.ts changes.'
  );
  lines.push('-- Rollback: See previous component migrations for restoration');
  lines.push('');

  // Generate updates for built-in components
  lines.push('-- Built-in Components');
  for (const component of BUILTIN_COMPONENTS) {
    const config = getDefaultConfig(component.type as Parameters<typeof getDefaultConfig>[0]);
    const configJSON = JSON.stringify(config, null, 2);

    lines.push(`-- Update ${component.name} component`);
    lines.push(`UPDATE components`);
    lines.push(`SET`);
    lines.push(`  config = '${escapeSQL(configJSON)}',`);
    lines.push(`  type = '${component.type}',`);
    lines.push(`  updated_at = CURRENT_TIMESTAMP`);
    lines.push(`WHERE name = '${component.name}' AND is_global = 1;`);
    lines.push('');
  }

  // Generate updates for primitive components
  lines.push('-- Primitive Components');
  for (const component of PRIMITIVE_COMPONENTS) {
    const config = getDefaultConfig(component.type as Parameters<typeof getDefaultConfig>[0]);
    const configJSON = JSON.stringify(config, null, 2);

    lines.push(`-- Update ${component.name} primitive`);
    lines.push(`UPDATE components`);
    lines.push(`SET`);
    lines.push(`  config = '${escapeSQL(configJSON)}',`);
    lines.push(`  type = '${component.type}',`);
    lines.push(`  updated_at = CURRENT_TIMESTAMP`);
    lines.push(`WHERE name = '${component.name}' AND is_primitive = 1;`);
    lines.push('');
  }

  // Clean up component_widgets for built-in components (they use inline children now)
  lines.push(
    '-- Clean up component_widgets for built-in components (children are now inline in config)'
  );
  lines.push(`DELETE FROM component_widgets`);
  lines.push(`WHERE component_id IN (`);
  lines.push(`  SELECT id FROM components WHERE is_global = 1`);
  lines.push(`);`);
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const migration = generateMigration();

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const migrationPath = path.join(migrationsDir, '0059_sync_builtin_components_with_defaults.sql');

  fs.writeFileSync(migrationPath, migration);
  console.log(`Migration written to: ${migrationPath}`);
  console.log(`\nTo apply the migration, run:`);
  console.log(`  npm run db:migrate:local`);
}

main().catch(console.error);
