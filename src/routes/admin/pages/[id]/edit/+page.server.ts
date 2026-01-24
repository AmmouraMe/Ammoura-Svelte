import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Redirect old page editor to new Builder
export const load: PageServerLoad = async ({ params }) => {
  throw redirect(307, `/admin/builder/${params.id}`);
};
