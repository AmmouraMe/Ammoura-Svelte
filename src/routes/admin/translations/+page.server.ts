import type { PageServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getAllPages } from '$lib/server/db/pages';
import { getAllProducts } from '$lib/server/db/products';
import { getLanguageSettings } from '$lib/server/db/site-settings';
import { countTranslationsForLocale } from '$lib/server/i18n/content-translations';
import { getLocaleInfo } from '$lib/i18n';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  const languageSettings = await getLanguageSettings(db, siteId);
  const targetLocales = languageSettings.enabledLocales.filter(
    (code) => code !== languageSettings.defaultLocale
  );

  const requested = url.searchParams.get('locale');
  const activeLocale =
    requested && targetLocales.includes(requested) ? requested : (targetLocales[0] ?? null);

  const [pages, products] = await Promise.all([
    getAllPages(db, siteId),
    getAllProducts(db, siteId)
  ]);

  let pageCounts = new Map<string, number>();
  let productCounts = new Map<string, number>();
  let settingsCount = 0;
  if (activeLocale) {
    const [pageWidgetCounts, productCountMap, settingCounts] = await Promise.all([
      countTranslationsForLocale(db, siteId, activeLocale, 'page_widget'),
      countTranslationsForLocale(db, siteId, activeLocale, 'product'),
      countTranslationsForLocale(db, siteId, activeLocale, 'site_setting')
    ]);
    pageCounts = pageWidgetCounts;
    productCounts = productCountMap;
    settingsCount = settingCounts.get('general') ?? 0;
  }

  return {
    defaultLocale: languageSettings.defaultLocale,
    targetLocales: targetLocales.map((code) => ({
      code,
      name: getLocaleInfo(code)?.name ?? code,
      nativeName: getLocaleInfo(code)?.nativeName ?? code
    })),
    activeLocale,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      translatedCount: pageCounts.get(p.id) ?? 0
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      translatedCount: productCounts.get(p.id) ?? 0
    })),
    settingsCount
  };
};
