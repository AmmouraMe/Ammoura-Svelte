/**
 * Fulfillment retry sweep
 * POST /api/cron/fulfillment-retry
 *
 * Drives the retry path for paid orders that have not reached their
 * fulfillment provider. Platform-wide, not per tenant: it retries due relays
 * across every site, each scoped by the site_id on its own row.
 *
 * Called on a schedule with `Authorization: Bearer $CRON_SECRET`. The Worker
 * cannot schedule itself — @sveltejs/adapter-cloudflare emits a fetch-only
 * _worker.js, so a Cron Trigger has no scheduled() handler to call. See
 * docs/FULFILLMENT_RELAY.md.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import { sweepDueRelays, SWEEP_DEFAULT_LIMIT } from '$lib/server/fulfillment/sweep';
import { timingSafeEqual } from '$lib/server/timing-safe';

/** Ceiling on `limit`, so one call cannot be turned into an expensive one. */
const MAX_LIMIT = 100;

export const POST: RequestHandler = async ({ request, platform, url }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const cronSecret = platform.env.CRON_SECRET;
  if (!cronSecret) {
    // Refusing is the safe failure: an unauthenticated sweep endpoint would
    // let anyone drive every site's fulfillment retries.
    throw error(503, 'CRON_SECRET is not configured');
  }

  const authorization = request.headers.get('authorization') ?? '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!provided || !timingSafeEqual(provided, cronSecret)) {
    throw error(401, 'Unauthorized');
  }

  const encryptionKey = platform.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
  }

  const requestedLimit = Number(url.searchParams.get('limit'));
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), MAX_LIMIT)
      : SWEEP_DEFAULT_LIMIT;

  const result = await sweepDueRelays(getDB(platform), encryptionKey, { limit });

  return json({ ok: true, ...result });
};
