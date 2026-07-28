import { formatMoney } from '../i18n/format';

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

/** @deprecated Use formatMoney from $lib/i18n with the request locale + site currency. */
export function formatCurrency(amount: number): string {
  return formatMoney(amount, { locale: 'en-US', currency: 'USD' });
}

export function calculateTax(price: number, taxRate: number): number {
  return price * taxRate;
}
