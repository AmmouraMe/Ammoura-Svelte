import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { responsiveStyle, RESPONSIVE_CLASS } from './responsiveStyle';
import { BREAKPOINTS } from '$lib/styles/breakpoints';

describe('responsiveStyle', () => {
  it('always returns the shared .rs class', () => {
    expect(responsiveStyle({}).className).toBe(RESPONSIVE_CLASS);
    expect(RESPONSIVE_CLASS).toBe('rs');
  });

  it('emits nothing for empty input', () => {
    expect(responsiveStyle({}).style).toBe('');
  });

  it('formats a number gap as px', () => {
    expect(responsiveStyle({ gap: { desktop: 24 } }).style).toBe('--rs-gap-desktop: 24px');
  });

  it('passes a string gap through untouched (keeps its unit/keyword)', () => {
    expect(responsiveStyle({ gap: { desktop: '2rem' } }).style).toBe('--rs-gap-desktop: 2rem');
  });

  it('only emits breakpoints that are present, so the cascade fallback applies', () => {
    // tablet omitted -> no tablet var -> media cascade falls tablet back to desktop
    const { style } = responsiveStyle({ gap: { desktop: 32, mobile: 12 } });
    expect(style).toContain('--rs-gap-desktop: 32px');
    expect(style).toContain('--rs-gap-mobile: 12px');
    expect(style).not.toContain('tablet');
  });

  it('formats SpacingConfig as top right bottom left, honoring auto and missing sides', () => {
    const { style } = responsiveStyle({
      padding: { desktop: { top: 40, right: 20, bottom: 40, left: 20 } },
      margin: { desktop: { top: 10, right: 'auto', left: 'auto' } }
    });
    expect(style).toContain('--rs-padding-desktop: 40px 20px 40px 20px');
    // bottom missing -> 0px; right/left auto preserved
    expect(style).toContain('--rs-margin-desktop: 10px auto 0px auto');
  });

  it('turns a numeric gridColumns into a repeat() track list', () => {
    expect(responsiveStyle({ gridColumns: { desktop: 3 } }).style).toBe(
      '--rs-grid-columns-desktop: repeat(3, minmax(0, 1fr))'
    );
  });

  it('passes a string gridColumns through as a raw track list', () => {
    expect(responsiveStyle({ gridColumns: { desktop: '1fr 2fr' } }).style).toBe(
      '--rs-grid-columns-desktop: 1fr 2fr'
    );
  });

  it('passes keyword props (display, flex-direction) straight through', () => {
    const { style } = responsiveStyle({
      display: { desktop: 'flex' },
      flexDirection: { desktop: 'row', mobile: 'column' }
    });
    expect(style).toContain('--rs-display-desktop: flex');
    expect(style).toContain('--rs-flex-direction-desktop: row');
    expect(style).toContain('--rs-flex-direction-mobile: column');
  });

  it('joins multiple declarations with "; " and no trailing semicolon', () => {
    const { style } = responsiveStyle({ display: { desktop: 'flex' }, gap: { desktop: 8 } });
    expect(style).toBe('--rs-display-desktop: flex; --rs-gap-desktop: 8px');
  });
});

describe('responsive.css breakpoint sync', () => {
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../styles/responsive.css'),
    'utf-8'
  );

  it('pins its media-query literals to BREAKPOINTS.lg (tablet) and .md (mobile)', () => {
    // CSS media queries can't read the breakpoint vars, so these literals must
    // track breakpoints.ts by hand — this test is the guard.
    expect(css).toContain(`@media (max-width: ${BREAKPOINTS.lg}px)`);
    expect(css).toContain(`@media (max-width: ${BREAKPOINTS.md}px)`);
  });
});
