/**
 * Checkout money rules shared by the storefront and the server.
 *
 * The storefront shows these numbers and the server charges them, so they must
 * come from one place — a copy of the rate in the Svelte page and another in
 * the API would silently drift and quote a customer one total while billing
 * another.
 */

/**
 * Flat sales-tax rate applied to the order subtotal.
 *
 * TODO: sites already carry per-site tax settings (see getTaxSettings in
 * $lib/server/db/site-settings: calculationsEnabled, defaultRate, taxClasses).
 * Checkout does not read them yet, so every store charges this one rate.
 */
export const CHECKOUT_TAX_RATE = 0.08;

/** Round to whole cents; avoids 0.1 + 0.2 style drift reaching Stripe. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateOrderTax(subtotal: number): number {
  return roundMoney(subtotal * CHECKOUT_TAX_RATE);
}
