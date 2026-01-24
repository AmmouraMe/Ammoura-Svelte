import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Redirect old page creation to new Builder
export const load: PageServerLoad = async ({ url }) => {
  // Preserve any query parameters (like title and slug)
  const searchParams = url.searchParams.toString();
  const redirectUrl = searchParams ? `/admin/builder?${searchParams}` : '/admin/builder';
  throw redirect(307, redirectUrl);
};
