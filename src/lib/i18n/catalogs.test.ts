import { describe, it, expect } from 'vitest';
import { CATALOGS } from './catalogs';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './registry';

describe('message catalogs', () => {
  it('ships a catalog for every supported locale', () => {
    for (const { code } of SUPPORTED_LOCALES) {
      expect(CATALOGS[code], `catalog for ${code}`).toBeDefined();
    }
  });

  it('keeps every catalog in key-parity with the default locale', () => {
    const baseKeys = Object.keys(CATALOGS[DEFAULT_LOCALE]).sort();
    for (const { code } of SUPPORTED_LOCALES) {
      if (code === DEFAULT_LOCALE) continue;
      expect(Object.keys(CATALOGS[code]).sort(), `keys of ${code}`).toEqual(baseKeys);
    }
  });

  it('keeps interpolation placeholders consistent across locales', () => {
    const placeholders = (msg: string): string[] => (msg.match(/\{\w+\}/g) ?? []).sort();
    const base = CATALOGS[DEFAULT_LOCALE];
    for (const { code } of SUPPORTED_LOCALES) {
      if (code === DEFAULT_LOCALE) continue;
      for (const [key, msg] of Object.entries(CATALOGS[code])) {
        expect(placeholders(msg), `placeholders of ${code}:${key}`).toEqual(
          placeholders(base[key] ?? '')
        );
      }
    }
  });
});
