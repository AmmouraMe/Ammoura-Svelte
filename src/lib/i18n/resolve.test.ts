import { describe, it, expect } from 'vitest';
import { parseAcceptLanguage, resolveLocale } from './resolve';

describe('parseAcceptLanguage', () => {
  it('parses tags ordered by q-value', () => {
    expect(parseAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toEqual(['es-mx', 'es', 'en']);
  });

  it('sorts by explicit q-values', () => {
    expect(parseAcceptLanguage('en;q=0.5,es;q=0.9')).toEqual(['es', 'en']);
  });

  it('ignores wildcards and zero-q entries', () => {
    expect(parseAcceptLanguage('*;q=0.1,fr;q=0,es')).toEqual(['es']);
  });

  it('returns empty for null or empty headers', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
  });
});

describe('resolveLocale', () => {
  const base = {
    cookieLocale: undefined,
    acceptLanguage: null,
    siteDefault: 'en',
    enabledLocales: ['en', 'es']
  };

  it('prefers a valid cookie choice', () => {
    expect(resolveLocale({ ...base, cookieLocale: 'es', acceptLanguage: 'en' })).toBe('es');
  });

  it('ignores a cookie for a locale the site has not enabled', () => {
    expect(resolveLocale({ ...base, cookieLocale: 'fr' })).toBe('en');
  });

  it('matches Accept-Language exactly', () => {
    expect(resolveLocale({ ...base, acceptLanguage: 'es,en;q=0.8' })).toBe('es');
  });

  it('matches Accept-Language by base language', () => {
    expect(resolveLocale({ ...base, acceptLanguage: 'es-MX,en;q=0.5' })).toBe('es');
  });

  it('falls back to the site default when nothing matches', () => {
    expect(resolveLocale({ ...base, acceptLanguage: 'fr-FR,de;q=0.9' })).toBe('en');
  });

  it('falls back to the first enabled locale when the default is not enabled', () => {
    expect(resolveLocale({ ...base, siteDefault: 'fr', enabledLocales: ['es'] })).toBe('es');
  });
});
