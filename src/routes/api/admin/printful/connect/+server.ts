/**
 * POST /api/admin/printful/connect
 * Validates a Printful API key and saves it to a provider record.
 * Creates the provider if one doesn't exist yet; updates it if one does.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import {
  getFulfillmentProvidersByType,
  createFulfillmentProvider,
  updateFulfillmentProvider,
  setProviderWebhookToken
} from '$lib/server/db/fulfillment-providers';
import { PrintfulClient } from '$lib/server/integrations/printful/client';

function generateWebhookToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const body = (await request.json()) as { apiKey?: string };
  if (!body.apiKey?.trim()) {
    throw error(400, 'API key is required');
  }

  const apiKey = body.apiKey.trim();

  // Validate by calling Printful
  let store: { id: number; name: string; currency: string };
  try {
    const client = new PrintfulClient({ apiKey });
    store = await client.getStore();
  } catch {
    throw error(400, 'Invalid API key — could not connect to Printful');
  }

  const encryptionKey = platform?.env?.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
  }

  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  // Find an existing Printful provider or create one
  const existing = await getFulfillmentProvidersByType(db, siteId, 'printful');
  let providerId: string;
  let webhookToken: string | null;

  if (existing.length > 0) {
    const provider = existing[0];
    providerId = provider.id;
    webhookToken = provider.webhook_token;
    await updateFulfillmentProvider(db, siteId, provider.id, { config: { apiKey } }, encryptionKey);
  } else {
    const created = await createFulfillmentProvider(
      db,
      siteId,
      {
        name: `Printful — ${store.name}`,
        description: 'Print-on-demand fulfillment via Printful',
        providerType: 'printful',
        config: { apiKey },
        isActive: true
      },
      encryptionKey
    );
    providerId = created.id;
    webhookToken = null;
  }

  // Generate the webhook shared secret once, on first connect
  if (!webhookToken) {
    webhookToken = generateWebhookToken();
    await setProviderWebhookToken(db, siteId, providerId, webhookToken);
  }

  return json({
    success: true,
    providerId,
    store,
    webhookUrl: `${new URL(request.url).origin}/api/webhooks/printful?token=${webhookToken}`
  });
};
