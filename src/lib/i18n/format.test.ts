import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, formatNumber } from './format';

describe('formatMoney', () => {
  it('formats USD for English', () => {
    expect(formatMoney(19.5, { locale: 'en', currency: 'USD' })).toBe('$19.50');
  });

  it('formats EUR for Spanish', () => {
    const result = formatMoney(19.5, { locale: 'es', currency: 'EUR' });
    expect(result).toContain('€');
    expect(result).toContain('19,50');
  });

  it('falls back to en/USD on an invalid currency code', () => {
    expect(formatMoney(5, { locale: 'en', currency: 'NOT_A_CODE' })).toBe('$5.00');
  });
});

describe('formatDate', () => {
  const date = new Date('2026-09-11T12:00:00Z');

  it('formats dates per locale', () => {
    expect(formatDate(date, { locale: 'en', dateStyle: 'long', timeZone: 'UTC' })).toBe(
      'September 11, 2026'
    );
    expect(formatDate(date, { locale: 'es', dateStyle: 'long', timeZone: 'UTC' })).toBe(
      '11 de septiembre de 2026'
    );
  });

  it('accepts epoch milliseconds and ISO strings', () => {
    expect(formatDate(date.getTime(), { locale: 'en', dateStyle: 'short', timeZone: 'UTC' })).toBe(
      formatDate(date, { locale: 'en', dateStyle: 'short', timeZone: 'UTC' })
    );
  });

  it('returns empty string for invalid dates', () => {
    expect(formatDate('garbage', { locale: 'en' })).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats grouped numbers per locale', () => {
    expect(formatNumber(1234.5, { locale: 'en' })).toBe('1,234.5');
    expect(formatNumber(1234.5, { locale: 'es' })).toBe('1234,5');
  });
});
