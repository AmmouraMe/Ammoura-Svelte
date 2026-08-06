import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Actions } from './$types';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
  getDB: vi.fn(() => ({})),
  getUserById: vi.fn()
}));

vi.mock('$lib/server/permissions', () => ({
  canPerformAction: vi.fn(),
  isSystemUser: vi.fn()
}));

vi.mock('@sveltejs/kit', async () => {
  const actual = await vi.importActual('@sveltejs/kit');
  return {
    ...actual,
    error: (status: number, message: string) => {
      throw new Error(`${status}: ${message}`);
    },
    fail: (status: number, data: Record<string, unknown>) => ({ status, data }),
    redirect: (status: number, location: string) => {
      throw new Error(`Redirect ${status}: ${location}`);
    }
  };
});

// Type definitions for mocks
interface MockDB {
  prepare: ReturnType<typeof vi.fn>;
  bind: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
}

interface MockPlatform {
  env: {
    DB: MockDB;
  };
}

interface MockLocals {
  siteId: string;
  currentUser?: Record<string, unknown>;
}

interface _MockLoadEvent {
  platform: MockPlatform;
  locals: MockLocals;
  params: { userId: string };
}

interface _MockActionEvent {
  request: {
    formData: () => Promise<FormData>;
  };
  platform: MockPlatform;
  locals: MockLocals;
  params: { userId: string };
}

describe('Edit User Page Server', () => {
  let mockDB: MockDB;
  let mockPlatform: MockPlatform;
  let mockLocals: MockLocals;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDB = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn()
    };

    mockPlatform = {
      env: {
        DB: mockDB
      }
    };

    mockLocals = {
      siteId: 'test-site'
    };
  });

  describe('load function', () => {
    it('should throw error if not authenticated', async () => {
      mockLocals.currentUser = undefined;

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          locals: mockLocals,
          params: { userId: 'user-1' }
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('401: Not authenticated');
    });

    it('should throw error if user lacks permissions', async () => {
      const { canPerformAction } = await import('$lib/server/permissions');
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'customer',
        permissions: '[]'
      };
      canPerformActionMock.mockReturnValue(false);

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          locals: mockLocals,
          params: { userId: 'user-1' }
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('403: Insufficient permissions to edit users');
    });

    it('should throw error if target user not found', async () => {
      const { getUserById } = await import('$lib/server/db');
      const { canPerformAction } = await import('$lib/server/permissions');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'admin',
        permissions: '[]'
      };
      getUserByIdMock.mockResolvedValueOnce(null);
      canPerformActionMock.mockReturnValue(true);

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          locals: mockLocals,
          params: { userId: 'user-1' }
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('404: User not found');
    });

    it('should throw error if trying to edit system user', async () => {
      const { getUserById } = await import('$lib/server/db');
      const { canPerformAction, isSystemUser } = await import('$lib/server/permissions');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;
      const isSystemUserMock = isSystemUser as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'admin',
        permissions: '[]'
      };
      getUserByIdMock.mockResolvedValueOnce({
        id: 'admin-1',
        name: 'System Admin',
        permissions: '[]'
      });
      canPerformActionMock.mockReturnValue(true);
      isSystemUserMock.mockReturnValue(true);

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          locals: mockLocals,
          params: { userId: 'admin-1' }
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('403: Cannot edit system users');
    });

    it('should throw error if trying to edit own account', async () => {
      const { getUserById } = await import('$lib/server/db');
      const { canPerformAction, isSystemUser } = await import('$lib/server/permissions');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;
      const isSystemUserMock = isSystemUser as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'admin',
        permissions: '[]'
      };
      getUserByIdMock.mockResolvedValueOnce({
        id: 'current-user',
        name: 'Current User',
        permissions: '[]'
      });
      canPerformActionMock.mockReturnValue(true);
      isSystemUserMock.mockReturnValue(false);

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          locals: mockLocals,
          params: { userId: 'current-user' }
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('403: Cannot edit your own account');
    });

    it('should load user data successfully', async () => {
      const { getUserById } = await import('$lib/server/db');
      const { canPerformAction, isSystemUser } = await import('$lib/server/permissions');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;
      const isSystemUserMock = isSystemUser as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'admin',
        permissions: '[]',
        status: 'active'
      };
      getUserByIdMock.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: '["orders:read"]',
        password_hash: 'hashed',
        status: 'active'
      });
      canPerformActionMock.mockImplementation((_user: unknown, permission: string) => {
        if (permission === 'users:write') return true;
        if (permission === 'users:roles') return false;
        return false;
      });
      isSystemUserMock.mockReturnValue(false);

      const { load } = await import('./+page.server');

      const result = await load({
        platform: mockPlatform,
        locals: mockLocals,
        params: { userId: 'user-1' }
      } as unknown as Parameters<typeof load>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).user).toBeDefined();
      expect(((result as Record<string, unknown>).user as Record<string, unknown>).name).toBe(
        'Test User'
      );
      expect(((result as Record<string, unknown>).user as Record<string, unknown>).email).toBe(
        'test@example.com'
      );
      expect(
        ((result as Record<string, unknown>).user as Record<string, unknown>).password_hash
      ).toBeUndefined();
      expect(
        ((result as Record<string, unknown>).user as Record<string, unknown>).permissions
      ).toEqual(['orders:read']);
      expect(
        ((result as Record<string, unknown>).currentUser as Record<string, unknown>).canManageRoles
      ).toBe(false);
    });
  });

  describe('actions', () => {
    it('should throw error if trying to edit own account', async () => {
      const { canPerformAction, isSystemUser } = await import('$lib/server/permissions');
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;
      const isSystemUserMock = isSystemUser as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'admin',
        permissions: '[]',
        status: 'active'
      };
      canPerformActionMock.mockReturnValue(true);
      isSystemUserMock.mockReturnValue(false);

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('name', 'Test User');
      formData.append('role', 'admin');
      formData.append('status', 'active');

      const mockRequest = {
        formData: async () => formData
      };

      const { actions } = await import('./+page.server');

      await expect(
        (actions as Actions).default({
          request: mockRequest,
          platform: mockPlatform,
          locals: mockLocals,
          params: { userId: 'current-user' }
        } as unknown as Parameters<(typeof actions)['default']>[0])
      ).rejects.toThrow('403: Cannot edit your own account');
    });

    it('should validate required fields', async () => {
      const { canPerformAction, isSystemUser } = await import('$lib/server/permissions');
      const canPerformActionMock = canPerformAction as ReturnType<typeof vi.fn>;
      const isSystemUserMock = isSystemUser as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'current-user',
        role: 'admin',
        permissions: '[]',
        status: 'active'
      };
      canPerformActionMock.mockReturnValue(true);
      isSystemUserMock.mockReturnValue(false);

      const formData = new FormData();
      // Missing required fields

      const mockRequest = {
        formData: async () => formData
      };

      const { actions } = await import('./+page.server');

      const result = await (actions as Actions).default({
        request: mockRequest,
        platform: mockPlatform,
        locals: mockLocals,
        params: { userId: 'user-1' }
      } as unknown as Parameters<(typeof actions)['default']>[0]);

      expect(result).toHaveProperty('status', 400);
      expect((result as Record<string, unknown>).data).toBeDefined();
      const data = (result as Record<string, unknown>).data as Record<string, unknown>;
      expect(data.errors).toBeDefined();
      const errors = data.errors as Record<string, unknown>;
      expect(errors.email).toBeDefined();
      expect(errors.name).toBeDefined();
    });
  });
});
