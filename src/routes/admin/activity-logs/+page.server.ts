import type { PageServerLoad } from './$types';
import { getDB, getActivityLogs, type ActivityLogFilter } from '$lib/server/db';
import { canPerformAction } from '$lib/server/permissions';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
  // hooks.server.ts resolves the session cookie against the users table
  const currentUser = locals.currentUser;
  if (!currentUser) {
    throw error(401, 'Not authenticated');
  }

  // Check permission
  if (!canPerformAction(currentUser, 'logs:read')) {
    throw error(403, 'Insufficient permissions to view activity logs');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;

  // Parse filter parameters from URL
  const severityParam = url.searchParams.get('severity');
  const filters: ActivityLogFilter = {
    user_id: url.searchParams.get('user_id') || undefined,
    action: url.searchParams.get('action') || undefined,
    entity_type: url.searchParams.get('entity_type') || undefined,
    entity_id: url.searchParams.get('entity_id') || undefined,
    severity:
      severityParam && ['info', 'warning', 'error', 'critical'].includes(severityParam)
        ? (severityParam as 'info' | 'warning' | 'error' | 'critical')
        : undefined,
    limit: parseInt(url.searchParams.get('limit') || '100'),
    offset: parseInt(url.searchParams.get('offset') || '0')
  };

  // Parse date filters
  const startDate = url.searchParams.get('start_date');
  if (startDate) {
    filters.start_date = Math.floor(new Date(startDate).getTime() / 1000);
  }

  const endDate = url.searchParams.get('end_date');
  if (endDate) {
    filters.end_date = Math.floor(new Date(endDate).getTime() / 1000);
  }

  // Get activity logs
  const logs = await getActivityLogs(db, siteId, filters);

  // Parse metadata JSON strings
  const parsedLogs = logs.map((log) => ({
    ...log,
    metadata: log.metadata ? JSON.parse(log.metadata) : null
  }));

  return {
    logs: parsedLogs,
    filters,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      canExport: canPerformAction(currentUser, 'logs:export')
    }
  };
};
