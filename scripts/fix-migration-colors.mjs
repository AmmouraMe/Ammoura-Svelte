#!/usr/bin/env node
/**
 * Replace hardcoded hex colors with theme variables in migration 0059
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'migrations/0059_sync_builtin_components_with_defaults.sql';
let content = readFileSync(filePath, 'utf8');

// Count original occurrences
const originalHexCount = (content.match(/#[0-9a-fA-F]{6}/g) || []).length;
console.log(`Found ${originalHexCount} hex color occurrences`);

// Replace patterns - order matters for specificity
const replacements = [
  // Linear gradient special case - replace entire value
  ['"linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"', '"theme:accent"'],
  // Individual colors
  ['"#ffffff"', '"theme:text"'],
  ['"#FFFFFF"', '"theme:text"'],
  ['"#a78bfa"', '"theme:accent"'],
  ['"#94a3b8"', '"theme:textSecondary"'],
  ['"#64748b"', '"theme:textSecondary"'],
  ['"#e2e8f0"', '"theme:text"'],
  ['"#334155"', '"theme:border"'],
  ['"#8b5cf6"', '"theme:accent"'],
  ['"#6366f1"', '"theme:primary"']
];

let totalReplaced = 0;
for (const [from, to] of replacements) {
  const count = content.split(from).length - 1;
  if (count > 0) {
    console.log(`Replacing ${count} occurrences of ${from} with ${to}`);
    content = content.split(from).join(to);
    totalReplaced += count;
  }
}

writeFileSync(filePath, content);

// Verify
const remainingHexCount = (content.match(/#[0-9a-fA-F]{6}/g) || []).length;
console.log(`\nReplaced ${totalReplaced} occurrences`);
console.log(`Remaining hex colors: ${remainingHexCount}`);
