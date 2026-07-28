import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { LOCALE_COOKIE } from '$lib/i18n';

/**
 * Store the visitor's explicit language choice. The cookie is set even when it
 * matches the site default so the choice survives a later default change.
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  let locale: unknown;
  try {
    ({ locale } = (await request.json()) as { locale?: unknown });
  } catch {
    throw error(400, 'Invalid request body');
  }

  if (typeof locale !== 'string' || !locals.i18n.enabledLocales.includes(locale)) {
    throw error(400, 'Locale not enabled for this site');
  }

  cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: !dev,
    maxAge: 60 * 60 * 24 * 365
  });

  return new Response(null, { status: 204 });
};
