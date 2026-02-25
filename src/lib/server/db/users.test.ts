import { describe, it, expect, vi } from 'vitest';
import {
  getUserById,
  getUserByEmail,
  getAllUsers,
  getUsersByRole,
  createUser,
  updateUser,
  deleteUser,
  updateUserLogin,
  getUsersByStatus,
  getUsersWithExpiration,
  getExpiredUsers,
  getUsersExpiringSoon,
  deactivateExpiredUsers,
  getAdminUsers,
  getCustomerUsers,
  getPurchasingCustomers,
  type DBUser,
  type CreateUserData,
  type UpdateUserData
} from './users';

describe('Users Repository', () => {
  const siteId = 'test-site';
  const mockUser: DBUser = {
    id: 'user-1',
    site_id: siteId,
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
    role: 'customer',
    permissions: '[]',
    status: 'active',
    expiration_date: null,
    grace_period_days: 0,
    last_login_at: null,
    last_login_ip: null,
    created_by: null,
    updated_by: null,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('getUserById', () => {
    it('should get user by ID scoped by site', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUserById(mockDB, siteId, 'user-1');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? AND site_id = ?');
      expect(mockBind).toHaveBeenCalledWith('user-1', siteId);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUserById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email scoped by site', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUserByEmail(mockDB, siteId, 'test@example.com');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('test@example.com', siteId);
      expect(result).toEqual(mockUser);
    });

    it('should return null when email not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUserByEmail(mockDB, siteId, 'nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should get all users for a site', async () => {
      const mockResults = { results: [mockUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllUsers(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE site_id = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId);
      expect(result).toEqual([mockUser]);
    });

    it('should return empty array when no users found', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllUsers(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role scoped by site', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      const mockResults = { results: [adminUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersByRole(mockDB, siteId, 'admin');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE site_id = ? AND role = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'admin');
      expect(result).toEqual([adminUser]);
    });

    it('should return empty array when no users with role found', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersByRole(mockDB, siteId, 'admin');

      expect(result).toEqual([]);
    });
  });

  describe('createUser', () => {
    it('should create a new user with all fields', async () => {
      const userData: CreateUserData = {
        email: 'new@example.com',
        name: 'New User',
        password_hash: 'hashed_password',
        role: 'admin'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await createUser(mockDB, siteId, userData);

      expect(result).toEqual(mockUser);
    });

    it('should create user with default role', async () => {
      const userData: CreateUserData = {
        email: 'new@example.com',
        name: 'New User',
        password_hash: 'hashed_password'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await createUser(mockDB, siteId, userData);

      expect(result).toEqual(mockUser);
    });

    it('should throw error when user creation fails', async () => {
      const userData: CreateUserData = {
        email: 'new@example.com',
        name: 'New User',
        password_hash: 'hashed_password'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      await expect(createUser(mockDB, siteId, userData)).rejects.toThrow('Failed to create user');
    });
  });

  describe('updateUser', () => {
    it('should update user with all fields', async () => {
      const updateData: UpdateUserData = {
        email: 'updated@example.com',
        name: 'Updated User',
        password_hash: 'new_hash',
        role: 'admin'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update user with partial fields', async () => {
      const updateData: UpdateUserData = {
        name: 'Updated User'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'nonexistent', { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return user unchanged when no updates provided', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', {});

      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user scoped by site', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteUser(mockDB, siteId, 'user-1');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ? AND site_id = ?');
      expect(mockBind).toHaveBeenCalledWith('user-1', siteId);
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteUser(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('updateUserLogin', () => {
    it('should update user last login time and IP', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const ipAddress = '192.168.1.1';
      await updateUserLogin(mockDB, siteId, 'user-1', ipAddress);

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalled();
    });
  });

  describe('getUsersByStatus', () => {
    it('should get users by status scoped by site', async () => {
      const activeUser = { ...mockUser, status: 'active' as const };
      const mockResults = { results: [activeUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersByStatus(mockDB, siteId, 'active');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE site_id = ? AND status = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'active');
      expect(result).toEqual([activeUser]);
    });

    it('should return empty array when no users with status found', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersByStatus(mockDB, siteId, 'suspended');

      expect(result).toEqual([]);
    });
  });

  describe('getUsersWithExpiration', () => {
    it('should get users with expiration dates', async () => {
      const userWithExpiration = { ...mockUser, expiration_date: 1234567890 };
      const mockResults = { results: [userWithExpiration], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersWithExpiration(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM users'));
      expect(mockBind).toHaveBeenCalledWith(siteId);
      expect(result).toEqual([userWithExpiration]);
    });
  });

  describe('getExpiredUsers', () => {
    it('should get expired users past grace period', async () => {
      const now = 1000000;
      const expiredUser = {
        ...mockUser,
        status: 'active' as const,
        expiration_date: now - 10 * 86400,
        grace_period_days: 7
      };
      const mockResults = { results: [expiredUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getExpiredUsers(mockDB, siteId, now);

      expect(mockPrepare).toHaveBeenCalled();
      expect(result).toEqual([expiredUser]);
    });

    it('should return empty array when no expired users', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getExpiredUsers(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getUsersExpiringSoon', () => {
    it('should get users expiring within threshold', async () => {
      const now = 1000000;
      const expiringUser = {
        ...mockUser,
        status: 'active' as const,
        expiration_date: now + 5 * 86400
      };
      const mockResults = { results: [expiringUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersExpiringSoon(mockDB, siteId, now, 7 * 86400);

      expect(mockPrepare).toHaveBeenCalled();
      expect(result).toEqual([expiringUser]);
    });

    it('should return empty array when no users expiring soon', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersExpiringSoon(mockDB, siteId, 7);

      expect(result).toEqual([]);
    });
  });

  describe('deactivateExpiredUsers', () => {
    it('should deactivate expired users', async () => {
      const now = 1000000;
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 2 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deactivateExpiredUsers(mockDB, siteId, now);

      expect(mockPrepare).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should return 0 when no users to deactivate', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deactivateExpiredUsers(mockDB, siteId);

      expect(result).toBe(0);
    });
  });

  describe('updateUser - additional field branches', () => {
    it('should update permissions field', async () => {
      const updateData: UpdateUserData = {
        permissions: ['read', 'write']
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update status field', async () => {
      const updateData: UpdateUserData = {
        status: 'suspended'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update expiration_date field', async () => {
      const updateData: UpdateUserData = {
        expiration_date: 9999999999
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update grace_period_days field', async () => {
      const updateData: UpdateUserData = {
        grace_period_days: 14
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update last_login_at field', async () => {
      const updateData: UpdateUserData = {
        last_login_at: 1234567890
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update last_login_ip field', async () => {
      const updateData: UpdateUserData = {
        last_login_ip: '10.0.0.1'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });

    it('should update updated_by field', async () => {
      const updateData: UpdateUserData = {
        updated_by: 'admin-1'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateUser(mockDB, siteId, 'user-1', updateData);

      expect(result).toEqual(mockUser);
    });
  });

  describe('getAdminUsers', () => {
    it('should get users with admin roles', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      const mockResults = { results: [adminUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAdminUsers(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("role IN ('admin', 'user', 'platform_engineer')")
      );
      expect(result).toEqual([adminUser]);
    });

    it('should return empty array when no admin users', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAdminUsers(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getCustomerUsers', () => {
    it('should get users with customer role or orders', async () => {
      const customerUser = { ...mockUser, role: 'customer' as const };
      const mockResults = { results: [customerUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getCustomerUsers(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN orders'));
      expect(result).toEqual([customerUser]);
    });

    it('should return empty array when no customers', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getCustomerUsers(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getPurchasingCustomers', () => {
    it('should get customers who have made purchases', async () => {
      const purchasingUser = { ...mockUser, role: 'customer' as const };
      const mockResults = { results: [purchasingUser], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPurchasingCustomers(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INNER JOIN orders'));
      expect(result).toEqual([purchasingUser]);
    });

    it('should return empty array when no purchasing customers', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPurchasingCustomers(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('createUser - all optional fields provided', () => {
    it('should create user with status, expiration_date, grace_period_days, and created_by', async () => {
      const userData: CreateUserData = {
        email: 'full@example.com',
        name: 'Full User',
        password_hash: 'hashed_password',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
        status: 'inactive',
        expiration_date: 1700000000,
        grace_period_days: 30,
        created_by: 'admin-user-1'
      };

      const createdUser: DBUser = {
        ...mockUser,
        email: 'full@example.com',
        name: 'Full User',
        role: 'admin',
        permissions: '["read","write","delete"]',
        status: 'inactive',
        expiration_date: 1700000000,
        grace_period_days: 30,
        created_by: 'admin-user-1'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(createdUser);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await createUser(mockDB, siteId, userData);

      expect(result).toEqual(createdUser);
      expect(result.status).toBe('inactive');
      expect(result.expiration_date).toBe(1700000000);
      expect(result.grace_period_days).toBe(30);
      expect(result.created_by).toBe('admin-user-1');
    });
  });

  describe('null results fallback branches', () => {
    it('getAllUsers should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllUsers(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getUsersByRole should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersByRole(mockDB, siteId, 'admin');
      expect(result).toEqual([]);
    });

    it('getUsersByStatus should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersByStatus(mockDB, siteId, 'active');
      expect(result).toEqual([]);
    });

    it('getUsersWithExpiration should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersWithExpiration(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getExpiredUsers should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getExpiredUsers(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getUsersExpiringSoon should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUsersExpiringSoon(mockDB, siteId, 7);
      expect(result).toEqual([]);
    });

    it('getAdminUsers should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAdminUsers(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getCustomerUsers should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getCustomerUsers(mockDB, siteId);
      expect(result).toEqual([]);
    });
  });

  describe('deactivateExpiredUsers - meta undefined', () => {
    it('should return 0 when meta is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: undefined, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deactivateExpiredUsers(mockDB, siteId, 1000000);
      expect(result).toBe(0);
    });
  });

  describe('deleteUser - meta undefined', () => {
    it('should return false when meta is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: undefined, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteUser(mockDB, siteId, 'user-1');
      expect(result).toBe(false);
    });
  });
});
