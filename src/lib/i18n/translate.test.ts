import { describe, it, expect } from 'vitest';
import { createTranslator } from './translate';
import type { MessageCatalog } from './types';

const catalogs: Record<string, MessageCatalog> = {
  en: {
    'cart.title': 'Your Cart',
    'cart.itemCount.one': '{count} item',
    'cart.itemCount.other': '{count} items',
    'greeting.named': 'Hello, {name}!',
    'only.english': 'English only'
  },
  es: {
    'cart.title': 'Tu carrito',
    'cart.itemCount.one': '{count} artículo',
    'cart.itemCount.other': '{count} artículos',
    'greeting.named': '¡Hola, {name}!'
  }
};

describe('createTranslator', () => {
  it('translates keys in the requested locale', () => {
    const t = createTranslator('es', catalogs);
    expect(t('cart.title')).toBe('Tu carrito');
  });

  it('interpolates named params', () => {
    const t = createTranslator('en', catalogs);
    expect(t('greeting.named', { name: 'Glenda' })).toBe('Hello, Glenda!');
  });

  it('leaves unknown placeholders intact', () => {
    const t = createTranslator('en', catalogs);
    expect(t('greeting.named', {})).toBe('Hello, {name}!');
  });

  it('selects plural forms from params.count', () => {
    const t = createTranslator('en', catalogs);
    expect(t('cart.itemCount', { count: 1 })).toBe('1 item');
    expect(t('cart.itemCount', { count: 3 })).toBe('3 items');
    expect(t('cart.itemCount', { count: 0 })).toBe('0 items');
  });

  it('falls back to the English catalog for missing keys', () => {
    const t = createTranslator('es', catalogs);
    expect(t('only.english')).toBe('English only');
  });

  it('returns the key itself when no catalog has it', () => {
    const t = createTranslator('es', catalogs);
    expect(t('missing.key')).toBe('missing.key');
  });

  it('handles an entirely unknown locale by falling back to English', () => {
    const t = createTranslator('zz', catalogs);
    expect(t('cart.title')).toBe('Your Cart');
  });
});
