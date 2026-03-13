import type { PageServerLoad } from './$types';
import { getDB, getAllFulfillmentProviders } from '$lib/server/db';
import type { DBFulfillmentProvider, FulfillmentProvider } from '$lib/types/fulfillment';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    return { providers: [] };
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const dbProviders = await getAllFulfillmentProviders(db, siteId);

    const providers: FulfillmentProvider[] = dbProviders.map((p: DBFulfillmentProvider) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      providerType: (p.provider_type as 'manual' | 'printful') || 'manual',
      isDefault: p.is_default === 1,
      isActive: p.is_active === 1
    }));

    return { providers };
  } catch (error) {
    console.error('Error loading fulfillment providers:', error);
    return { providers: [] };
  }
};
