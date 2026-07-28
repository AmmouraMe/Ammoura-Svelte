import { DEFAULT_LOCALE } from './registry';
import type { Locale } from './types';

/**
 * Parse an Accept-Language header into lowercase tags ordered by q-value,
 * e.g. 'es-MX,es;q=0.9,en;q=0.8' → ['es-mx', 'es', 'en'].
 */
export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];

  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      let q = 1;
      for (const param of params) {
        const [name, value] = param.trim().split('=');
        if (name === 'q') {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed)) q = parsed;
        }
      }
      return { tag: tag.trim().toLowerCase(), q };
    })
    .filter((e) => e.tag && e.tag !== '*' && e.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((e) => e.tag);
}

export interface LocaleResolutionInput {
  cookieLocale: string | null | undefined;
  acceptLanguage: string | null;
  siteDefault: string;
  /** Already validated against SUPPORTED_LOCALES; never empty. */
  enabledLocales: string[];
}

/**
 * Resolve the locale for a request: explicit cookie choice → best
 * Accept-Language match (exact tag, then base language: 'es-mx' → 'es') →
 * the site's default → platform default.
 */
export function resolveLocale(input: LocaleResolutionInput): Locale {
  const { cookieLocale, acceptLanguage, siteDefault, enabledLocales } = input;

  if (cookieLocale && enabledLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  for (const tag of parseAcceptLanguage(acceptLanguage)) {
    if (enabledLocales.includes(tag)) return tag;
    const base = tag.split('-')[0];
    if (enabledLocales.includes(base)) return base;
  }

  if (enabledLocales.includes(siteDefault)) {
    return siteDefault;
  }

  return enabledLocales[0] ?? DEFAULT_LOCALE;
}
