import type { Locale, MessageCatalog } from './types';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * All catalogs are statically imported and bundled (server and client): each
 * locale is only a few KB gzipped, which stays negligible on Workers well past
 * ten locales. Revisit with per-locale code-splitting only if catalogs grow
 * an order of magnitude.
 */
export const CATALOGS: Record<Locale, MessageCatalog> = { en, es };
