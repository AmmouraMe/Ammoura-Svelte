import { describe, it, expect } from 'vitest';
import { formatRole, humanizeRole } from './roleLabel';
import { createTranslator } from '$lib/i18n/translate';

describe('humanizeRole', () => {
  it('splits underscored roles into words', () => {
    expect(humanizeRole('platform_engineer')).toBe('Platform Engineer');
  });

  it('handles hyphens and repeated separators', () => {
    expect(humanizeRole('site-owner')).toBe('Site Owner');
    expect(humanizeRole('a__b')).toBe('A B');
  });

  it('leaves single-word roles alone beyond capitalizing', () => {
    expect(humanizeRole('admin')).toBe('Admin');
  });
});

describe('formatRole', () => {
  it('returns an empty string for a missing role', () => {
    expect(formatRole(undefined)).toBe('');
    expect(formatRole(null)).toBe('');
    expect(formatRole('')).toBe('');
  });

  it('humanizes when no translator is supplied', () => {
    expect(formatRole('platform_engineer')).toBe('Platform Engineer');
  });

  it('uses the catalog label when a translator is supplied', () => {
    expect(formatRole('platform_engineer', createTranslator('en'))).toBe('Platform Engineer');
    expect(formatRole('platform_engineer', createTranslator('es'))).toBe('Ingeniero de plataforma');
    expect(formatRole('customer', createTranslator('es'))).toBe('Cliente');
  });

  it('falls back to humanizing an unknown role even with a translator', () => {
    expect(formatRole('billing_manager', createTranslator('en'))).toBe('Billing Manager');
  });

  it('falls back when the translator echoes the key back', () => {
    expect(formatRole('admin', (key) => key)).toBe('Admin');
  });
});
