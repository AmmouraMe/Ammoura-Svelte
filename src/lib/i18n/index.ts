/**
 * Hand-rolled i18n core.
 *
 * Locale flows request-scoped end to end: `hooks.server.ts` resolves
 * `event.locals.locale` (cookie → Accept-Language → site default),
 * `+layout.server.ts` forwards it in layout data, and components read it via
 * the stores below. There is no module-level current locale anywhere — only
 * immutable caches — so concurrent tenants on one Workers isolate are safe.
 */

export type {
  Locale,
  LocaleInfo,
  MessageCatalog,
  TranslateParams,
  Translator,
  SiteI18nConfig
} from './types';
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isSupportedLocale,
  getLocaleInfo
} from './registry';
export { CATALOGS } from './catalogs';
export { createTranslator } from './translate';
export { parseAcceptLanguage, resolveLocale, type LocaleResolutionInput } from './resolve';
export {
  formatMoney,
  formatDate,
  formatNumber,
  type DateStyle,
  type MoneyFormatOptions,
  type DateFormatOptions,
  type NumberFormatOptions
} from './format';
export { t, localeStore, money, dateFmt } from './store';
