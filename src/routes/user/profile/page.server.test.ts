import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module
vi.mock('$lib/server/db', () => ({
  getDB: vi.fn(() => ({})),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn()
}));

// Mock activity logs
vi.mock('$lib/server/db/activity-logs', () => ({
  createActivityLog: vi.fn()
}));

// Mock the password helpers (real PBKDF2 — tests control verify/hash results directly)
vi.mock('$lib/server/password', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn()
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

describe('+page.server.ts - Profile', () => {
  let mockPlatform: { env: { DB: unknown } };
  let mockLocals: { siteId: string; currentUser?: Record<string, unknown> };

  beforeEach(() => {
    vi.resetModules();

    mockPlatform = {
      env: { DB: {} }
    };

    mockLocals = { siteId: 'test-site' };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should redirect to login if not authenticated', async () => {
      mockLocals.currentUser = undefined;

      const { load } = await import('./+page.server');

      await expect(
        load({
          platform: mockPlatform,
          locals: mockLocals
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow('Redirect 302: /auth/login?redirect=/user/profile');
    });

    it('should return user without password hash', async () => {
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

      mockLocals.currentUser = mockUser;

      const { load } = await import('./+page.server');

      const result = await load({
        platform: mockPlatform,
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
      mockLocals.currentUser = undefined;

      const { actions } = await import('./+page.server');

      await expect(
        actions.updateProfile({
          request: new Request('http://localhost', {
            method: 'POST',
            body: new FormData()
          }),
          platform: mockPlatform,
          locals: mockLocals
        } as unknown as Parameters<typeof actions.updateProfile>[0])
      ).rejects.toThrow('401: Not authenticated');
    });

    it('should fail validation if name is missing', async () => {
      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      };

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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should fail validation for invalid email format', async () => {
      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      };

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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should update profile successfully', async () => {
      const { getUserByEmail, updateUser } = await import('$lib/server/db');
      const getUserByEmailMock = getUserByEmail as ReturnType<typeof vi.fn>;
      const updateUserMock = updateUser as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      };
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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).success).toBe(true);
      expect(updateUserMock).toHaveBeenCalled();
    });

    it('should fail if email is already taken', async () => {
      const { getUserByEmail } = await import('$lib/server/db');
      const getUserByEmailMock = getUserByEmail as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      };
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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.updateProfile>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });
  });

  describe('actions.changePassword', () => {
    it('should throw 401 if not authenticated', async () => {
      mockLocals.currentUser = undefined;

      const { actions } = await import('./+page.server');

      await expect(
        actions.changePassword({
          request: new Request('http://localhost', {
            method: 'POST',
            body: new FormData()
          }),
          platform: mockPlatform,
          locals: mockLocals
        } as unknown as Parameters<typeof actions.changePassword>[0])
      ).rejects.toThrow('401: Not authenticated');
    });

    it('should fail validation if password is too short', async () => {
      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'existing-hash'
      };

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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should fail if passwords do not match', async () => {
      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'existing-hash'
      };

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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should fail if current password is incorrect', async () => {
      const { verifyPassword } = await import('$lib/server/password');
      const verifyPasswordMock = verifyPassword as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'existing-hash'
      };
      verifyPasswordMock.mockResolvedValue(false);

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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).status).toBe(400);
    });

    it('should change password successfully', async () => {
      const { updateUser } = await import('$lib/server/db');
      const { verifyPassword, hashPassword } = await import('$lib/server/password');
      const updateUserMock = updateUser as ReturnType<typeof vi.fn>;
      const verifyPasswordMock = verifyPassword as ReturnType<typeof vi.fn>;
      const hashPasswordMock = hashPassword as ReturnType<typeof vi.fn>;

      mockLocals.currentUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'existing-hash'
      };
      verifyPasswordMock.mockResolvedValue(true);
      hashPasswordMock.mockResolvedValue('new-hashed-password');
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
        locals: mockLocals
      } as unknown as Parameters<typeof actions.changePassword>[0]);

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).passwordSuccess).toBe(true);
      expect(updateUserMock).toHaveBeenCalled();
    });
  });
});
