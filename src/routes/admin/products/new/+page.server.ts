import type { PageServerLoad } from './$types';
import { getDB, getActiveTemplates, getTemplatePrintAreas } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  const templates = await getActiveTemplates(db);

  // Attach a lightweight print-area summary per template for the picker cards.
  const withAreas = await Promise.all(
    templates.map(async (t) => {
      const areas = await getTemplatePrintAreas(db, t.id);
      return {
        id: t.id,
        key: t.key,
        name: t.name,
        description: t.description,
        productType: t.productType,
        baseImage: t.baseImage,
        defaultPrice: t.defaultPrice,
        printAreas: areas.map((a) => ({
          name: a.name,
          placement: a.placement,
          physWidth: a.physWidth,
          physHeight: a.physHeight,
          unit: a.unit,
          requiredDpi: a.requiredDpi
        }))
      };
    })
  );

  return { templates: withAreas };
};
