/**
 * Core i18n types. The engine is hand-rolled and request-scoped: locale always
 * flows in as an argument (from `event.locals` on the server, from `$page.data`
 * on the client) — there is deliberately no module-level "current locale".
 */

/** BCP-47 base language tag, e.g. 'en', 'es'. */
export type Locale = string;

export interface LocaleInfo {
  code: Locale;
  /** English name, for the admin UI. */
  name: string;
  /** Name in the language itself, for the storefront switcher. */
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

/** Flat message catalog: dot-namespaced keys → template strings. */
export type MessageCatalog = Record<string, string>;

export type TranslateParams = Record<string, string | number>;

export type Translator = (key: string, params?: TranslateParams) => string;

/** Per-site language configuration, resolved from site settings. */
export interface SiteI18nConfig {
  defaultLocale: Locale;
  enabledLocales: Locale[];
}
