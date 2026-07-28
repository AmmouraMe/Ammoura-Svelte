import type { Locale, LocaleInfo } from './types';

/**
 * Locales the platform ships catalogs for. Adding a locale = add
 * `locales/<code>.json`, import it in `catalogs.ts`, and add an entry here.
 */
export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' }
];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie that stores a visitor's explicit language choice. */
export const LOCALE_COOKIE = 'locale';

export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}

export function getLocaleInfo(code: string): LocaleInfo | undefined {
  return SUPPORTED_LOCALES.find((l) => l.code === code);
}
