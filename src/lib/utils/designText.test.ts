import { describe, it, expect } from 'vitest';
import {
  FONTS,
  FONT_CATEGORIES,
  INK_COLORS,
  contrastAdvice,
  contrastRatio,
  filterFonts,
  fontFor,
  fontNameFor,
  googleFontHref,
  inkNameFor,
  isLight,
  normaliseHex
} from './designText';

describe('the font catalog', () => {
  it('leads with stacks that need no network', () => {
    expect(FONTS[0].remote).toBeUndefined();
    expect(FONTS[0].stack).toContain('system-ui');
  });

  it('gives every face a fallback of the right kind', () => {
    for (const font of FONTS) {
      expect(font.stack).toMatch(/(sans-serif|serif|monospace|cursive)$/);
    }
  });

  it('uses ids and categories the picker can filter on', () => {
    const ids = new Set(FONTS.map((f) => f.id));
    expect(ids.size).toBe(FONTS.length);
    for (const font of FONTS) {
      expect(FONT_CATEGORIES).toContain(font.category);
    }
  });
});

describe('filterFonts', () => {
  it('matches on name, case-insensitively', () => {
    expect(filterFonts('bebas', '').map((f) => f.name)).toEqual(['Bebas Neue']);
  });

  it('narrows by category', () => {
    const scripts = filterFonts('', 'script');
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.every((f) => f.category === 'script')).toBe(true);
  });

  it('returns everything when neither is given', () => {
    expect(filterFonts('', '')).toHaveLength(FONTS.length);
  });
});

describe('naming a stack', () => {
  it('recognises a stack we offer', () => {
    expect(fontNameFor(FONTS[0].stack)).toBe('Plain sans');
    expect(fontFor(FONTS[0].stack)?.id).toBe('system-sans');
  });

  it('calls anything else custom', () => {
    expect(fontNameFor('Comic Sans MS, cursive')).toBe('Custom');
  });
});

describe('googleFontHref', () => {
  it('encodes a family name into the stylesheet URL', () => {
    expect(googleFontHref('Bebas Neue')).toBe(
      'https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400;700&display=swap'
    );
  });
});

describe('normaliseHex', () => {
  it('expands shorthand and lowercases', () => {
    expect(normaliseHex('#FFF')).toBe('#ffffff');
    expect(normaliseHex('C8102E')).toBe('#c8102e');
  });

  it('returns empty for anything it cannot read', () => {
    expect(normaliseHex('rebeccapurple')).toBe('');
    expect(normaliseHex('')).toBe('');
  });
});

describe('inkNameFor', () => {
  it('names an ink we stock', () => {
    expect(inkNameFor('#c8102e')).toBe('Red');
  });

  it('falls back to the hex, then to Custom', () => {
    expect(inkNameFor('#123456')).toBe('#123456');
    expect(inkNameFor('nonsense')).toBe('Custom');
  });

  it('covers every stocked ink', () => {
    for (const ink of INK_COLORS) {
      expect(inkNameFor(ink.hex)).toBe(ink.name);
    }
  });
});

describe('isLight', () => {
  it('separates white-ish from black-ish', () => {
    expect(isLight('#ffffff')).toBe(true);
    expect(isLight('#111111')).toBe(false);
    expect(isLight('#c8c9c7')).toBe(true);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#c8102e', '#c8102e')).toBeCloseTo(1, 2);
  });
});

describe('contrastAdvice', () => {
  it('warns about dark on dark and light on light', () => {
    expect(contrastAdvice('#111111', '#1a1a1a')).toMatch(/Dark artwork/);
    expect(contrastAdvice('#ffffff', '#f4f4f4')).toMatch(/Light artwork/);
  });

  it('stays quiet when the ink will read', () => {
    expect(contrastAdvice('#111111', '#ffffff')).toBeNull();
    expect(contrastAdvice('#ffffff', '#c8102e')).toBeNull();
  });

  it('warns about a mid-tone that merely matches the product', () => {
    // Either side of the light/dark line, but a contrast ratio of barely 1.
    expect(contrastAdvice('#8c8c8c', '#8f8f8f')).toMatch(/close to the product colour/);
  });

  it('says nothing when a colour cannot be read', () => {
    expect(contrastAdvice('', '#ffffff')).toBeNull();
    expect(contrastAdvice('#ffffff', 'nonsense')).toBeNull();
  });
});
