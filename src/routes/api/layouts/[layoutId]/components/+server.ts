import type { RequestHandler } from './$types';
import { json, error as svelteKitError } from '@sveltejs/kit';
import { updateLayoutComponents, getLayoutComponents } from '$lib/server/db/layouts';
import { getDB } from '$lib/server/db/connection';

export const GET: RequestHandler = async ({ params, platform }) => {
  const db = getDB(platform);
  const layoutId = parseInt(params.layoutId);

  if (isNaN(layoutId)) {
    throw svelteKitError(400, 'Invalid layout ID');
  }

  try {
    const components = await getLayoutComponents(db, layoutId);
    return json({ components });
  } catch (err) {
    console.error('Failed to get layout components:', err);
    throw svelteKitError(500, 'Failed to get layout components');
  }
};

export const PUT: RequestHandler = async ({ params, request, platform }) => {
  const db = getDB(platform);
  const layoutId = parseInt(params.layoutId);

  if (isNaN(layoutId)) {
    throw svelteKitError(400, 'Invalid layout ID');
  }

  try {
    const body = (await request.json()) as { components?: unknown };
    const { components } = body;

    if (!Array.isArray(components)) {
      throw svelteKitError(400, 'Invalid components data');
    }

    await updateLayoutComponents(db, components);

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('Failed to update layout components:', err);
    throw svelteKitError(500, 'Failed to update layout components');
  }
};
