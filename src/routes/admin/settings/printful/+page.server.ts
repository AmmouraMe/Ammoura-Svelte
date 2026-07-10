import type { PageServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import {
  getFulfillmentProvidersByType,
  getDecryptedProviderConfig
} from '$lib/server/db/fulfillment-providers';
import { PrintfulClient } from '$lib/server/integrations/printful/client';
import type { PrintfulStore } from '$lib/server/integrations/printful/types';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
  if (!platform?.env?.DB || !platform?.env?.ENCRYPTION_KEY) {
    return { provider: null, store: null };
  }

  const encryptionKey = platform.env.ENCRYPTION_KEY;
  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  const providers = await getFulfillmentProvidersByType(db, siteId, 'printful');
  if (providers.length === 0) {
    return { provider: null, store: null };
  }

  const provider = providers[0];
  const config = await getDecryptedProviderConfig(provider, encryptionKey);
  const webhookUrl = provider.webhook_token
    ? `${url.origin}/api/webhooks/printful?token=${provider.webhook_token}`
    : null;

  if (!config.apiKey) {
    return { provider: { id: provider.id }, store: null, webhookUrl };
  }

  let store: PrintfulStore | null = null;
  try {
    const client = new PrintfulClient({ apiKey: config.apiKey });
    store = await client.getStore();
  } catch {
    // API key may be invalid; let the page handle the disconnected state
  }

  return { provider: { id: provider.id }, store, webhookUrl };
};
