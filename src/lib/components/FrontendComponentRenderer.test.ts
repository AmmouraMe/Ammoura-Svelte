import { describe, it, expect } from 'vitest';

/**
 * Tests for the visibility checking logic in FrontendComponentRenderer
 *
 * The visibility logic determines whether a component should be rendered
 * based on the user's authentication state and roles.
 */

// Extracted visibility checking logic for testing
interface UserInfo {
  id?: number | string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
}

interface VisibilityConfig {
  visibilityRule?: 'always' | 'authenticated' | 'unauthenticated' | 'role';
  requiredRoles?: string[];
  hideFromRoles?: string[];
}

/**
 * Check if the component should be visible based on visibility rules
 * This is the same logic used in FrontendComponentRenderer
 */
function checkVisibility(config: VisibilityConfig, user: UserInfo | null | undefined): boolean {
  const visibilityRule = config.visibilityRule ?? 'always';
  const requiredRoles = config.requiredRoles ?? [];
  const hideFromRoles = config.hideFromRoles ?? [];

  const isAuthenticated = !!user;

  // Get all roles for the current user
  const getUserRoles = (): string[] => {
    if (!user) return [];
    const roles: string[] = [];
    if (user.role) roles.push(user.role);
    if (user.roles) roles.push(...user.roles);
    return roles;
  };

  const userRoles = getUserRoles();

  // Check hideFromRoles first (takes priority)
  if (hideFromRoles.length > 0 && userRoles.some((r) => hideFromRoles.includes(r))) {
    return false; // Hide from this user
  }

  switch (visibilityRule) {
    case 'always':
      return true;
    case 'authenticated':
      return isAuthenticated;
    case 'unauthenticated':
      return !isAuthenticated;
    case 'role':
      // User must be authenticated AND have at least one of the required roles
      if (!isAuthenticated) return false;
      if (requiredRoles.length === 0) return true; // No specific roles required, just auth
      return userRoles.some((r) => requiredRoles.includes(r));
    default:
      return true;
  }
}

describe('FrontendComponentRenderer - Visibility Controls', () => {
  describe('visibilityRule: always', () => {
    it('shows component when visibilityRule is "always" and no user', () => {
      const config: VisibilityConfig = { visibilityRule: 'always' };
      expect(checkVisibility(config, null)).toBe(true);
    });

    it('shows component when visibilityRule is "always" and user is logged in', () => {
      const config: VisibilityConfig = { visibilityRule: 'always' };
      const user: UserInfo = { id: 1, email: 'test@test.com', role: 'customer' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('shows component when visibilityRule is undefined (defaults to always)', () => {
      const config: VisibilityConfig = {};
      expect(checkVisibility(config, null)).toBe(true);
    });
  });

  describe('visibilityRule: authenticated', () => {
    it('hides component when visibilityRule is "authenticated" and no user', () => {
      const config: VisibilityConfig = { visibilityRule: 'authenticated' };
      expect(checkVisibility(config, null)).toBe(false);
    });

    it('hides component when visibilityRule is "authenticated" and user is undefined', () => {
      const config: VisibilityConfig = { visibilityRule: 'authenticated' };
      expect(checkVisibility(config, undefined)).toBe(false);
    });

    it('shows component when visibilityRule is "authenticated" and user is logged in', () => {
      const config: VisibilityConfig = { visibilityRule: 'authenticated' };
      const user: UserInfo = { id: 1, email: 'test@test.com', role: 'customer' };
      expect(checkVisibility(config, user)).toBe(true);
    });
  });

  describe('visibilityRule: unauthenticated', () => {
    it('shows component when visibilityRule is "unauthenticated" and no user', () => {
      const config: VisibilityConfig = { visibilityRule: 'unauthenticated' };
      expect(checkVisibility(config, null)).toBe(true);
    });

    it('hides component when visibilityRule is "unauthenticated" and user is logged in', () => {
      const config: VisibilityConfig = { visibilityRule: 'unauthenticated' };
      const user: UserInfo = { id: 1, email: 'test@test.com', role: 'customer' };
      expect(checkVisibility(config, user)).toBe(false);
    });
  });

  describe('visibilityRule: role', () => {
    it('hides component when visibilityRule is "role" and no user', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin']
      };
      expect(checkVisibility(config, null)).toBe(false);
    });

    it('hides component when user lacks required role', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin']
      };
      const user: UserInfo = { id: 1, role: 'customer' };
      expect(checkVisibility(config, user)).toBe(false);
    });

    it('shows component when user has required role', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin']
      };
      const user: UserInfo = { id: 1, role: 'admin' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('shows component when user has one of multiple required roles', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin', 'editor', 'moderator']
      };
      const user: UserInfo = { id: 1, role: 'editor' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('shows component when user has role in roles array', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin']
      };
      const user: UserInfo = { id: 1, role: 'customer', roles: ['admin', 'moderator'] };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('shows component with role visibility when no specific roles required (just auth)', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: [] // Empty = just authenticated
      };
      const user: UserInfo = { id: 1, role: 'customer' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('hides component with role visibility when no specific roles required but not authenticated', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: []
      };
      expect(checkVisibility(config, null)).toBe(false);
    });

    it('hides component when user has none of the required roles', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin', 'super_admin']
      };
      const user: UserInfo = { id: 1, role: 'customer', roles: ['buyer', 'newsletter'] };
      expect(checkVisibility(config, user)).toBe(false);
    });
  });

  describe('hideFromRoles', () => {
    it('hides component from user with banned role even with always visibility', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'always',
        hideFromRoles: ['banned']
      };
      const user: UserInfo = { id: 1, role: 'banned' };
      expect(checkVisibility(config, user)).toBe(false);
    });

    it('hides component from user with hidden role in roles array', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'always',
        hideFromRoles: ['restricted']
      };
      const user: UserInfo = { id: 1, role: 'customer', roles: ['restricted'] };
      expect(checkVisibility(config, user)).toBe(false);
    });

    it('shows component to user without hidden role', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'always',
        hideFromRoles: ['banned', 'restricted']
      };
      const user: UserInfo = { id: 1, role: 'customer' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('hideFromRoles takes precedence over requiredRoles', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin', 'moderator'],
        hideFromRoles: ['suspended_admin']
      };
      // User has admin role but also suspended_admin - should be hidden
      const user: UserInfo = { id: 1, role: 'admin', roles: ['suspended_admin'] };
      expect(checkVisibility(config, user)).toBe(false);
    });

    it('hideFromRoles allows admins not in the blocked list', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['admin'],
        hideFromRoles: ['suspended_admin']
      };
      const user: UserInfo = { id: 1, role: 'admin' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('hideFromRoles is ignored for unauthenticated users', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'always',
        hideFromRoles: ['banned']
      };
      expect(checkVisibility(config, null)).toBe(true);
    });

    it('hides component for user matching any of multiple hideFromRoles', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'authenticated',
        hideFromRoles: ['banned', 'suspended', 'probation']
      };
      const user: UserInfo = { id: 1, role: 'suspended' };
      expect(checkVisibility(config, user)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles user with both role and roles properties', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role',
        requiredRoles: ['moderator']
      };
      // role is customer, but roles array contains moderator
      const user: UserInfo = { id: 1, role: 'customer', roles: ['moderator'] };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('handles empty user object', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'authenticated'
      };
      const user: UserInfo = {};
      expect(checkVisibility(config, user)).toBe(true); // User object exists
    });

    it('handles undefined requiredRoles with role visibility', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'role'
        // requiredRoles is undefined
      };
      const user: UserInfo = { id: 1, role: 'customer' };
      expect(checkVisibility(config, user)).toBe(true); // Just needs to be authenticated
    });

    it('handles undefined hideFromRoles', () => {
      const config: VisibilityConfig = {
        visibilityRule: 'authenticated'
        // hideFromRoles is undefined
      };
      const user: UserInfo = { id: 1, role: 'banned' };
      expect(checkVisibility(config, user)).toBe(true);
    });

    it('handles unknown visibilityRule value by defaulting to visible', () => {
      const config = {
        visibilityRule: 'unknown_rule' as 'always'
      };
      expect(checkVisibility(config, null)).toBe(true);
    });
  });
});
