import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

// Mock the database module
vi.mock('$lib/server/db', () => ({
  getDB: vi.fn(() => ({})),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn()
}));

// Mock activity logs
vi.mock('$lib/server/db/activity-logs', () => ({
  createActivityLog: vi.fn()
}));

// Mock @sveltejs/kit
vi.mock('@sveltejs/kit', async () => {
  const actual = await vi.importActual('@sveltejs/kit');
  return {
    ...actual,
    error: (status: number, message: string) => {
      throw new Error(`${status}: ${message}`);
    },
    fail: (status: number, data: Record<string, unknown>) => ({ status, data, ...data }),
    redirect: (status: number, location: string) => {
      throw new Error(`Redirect ${status}: ${location}`);
    }
  };
});

// Helper to create a SHA-256 hash for testing
async function createTestHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('+page.server.ts - Profile', () => {
  let mockPlatform: { env: { DB: unknown } };
  let mockCookies: Cookies;
  let mockLocals: { siteId: string };

  beforeEach(() => {
    vi.resetModules();

    mockPlatform = {
      env: { DB: {} }
    };

    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      serialize: vi.fn()
    } as unknown as Cookies;

    mockLocals = { siteId: 'test-site' };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should redirect to login if not authenticated', async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          cookies: mockCookies,
          locals: mockLocals
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('Redirect 302: /auth/login?redirect=/user/profile');
    });

    it('should throw 404 if user not found', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue(null);

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          cookies: mockCookies,
          locals: mockLocals
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('404: User not found');
    });

    it('should return user without password hash', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'customer',
        status: 'active',
        password_hash: 'secret-hash',
        created_at: 1700000000,
        updated_at: 1700000000
      };

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue(mockUser);

      const { load } = await import('./+page.server');

      const result = await load({
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof load>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).user).toBeDefined();
      expect(
        ((result as Record<string, unknown>).user as Record<string, unknown>).password_hash
      ).toBeUndefined();
      expect(((result as Record<string, unknown>).user as Record<string, unknown>).name).toBe(
        'Test User'
      );
      expect(((result as Record<string, unknown>).user as Record<string, unknown>).email).toBe(
        'test@example.com'
      );
    });
  });

  describe('actions.updateProfile', () => {
    it('should throw 401 if not authenticated', async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const { actions } = await import('./+page.server');

      await expect(
        actions.updateProfile({
          request: new Request('http://localhost', {
            method: 'POST',
            body: new FormData()
          }),
          platform: mockPlatform,
          cookies: mockCookies,
          locals: mockLocals
        } as unknown as Parameters<typeof actions.updateProfile>[0])
      ).rejects.toThrow('401: Not authenticated');
    });

    it('should fail validation if name is missing', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      });

      const formData = new FormData();
      formData.append('name', '');
      formData.append('email', 'test@example.com');

      const { actions } = await import('./+page.server');

      const result = await actions.updateProfile({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should fail validation for invalid email format', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      });

      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'invalid-email');

      const { actions } = await import('./+page.server');

      const result = await actions.updateProfile({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should update profile successfully', async () => {
      const { getUserById, getUserByEmail, updateUser } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const getUserByEmailMock = getUserByEmail as ReturnType<typeof vi.fn>;
      const updateUserMock = updateUser as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      });
      getUserByEmailMock.mockResolvedValue(null);
      updateUserMock.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.append('name', 'Updated Name');
      formData.append('email', 'updated@example.com');

      const { actions } = await import('./+page.server');

      const result = await actions.updateProfile({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).success).toBe(true);
      expect(updateUserMock).toHaveBeenCalled();
    });

    it('should fail if email is already taken', async () => {
      const { getUserById, getUserByEmail } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const getUserByEmailMock = getUserByEmail as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      });
      getUserByEmailMock.mockResolvedValue({
        id: 'user-2',
        email: 'taken@example.com'
      });

      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'taken@example.com');

      const { actions } = await import('./+page.server');

      const result = await actions.updateProfile({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });
  });

  describe('actions.changePassword', () => {
    it('should throw 401 if not authenticated', async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const { actions } = await import('./+page.server');

      await expect(
        actions.changePassword({
          request: new Request('http://localhost', {
            method: 'POST',
            body: new FormData()
          }),
          platform: mockPlatform,
          cookies: mockCookies,
          locals: mockLocals
        } as unknown as Parameters<typeof actions.changePassword>[0])
      ).rejects.toThrow('401: Not authenticated');
    });

    it('should fail validation if password is too short', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'existing-hash'
      });

      const formData = new FormData();
      formData.append('currentPassword', 'current123');
      formData.append('newPassword', 'short');
      formData.append('confirmPassword', 'short');

      const { actions } = await import('./+page.server');

      const result = await actions.changePassword({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should fail if passwords do not match', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'existing-hash'
      });

      const formData = new FormData();
      formData.append('currentPassword', 'current123');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'different123');

      const { actions } = await import('./+page.server');

      const result = await actions.changePassword({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should fail if current password is incorrect', async () => {
      const { getUserById } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );

      // Hash of 'correctpassword' - the wrong password won't match
      const correctPasswordHash = await createTestHash('correctpassword');
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: correctPasswordHash
      });

      const formData = new FormData();
      formData.append('currentPassword', 'wrongpassword');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'newpassword123');

      const { actions } = await import('./+page.server');

      const result = await actions.changePassword({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should change password successfully', async () => {
      const { getUserById, updateUser } = await import('$lib/server/db');
      const getUserByIdMock = getUserById as ReturnType<typeof vi.fn>;
      const updateUserMock = updateUser as ReturnType<typeof vi.fn>;

      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(
        encodeURIComponent(JSON.stringify({ id: 'user-1' }))
      );

      // Hash of 'correctpassword' - the correct password will match
      const correctPasswordHash = await createTestHash('correctpassword');
      getUserByIdMock.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: correctPasswordHash
      });
      updateUserMock.mockResolvedValue(undefined);

      const formData = new FormData();
      formData.append('currentPassword', 'correctpassword');
      formData.append('newPassword', 'newpassword123');
      formData.append('confirmPassword', 'newpassword123');

      const { actions } = await import('./+page.server');

      const result = await actions.changePassword({
        request: new Request('http://localhost', {
          method: 'POST',
          body: formData
        }),
        platform: mockPlatform,
        cookies: mockCookies,
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).passwordSuccess).toBe(true);
      expect(updateUserMock).toHaveBeenCalled();
    });
  });
});
