import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';
import type { ActivityLog, ActivityLogFilter } from '$lib/server/db/activity-logs';

interface LoadResult {
  logs: (ActivityLog & { metadata: unknown })[];
  filters: ActivityLogFilter;
  currentUser: {
    id: string;
    role: string;
    canExport: boolean;
  };
}

describe('Activity Logs Page Server', () => {
  let mockPlatform: {
    env: {
      DB: {
        prepare: ReturnType<typeof vi.fn>;
      };
    };
  };
  let mockLocals: {
    siteId: string;
    currentUser?: Record<string, unknown>;
  };

  beforeEach(() => {
    mockPlatform = {
      env: {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({
                results: [
                  {
                    id: 'log-1',
                    site_id: 'site-1',
                    user_id: 'user-1',
                    action: 'user.created',
                    entity_type: 'user',
                    entity_id: 'user-2',
                    entity_name: 'Test User',
                    description: 'Created a new user',
                    metadata: '{"email":"test@example.com"}',
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0',
                    severity: 'info',
                    created_at: 1234567890
                  }
                ]
              })
            })
          })
        }
      }
    };

    mockLocals = {
      siteId: 'site-1',
      currentUser: {
        id: 'user-1',
        role: 'admin',
        permissions: '["logs:read", "logs:export"]',
        status: 'active',
        expiration_date: null
      }
    };
  });

  it('should load activity logs for users with logs:read permission', async () => {
    const result = (await load({
      platform: mockPlatform,
      locals: mockLocals,
      url: new URL('http://localhost/admin/activity-logs')
    } as never)) as LoadResult;

    expect(result.logs).toBeDefined();
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.logs[0].action).toBe('user.created');
  });

  it('should throw 401 error when not authenticated', async () => {
    mockLocals.currentUser = undefined;

    await expect(
      load({
        platform: mockPlatform,
        locals: mockLocals,
        url: new URL('http://localhost/admin/activity-logs')
      } as never)
    ).rejects.toThrow();
  });

  it('should parse filter parameters from URL', async () => {
    const url = new URL(
      'http://localhost/admin/activity-logs?user_id=user-123&action=user.updated'
    );

    const result = (await load({
      platform: mockPlatform,
      locals: mockLocals,
      url
    } as never)) as LoadResult;

    expect(result.filters).toBeDefined();
    expect(result.filters.user_id).toBe('user-123');
    expect(result.filters.action).toBe('user.updated');
  });

  it('should parse metadata from JSON strings', async () => {
    const result = (await load({
      platform: mockPlatform,
      locals: mockLocals,
      url: new URL('http://localhost/admin/activity-logs')
    } as never)) as LoadResult;

    expect(result.logs[0].metadata).toEqual({ email: 'test@example.com' });
  });
});
