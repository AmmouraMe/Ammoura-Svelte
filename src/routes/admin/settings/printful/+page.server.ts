import type { PageServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getFulfillmentProvidersByType } from '$lib/server/db/fulfillment-providers';
import { PrintfulClient } from '$lib/server/integrations/printful/client';
import type { PrintfulStore } from '$lib/server/integrations/printful/types';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    return { provider: null, store: null };
  }

  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  const providers = await getFulfillmentProvidersByType(db, siteId, 'printful');
  if (providers.length === 0) {
    return { provider: null, store: null };
  }

  const provider = providers[0];
  let config: { apiKey?: string } = {};
  try {
    config = provider.config ? JSON.parse(provider.config) : {};
  } catch {
    // invalid config — treat as not connected
  }

  if (!config.apiKey) {
    return { provider: { id: provider.id }, store: null };
  }

  let store: PrintfulStore | null = null;
  try {
    const client = new PrintfulClient({ apiKey: config.apiKey });
    store = await client.getStore();
  } catch {
    // API key may be invalid; let the page handle the disconnected state
  }

  return { provider: { id: provider.id }, store };
};
