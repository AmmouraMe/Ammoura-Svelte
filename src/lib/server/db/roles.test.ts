import { describe, it, expect, vi } from 'vitest';
import {
  getAllPermissions,
  getPermissionsByCategory,
  getPermissionById,
  getRoleById,
  getRoleByName,
  getAllRoles,
  getRoleWithPermissions,
  getRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  addPermissionToRole,
  removePermissionFromRole,
  setRolePermissions,
  roleHasPermission,
  type Permission,
  type Role
} from './roles';

describe('Roles Repository', () => {
  const siteId = 'test-site';

  describe('getAllPermissions', () => {
    it('should get all permissions', async () => {
      const mockPermissions: Permission[] = [
        {
          id: 'perm-1',
          name: 'orders:read',
          description: 'View orders',
          category: 'orders',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockPermissions, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllPermissions(mockDB);

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM permissions ORDER BY category, name');
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('getPermissionsByCategory', () => {
    it('should get permissions filtered by category', async () => {
      const mockPermissions: Permission[] = [
        {
          id: 'perm-1',
          name: 'orders:read',
          description: 'View orders',
          category: 'orders',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockPermissions, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPermissionsByCategory(mockDB, 'orders');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM permissions WHERE category = ? ORDER BY name'
      );
      expect(mockBind).toHaveBeenCalledWith('orders');
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('getRoleById', () => {
    it('should get role by ID scoped by site', async () => {
      const mockRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      const mockFirst = vi.fn().mockResolvedValue(mockRole);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRoleById(mockDB, siteId, 'role-1');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM roles WHERE id = ? AND site_id = ?');
      expect(mockBind).toHaveBeenCalledWith('role-1', siteId);
      expect(result).toEqual(mockRole);
    });

    it('should return null when role not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRoleById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllRoles', () => {
    it('should get all roles for a site', async () => {
      const mockRoles: Role[] = [
        {
          id: 'role-1',
          site_id: siteId,
          name: 'Manager',
          description: 'Store manager',
          is_system_role: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];
      const mockResults = { results: mockRoles, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllRoles(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE site_id = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId);
      expect(result).toEqual(mockRoles);
    });
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const mockRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockFirst = vi.fn().mockResolvedValue(mockRole);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareSelect = vi.fn().mockReturnValue({ bind: mockBindSelect });

      const mockDB = {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith('INSERT')) {
            return mockPrepare(sql);
          }
          return mockPrepareSelect(sql);
        })
      } as unknown as D1Database;

      const result = await createRole(mockDB, siteId, {
        name: 'Manager',
        description: 'Store manager'
      });

      expect(result).toEqual(mockRole);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      const mockResult = { meta: { changes: 1 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteRole(mockDB, siteId, 'role-1');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM roles WHERE id = ? AND site_id = ?');
      expect(mockBind).toHaveBeenCalledWith('role-1', siteId);
      expect(result).toBe(true);
    });
  });

  describe('addPermissionToRole', () => {
    it('should add a permission to a role', async () => {
      const mockResult = { success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await addPermissionToRole(mockDB, 'role-1', 'perm-1', 'user-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)'
      );
      expect(mockBind).toHaveBeenCalledWith('role-1', 'perm-1', 'user-1');
    });
  });

  describe('removePermissionFromRole', () => {
    it('should remove a permission from a role', async () => {
      const mockResult = { meta: { changes: 1 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await removePermissionFromRole(mockDB, 'role-1', 'perm-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('role-1', 'perm-1');
      expect(result).toBe(true);
    });

    it('should return false when no permission was removed', async () => {
      const mockResult = { meta: { changes: 0 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await removePermissionFromRole(mockDB, 'role-1', 'nonexistent-perm');

      expect(result).toBe(false);
    });
  });

  describe('getPermissionById', () => {
    it('should get a permission by ID', async () => {
      const mockPermission: Permission = {
        id: 'perm-1',
        name: 'orders:read',
        description: 'View orders',
        category: 'orders',
        created_at: 1234567890
      };
      const mockFirst = vi.fn().mockResolvedValue(mockPermission);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPermissionById(mockDB, 'perm-1');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM permissions WHERE id = ?');
      expect(mockBind).toHaveBeenCalledWith('perm-1');
      expect(result).toEqual(mockPermission);
    });

    it('should return null when permission not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPermissionById(mockDB, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getRoleByName', () => {
    it('should get role by name scoped by site', async () => {
      const mockRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      const mockFirst = vi.fn().mockResolvedValue(mockRole);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRoleByName(mockDB, siteId, 'Manager');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE name = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('Manager', siteId);
      expect(result).toEqual(mockRole);
    });

    it('should return null when role not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRoleByName(mockDB, siteId, 'Nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getRolePermissions', () => {
    it('should get all permissions for a role', async () => {
      const mockPermissions: Permission[] = [
        {
          id: 'perm-1',
          name: 'orders:read',
          description: 'View orders',
          category: 'orders',
          created_at: 1234567890
        },
        {
          id: 'perm-2',
          name: 'orders:write',
          description: 'Edit orders',
          category: 'orders',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockPermissions, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRolePermissions(mockDB, 'role-1');

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalledWith('role-1');
      expect(result).toEqual(mockPermissions);
    });

    it('should return empty array when role has no permissions', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRolePermissions(mockDB, 'role-1');

      expect(result).toEqual([]);
    });
  });

  describe('getRoleWithPermissions', () => {
    it('should get role with its permissions', async () => {
      const mockRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      const mockPermissions: Permission[] = [
        {
          id: 'perm-1',
          name: 'orders:read',
          description: 'View orders',
          category: 'orders',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockPermissions, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockFirst = vi.fn().mockResolvedValue(mockRole);
      const mockBind = vi.fn((param1: string, param2?: string) => {
        if (param2) {
          return { first: mockFirst };
        }
        return { all: mockAll };
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRoleWithPermissions(mockDB, siteId, 'role-1');

      expect(result).toEqual({
        ...mockRole,
        permissions: mockPermissions
      });
    });

    it('should return null when role not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRoleWithPermissions(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateRole', () => {
    it('should update role name', async () => {
      const existingRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      const updatedRole: Role = { ...existingRole, name: 'Senior Manager', updated_at: 1234567900 };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(updatedRole);
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn((sql: string) => {
        if (sql.startsWith('UPDATE')) {
          return { bind: mockBindUpdate };
        }
        return { bind: mockBindSelect };
      });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateRole(mockDB, siteId, 'role-1', { name: 'Senior Manager' });

      expect(result).toEqual(updatedRole);
    });

    it('should update role description', async () => {
      const existingRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      const updatedRole: Role = {
        ...existingRole,
        description: 'Updated description',
        updated_at: 1234567900
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(updatedRole);
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn((sql: string) => {
        if (sql.startsWith('UPDATE')) {
          return { bind: mockBindUpdate };
        }
        return { bind: mockBindSelect };
      });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateRole(mockDB, siteId, 'role-1', {
        description: 'Updated description'
      });

      expect(result).toEqual(updatedRole);
    });

    it('should return existing role when no updates provided', async () => {
      const existingRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockFirst = vi.fn().mockResolvedValue(existingRole);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateRole(mockDB, siteId, 'role-1', {});

      expect(result).toEqual(existingRole);
    });

    it('should return null when role not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateRole(mockDB, siteId, 'nonexistent', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should update both name and description', async () => {
      const existingRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };
      const updatedRole: Role = {
        ...existingRole,
        name: 'Senior Manager',
        description: 'Updated description',
        updated_at: 1234567900
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(updatedRole);
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn((sql: string) => {
        if (sql.startsWith('UPDATE')) {
          return { bind: mockBindUpdate };
        }
        return { bind: mockBindSelect };
      });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateRole(mockDB, siteId, 'role-1', {
        name: 'Senior Manager',
        description: 'Updated description'
      });

      expect(result).toEqual(updatedRole);
    });
  });

  describe('setRolePermissions', () => {
    it('should replace all role permissions', async () => {
      const mockResult = { success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await setRolePermissions(mockDB, 'role-1', ['perm-1', 'perm-2'], 'user-1');

      // Should delete existing permissions first
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM role_permissions WHERE role_id = ?');
      // Should add new permissions
      expect(mockPrepare).toHaveBeenCalledWith(
        'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)'
      );
      expect(mockBind).toHaveBeenCalledWith('role-1', 'perm-1', 'user-1');
      expect(mockBind).toHaveBeenCalledWith('role-1', 'perm-2', 'user-1');
    });

    it('should handle empty permissions array', async () => {
      const mockResult = { success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await setRolePermissions(mockDB, 'role-1', [], null);

      // Should only delete existing permissions
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM role_permissions WHERE role_id = ?');
      expect(mockBind).toHaveBeenCalledWith('role-1');
    });
  });

  describe('roleHasPermission', () => {
    it('should return true when role has permission', async () => {
      const mockResult = { count: 1 };
      const mockFirst = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await roleHasPermission(mockDB, 'role-1', 'orders:read');

      expect(mockBind).toHaveBeenCalledWith('role-1', 'orders:read');
      expect(result).toBe(true);
    });

    it('should return false when role does not have permission', async () => {
      const mockResult = { count: 0 };
      const mockFirst = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await roleHasPermission(mockDB, 'role-1', 'orders:write');

      expect(result).toBe(false);
    });

    it('should return false when result is null', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await roleHasPermission(mockDB, 'role-1', 'orders:write');

      expect(result).toBe(false);
    });
  });

  describe('createRole with permissions', () => {
    it('should create role with initial permissions', async () => {
      const mockRole: Role = {
        id: 'role-1',
        site_id: siteId,
        name: 'Manager',
        description: 'Store manager',
        is_system_role: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(mockRole);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await createRole(mockDB, siteId, {
        name: 'Manager',
        description: 'Store manager',
        permission_ids: ['perm-1', 'perm-2']
      });

      expect(result).toEqual(mockRole);
      // Should add permissions
      expect(mockPrepare).toHaveBeenCalledWith(
        'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)'
      );
    });

    it('should throw error when role creation fails', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await expect(
        createRole(mockDB, siteId, {
          name: 'Manager'
        })
      ).rejects.toThrow('Failed to create role');
    });
  });

  describe('deleteRole', () => {
    it('should return false when no role was deleted', async () => {
      const mockResult = { meta: { changes: 0 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteRole(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('branch coverage - undefined results fallback', () => {
    it('getAllPermissions should return empty array when results is undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({ success: true });
      const mockPrepare = vi
        .fn()
        .mockReturnValue({ all: mockAll, bind: vi.fn().mockReturnValue({ all: mockAll }) });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllPermissions(mockDB);
      expect(result).toEqual([]);
    });

    it('getPermissionsByCategory should return empty array when results is undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPermissionsByCategory(mockDB, 'admin');
      expect(result).toEqual([]);
    });

    it('getAllRoles should return empty array when results is undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllRoles(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getRolePermissions should return empty array when results is undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getRolePermissions(mockDB, 'role-1');
      expect(result).toEqual([]);
    });
  });

  describe('createRole - empty permissions branch', () => {
    it('should create role without permission_ids', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'role-new',
        site_id: siteId,
        name: 'TestRole',
        description: 'A test role',
        is_system: 0,
        created_at: 12345,
        updated_at: 12345
      });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await createRole(mockDB, siteId, {
        name: 'TestRole',
        description: 'A test role'
      });
      expect(result).toBeDefined();
    });

    it('should create role with empty permission_ids array', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'role-new',
        site_id: siteId,
        name: 'TestRole',
        description: 'A test role',
        is_system: 0,
        created_at: 12345,
        updated_at: 12345
      });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await createRole(mockDB, siteId, {
        name: 'TestRole',
        description: 'A test role',
        permission_ids: []
      });
      expect(result).toBeDefined();
    });
  });
});
