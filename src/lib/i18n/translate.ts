import { dev } from '$app/environment';
import { CATALOGS } from './catalogs';
import { DEFAULT_LOCALE } from './registry';
import type { Locale, MessageCatalog, TranslateParams, Translator } from './types';

/**
 * Immutable, args-keyed cache: constructing Intl.PluralRules is the expensive
 * part. Safe at module scope on Workers because entries never mutate.
 */
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: Locale): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    try {
      rules = new Intl.PluralRules(locale);
    } catch {
      rules = new Intl.PluralRules(DEFAULT_LOCALE);
    }
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

function lookup(
  catalog: MessageCatalog | undefined,
  key: string,
  locale: Locale,
  params?: TranslateParams
): string | undefined {
  if (!catalog) return undefined;

  // Plural keys: when params.count is a number, prefer `key.<rule>` with a
  // fallback to `key.other`, e.g. cart.itemCount.one / cart.itemCount.other.
  if (typeof params?.count === 'number') {
    const rule = getPluralRules(locale).select(params.count);
    const plural = catalog[`${key}.${rule}`] ?? catalog[`${key}.other`];
    if (plural !== undefined) return plural;
  }

  return catalog[key];
}

function interpolate(message: string, params?: TranslateParams): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match
  );
}

/**
 * Pure factory for a request-scoped translator. Lookup order: the requested
 * locale's catalog → the default (en) catalog → the key itself (with a
 * dev-only warning). Never throws on missing keys or bad params.
 */
export function createTranslator(
  locale: Locale,
  catalogs: Record<Locale, MessageCatalog> = CATALOGS
): Translator {
  return (key, params) => {
    const message =
      lookup(catalogs[locale], key, locale, params) ??
      lookup(catalogs[DEFAULT_LOCALE], key, DEFAULT_LOCALE, params);

    if (message === undefined) {
      if (dev) {
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
      return key;
    }

    return interpolate(message, params);
  };
}
