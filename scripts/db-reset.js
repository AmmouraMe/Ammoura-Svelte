#!/usr/bin/env node

/**
 * Database reset script for Cloudflare D1
 * Deletes the local D1 database and optionally re-initializes it
 */

import { existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const isRemote = args.includes('--remote');
const isPreview = args.includes('--preview');
const skipReinit = args.includes('--skip-reinit');

// Local D1 databases are stored in .wrangler/state/v3/d1/
const localDbPath = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning: ${command} ${args.join(' ')}`);

    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function reset() {
  try {
    if (!isLocal && !isRemote) {
      console.error('\n⚠️  Please specify --local or --remote flag.');
      console.error(
        'Usage: node scripts/db-reset.js [--local|--remote] [--preview] [--skip-reinit]'
      );
      process.exit(1);
    }

    if (isRemote && !isPreview) {
      console.error('\n⚠️  Remote database reset requires --preview flag.');
      console.error(
        'For production databases, use the Cloudflare dashboard or wrangler CLI directly.'
      );
      process.exit(1);
    }

    if (isLocal) {
      await resetLocal();
    } else if (isRemote && isPreview) {
      await resetPreview();
    }
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    process.exit(1);
  }
}

async function resetLocal() {
  console.log('🗑️  Resetting local D1 database...\n');

  // Check if local database exists
  if (existsSync(localDbPath)) {
    console.log(`Deleting local database at: ${localDbPath}`);
    rmSync(localDbPath, { recursive: true, force: true });
    console.log('✅ Local database deleted successfully!');
  } else {
    console.log('ℹ️  No local database found. Nothing to delete.');
  }

  // Re-initialize database unless skipped
  if (!skipReinit) {
    console.log('\n🔧 Re-initializing database...');
    await runCommand('npm', ['run', 'db:setup:local']);
    console.log('\n✅ Database reset and re-initialized successfully!');
  } else {
    console.log("\n✅ Database reset completed! Run 'npm run db:setup:local' to re-initialize.");
  }
}

async function resetPreview() {
  console.log('🗑️  Resetting preview D1 database...\n');

  // First, clear the migrations table so migrations will re-run
  // This must happen first and separately to ensure it succeeds even if other tables don't exist
  console.log('📋 Clearing migrations table...');
  const migrationsClearPath = join(process.cwd(), '.wrangler', 'temp-reset-migrations.sql');
  const migrationsClearCommand = `DELETE FROM d1_migrations;`;

  writeFileSync(migrationsClearPath, migrationsClearCommand, 'utf-8');

  try {
    await runCommand('wrangler', [
      'd1',
      'execute',
      'hermes-db',
      '--remote',
      '--preview',
      '--file',
      migrationsClearPath
    ]);
    console.log('✅ Migrations table cleared!');
  } catch (_error) {
    console.log('⚠️  d1_migrations table may not exist, continuing...');
  } finally {
    if (existsSync(migrationsClearPath)) {
      rmSync(migrationsClearPath);
    }
  }

  console.log('📋 Dropping all tables...');

  // Create a temporary SQL file to DROP all tables (this is a full reset)
  const tempSqlPath = join(process.cwd(), '.wrangler', 'temp-reset.sql');
  // DROP ALL tables in proper order (respecting foreign key constraints)
  // Tables with FK dependencies must be dropped first
  const clearCommands = `-- Drop all tables (order matters due to foreign keys)
-- Disable foreign key checks temporarily (SQLite)
PRAGMA foreign_keys = OFF;

-- Revisions and history tables (depend on pages, components, layouts)
DROP TABLE IF EXISTS revisions;
DROP TABLE IF EXISTS page_revisions;
DROP TABLE IF EXISTS layout_revisions;
DROP TABLE IF EXISTS component_revisions;

-- Order-related tables
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

-- Cart and product tables
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS product_media;
DROP TABLE IF EXISTS product_shipping_options;
DROP TABLE IF EXISTS product_fulfillment_options;
DROP TABLE IF EXISTS products;

-- Page-related tables
DROP TABLE IF EXISTS page_widgets;
DROP TABLE IF EXISTS pages;

-- Component and layout tables
DROP TABLE IF EXISTS component_widgets;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS layout_widgets;
DROP TABLE IF EXISTS layouts;

-- Theme and settings tables
DROP TABLE IF EXISTS color_themes;
DROP TABLE IF EXISTS theme_preferences;
DROP TABLE IF EXISTS site_settings;

-- AI tables
DROP TABLE IF EXISTS ai_sessions;
DROP TABLE IF EXISTS ai_settings;

-- User and auth tables
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS auth_audit_logs;
DROP TABLE IF EXISTS oauth_sessions;
DROP TABLE IF EXISTS provider_accounts;
DROP TABLE IF EXISTS sso_providers;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

-- Fulfillment and shipping
DROP TABLE IF EXISTS fulfillment_providers;
DROP TABLE IF EXISTS shipping_options;
DROP TABLE IF EXISTS category_shipping_options;

-- Media and API
DROP TABLE IF EXISTS media_library;
DROP TABLE IF EXISTS api_keys;

-- Finally, drop sites (everything else depends on this)
DROP TABLE IF EXISTS sites;

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
`;

  // Write SQL to temp file
  writeFileSync(tempSqlPath, clearCommands, 'utf-8');

  try {
    await runCommand('wrangler', [
      'd1',
      'execute',
      'hermes-db',
      '--remote',
      '--preview',
      '--file',
      tempSqlPath
    ]);

    console.log('✅ Preview database tables dropped successfully!');
  } catch (_error) {
    console.log('⚠️  Some tables may not exist yet, continuing...');
  } finally {
    // Clean up temp file
    if (existsSync(tempSqlPath)) {
      rmSync(tempSqlPath);
    }
  }

  // Re-initialize database unless skipped
  if (!skipReinit) {
    console.log('\n🔧 Re-initializing database...');
    await runCommand('npm', ['run', 'db:setup:preview']);
    console.log('\n✅ Database reset and re-initialized successfully!');
  } else {
    console.log("\n✅ Database reset completed! Run 'npm run db:setup:preview' to re-initialize.");
  }
}

reset();
