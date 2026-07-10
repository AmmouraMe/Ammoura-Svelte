import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BREAKPOINTS, mediaQueryFor } from './breakpoints';

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(here, 'tokens.css'), 'utf-8');
const navbarSvelte = readFileSync(join(here, '../components/builtin/NavBar.svelte'), 'utf-8');

describe('breakpoints', () => {
  it('should stay in sync with the --breakpoint-* vars in tokens.css', () => {
    for (const [name, px] of Object.entries(BREAKPOINTS)) {
      expect(tokensCss).toContain(`--breakpoint-${name}: ${px}px;`);
    }
  });

  it('should build media query strings', () => {
    expect(mediaQueryFor('md')).toBe('(max-width: 768px)');
    expect(mediaQueryFor('md', 'min')).toBe('(min-width: 769px)');
  });

  it('should match the frontend renderer breakpoints (768 mobile / 1024 tablet)', () => {
    // The renderer + builder viewport model relies on these two values
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
  });

  it('should keep NavBar mobile collapse pinned to BREAKPOINTS.md', () => {
    // NavBar's hamburger @media literal can't read the token; this guards drift.
    expect(navbarSvelte).toContain(`@media (max-width: ${BREAKPOINTS.md}px)`);
  });
});
