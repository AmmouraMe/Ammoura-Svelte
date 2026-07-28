import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the single most repeated visual bug in this codebase.
 *
 * `app.css` styles every `<button>` as a filled primary control — including
 * `color: var(--color-text-inverse)`, a colour chosen to sit on the primary
 * fill. A component that makes a button transparent or ghost-styled but forgets
 * to set `color` therefore keeps that inverse colour against a completely
 * different background, and the label or icon becomes unreadable — in some
 * themes invisible.
 *
 * That is how the account-menu theme buttons and the design remove button both
 * shipped unreadable. It is not something review reliably catches, because it
 * only shows up in the themes nobody happened to open.
 *
 * So: any button-styling rule that clears its background must also state a
 * colour. `color: inherit` is almost always the right answer.
 */

// vitest runs from the project root; resolve `src/` from there rather than
// from this file's URL, which differs between dev and CI resolution.
const SRC = join(process.cwd(), 'src');

function svelteFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) svelteFiles(full, found);
    else if (entry.endsWith('.svelte')) found.push(full);
  }
  return found;
}

interface Offender {
  file: string;
  rule: string;
}

function findTransparentButtonsWithoutColor(): Offender[] {
  const offenders: Offender[] = [];

  for (const file of svelteFiles(SRC)) {
    const source = readFileSync(file, 'utf-8');

    // Class names this file actually puts on a <button>.
    const buttonClasses = new Set<string>();
    for (const match of source.matchAll(/<button[^>]*?class="([^"]+)"/gs)) {
      for (const cls of match[1].split(/\s+/)) {
        if (cls && !cls.startsWith('{')) buttonClasses.add(cls);
      }
    }
    if (buttonClasses.size === 0) continue;

    // Style rules targeting one of those classes.
    for (const match of source.matchAll(/(?:^|\n)\s*\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g)) {
      const [, cls, body] = match;
      if (!buttonClasses.has(cls)) continue;

      const clearsBackground = /background(-color)?\s*:\s*(transparent|none)/.test(body);
      const setsColor = /(^|\n|;)\s*color\s*:/.test(body);

      if (clearsBackground && !setsColor) {
        offenders.push({ file: file.replace(SRC, 'src/'), rule: `.${cls}` });
      }
    }
  }

  return offenders;
}

describe('button colour safety', () => {
  it('no transparent button relies on the global filled-button colour', () => {
    const offenders = findTransparentButtonsWithoutColor();
    // Named so a failure points straight at the file and rule to fix.
    expect(offenders.map((o) => `${o.file} ${o.rule}`)).toEqual([]);
  });

  it('actually inspects a meaningful number of components', () => {
    // Cheap canary: if the traversal silently stops finding files, the check
    // above would pass vacuously and the guard would be worthless.
    expect(svelteFiles(SRC).length).toBeGreaterThan(50);
  });
});
