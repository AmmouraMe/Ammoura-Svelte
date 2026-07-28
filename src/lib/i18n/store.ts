import { derived, type Readable } from 'svelte/store';
import { page } from '$app/stores';
import { createTranslator } from './translate';
import { formatMoney, formatDate, type DateStyle } from './format';
import { DEFAULT_LOCALE } from './registry';
import type { Locale, Translator } from './types';

/**
 * Client/component access to the request's locale, derived from SvelteKit's
 * `page` store (which is request-scoped via Svelte context on the server —
 * concurrent tenants in one Workers isolate never share it, unlike a
 * module-level writable). Locale/currency arrive via `+layout.server.ts` data.
 *
 * Usage rules:
 * - `.svelte` files: `{$t('cart.title')}`, `{$money(subtotal)}`.
 * - `.server.ts` files: `createTranslator(locals.locale)` — never these stores.
 * - Never `get(t)` from module scope of shared `.ts` files.
 */

export const localeStore: Readable<Locale> = derived(
  page,
  ($p) => ($p.data?.locale as Locale) ?? DEFAULT_LOCALE
);

export const t: Readable<Translator> = derived(localeStore, ($locale) => createTranslator($locale));

export const money: Readable<(amount: number, currency?: string) => string> = derived(
  page,
  ($p) => (amount: number, currency?: string) =>
    formatMoney(amount, {
      locale: ($p.data?.locale as string) ?? DEFAULT_LOCALE,
      currency: currency ?? ($p.data?.currency as string) ?? 'USD'
    })
);

export const dateFmt: Readable<(d: Date | number | string, style?: DateStyle) => string> = derived(
  page,
  ($p) =>
    (d: Date | number | string, style: DateStyle = 'medium') =>
      formatDate(d, {
        locale: ($p.data?.locale as string) ?? DEFAULT_LOCALE,
        dateStyle: style
      })
);
