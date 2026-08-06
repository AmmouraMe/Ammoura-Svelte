import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getUserAISessions } from '$lib/server/db/ai-sessions';
import { isAIChatEnabled } from '$lib/server/db/ai-settings';
import { getContentTypes } from '$lib/server/db/contentTypes';
import type { AISession } from '$lib/types/ai-chat';
import type { ContentType } from '$lib/types/contentTypes';

export const load: LayoutServerLoad = async ({ url, platform, locals, depends }) => {
  // Mark this load function as dependent on AI settings changes
  depends('app:layout');
  // Allow login page to be accessed without authentication
  if (url.pathname === '/auth/login') {
    return {};
  }

  // hooks.server.ts resolves the session cookie against the users table; an
  // unknown, expired or deactivated session leaves locals.currentUser unset.
  const user = locals.currentUser;
  if (!user) {
    throw redirect(303, '/auth/login');
  }

  // Only admins and platform engineers get the admin panel
  if (user.role !== 'admin' && user.role !== 'platform_engineer') {
    throw redirect(303, '/');
  }

  let sessions: AISession[] = [];
  let archivedSessions: AISession[] = [];
  let hasAIChat = false;
  let contentTypes: ContentType[] = [];
  if (platform?.env?.DB && platform?.env?.ENCRYPTION_KEY) {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform.env.ENCRYPTION_KEY;
    try {
      // Check if AI chat is enabled and configured
      hasAIChat = await isAIChatEnabled(db, siteId, encryptionKey);
      // Load active sessions
      sessions = await getUserAISessions(db, siteId, user.id, 'active');
      // Load archived sessions
      archivedSessions = await getUserAISessions(db, siteId, user.id, 'archived');
    } catch (error) {
      console.error('Failed to load AI sessions:', error);
    }
    try {
      // Load content types for navigation submenu
      contentTypes = await getContentTypes(db, siteId);
    } catch (error) {
      console.error('Failed to load content types:', error);
    }
  }

  return {
    user,
    sessions,
    archivedSessions,
    hasAIChat,
    contentTypes
  };
};
