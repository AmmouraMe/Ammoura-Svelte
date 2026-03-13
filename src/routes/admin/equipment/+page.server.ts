import type { PageServerLoad } from './$types';
import { getDB, getAllEquipment } from '$lib/server/db';
import type { Equipment } from '$lib/types/equipment';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    return { equipment: [] as Equipment[] };
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const equipment = await getAllEquipment(db, siteId);
    return { equipment };
  } catch (err) {
    console.error('Error loading equipment:', err);
    return { equipment: [] as Equipment[] };
  }
};
