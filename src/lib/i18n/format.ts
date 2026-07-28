import type { Locale } from './types';

/**
 * Locale-aware formatting via Intl. Formatter construction is the expensive
 * part, so instances are cached in immutable, args-keyed maps (Workers-safe).
 * Tenant-supplied locale/currency values are untrusted: invalid inputs fall
 * back to en / USD instead of throwing.
 */

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

export interface MoneyFormatOptions {
  locale: Locale;
  currency: string;
}

export function formatMoney(amount: number, opts: MoneyFormatOptions): string {
  const key = `${opts.locale}:${opts.currency}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(opts.locale, {
        style: 'currency',
        currency: opts.currency
      });
    } catch {
      formatter = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' });
    }
    numberFormatCache.set(key, formatter);
  }
  return formatter.format(amount);
}

export type DateStyle = 'short' | 'medium' | 'long';

export interface DateFormatOptions {
  locale: Locale;
  dateStyle?: DateStyle;
  /** Include the time as well (e.g. order timestamps). */
  timeStyle?: DateStyle;
  timeZone?: string;
}

export function formatDate(date: Date | number | string, opts: DateFormatOptions): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const key = `${opts.locale}:${opts.dateStyle ?? 'medium'}:${opts.timeStyle ?? ''}:${opts.timeZone ?? ''}`;
  let formatter = dateFormatCache.get(key);
  if (!formatter) {
    const intlOpts: Intl.DateTimeFormatOptions = {
      dateStyle: opts.dateStyle ?? 'medium',
      ...(opts.timeStyle ? { timeStyle: opts.timeStyle } : {}),
      ...(opts.timeZone ? { timeZone: opts.timeZone } : {})
    };
    try {
      formatter = new Intl.DateTimeFormat(opts.locale, intlOpts);
    } catch {
      formatter = new Intl.DateTimeFormat('en', { dateStyle: opts.dateStyle ?? 'medium' });
    }
    dateFormatCache.set(key, formatter);
  }
  return formatter.format(d);
}

export interface NumberFormatOptions {
  locale: Locale;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatNumber(value: number, opts: NumberFormatOptions): string {
  const key = `${opts.locale}:n:${opts.minimumFractionDigits ?? ''}:${opts.maximumFractionDigits ?? ''}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(opts.locale, {
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits
      });
    } catch {
      formatter = new Intl.NumberFormat('en');
    }
    numberFormatCache.set(key, formatter);
  }
  return formatter.format(value);
}
