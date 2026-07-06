import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db';
import { validateSlug } from '$lib/server/slugs';
import { isSlugTaken } from '$lib/server/sites-service';

/**
 * Live slug availability check for the site creation form.
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
  if (!locals.account) {
    return json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  const validation = validateSlug(slug);
  if (!validation.valid) {
    return json({ success: true, available: false, reason: validation.error });
  }

  const db = getDB(platform);
  const taken = await isSlugTaken(db, slug);
  return json({
    success: true,
    available: !taken,
    reason: taken ? 'This site name is already taken' : undefined
  });
};
