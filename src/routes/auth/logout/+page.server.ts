import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, locals }) => {
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';

  // Check if the request came from within our app
  // The referer should contain our host if it's an internal navigation
  const isInternalRequest = referer.includes(host) && host !== '';

  // Get user info if logged in
  const user = locals.currentUser;

  return {
    isInternalRequest,
    isLoggedIn: !!user,
    userName: user?.name || null
  };
};
