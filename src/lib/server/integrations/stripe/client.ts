/**
 * Stripe client factory.
 * One Stripe instance per site, built from that site's own secret key
 * (each site owner connects their own Stripe account).
 */

import Stripe from 'stripe';

export function getStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}
