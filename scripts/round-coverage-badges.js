#!/usr/bin/env node

/**
 * Round the README coverage badges to whole percent.
 *
 * `istanbul-badges-readme` writes two decimal places, and V8's branch counting
 * differs very slightly between Node versions — the same commit measured
 * 92.45% on Node 25 and 92.46% on Node 22. The CI badge check compares the
 * regenerated README against the committed one, so that hundredth of a percent
 * made the check impossible to satisfy from a machine on a different Node than
 * the runner.
 *
 * Whole percent is stable across that difference, and is all a badge conveys
 * anyway. Run after `istanbul-badges-readme` and before Prettier.
 */

import { readFileSync, writeFileSync } from 'fs';

const README = 'README.md';
const BADGE =
  /(https:\/\/img\.shields\.io\/badge\/(?:statements|branches|functions|lines)-)(\d+(?:\.\d+)?)(%25)/g;

const before = readFileSync(README, 'utf8');
const after = before.replace(BADGE, (_match, prefix, value, suffix) => {
  return `${prefix}${Math.round(Number(value))}${suffix}`;
});

if (after !== before) {
  writeFileSync(README, after);
  console.log('Rounded the coverage badges to whole percent.');
} else {
  console.log('Coverage badges already whole percent.');
}
