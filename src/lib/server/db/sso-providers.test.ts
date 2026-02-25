import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSSOProviders,
  getSSOProvider,
  getEnabledSSOProviders,
  createSSOProvider,
  updateSSOProvider,
  deleteSSOProvider,
  disableSSOProvider,
  reorderSSOProviders,
  type SSOProvider,
  type SSOProviderSafe,
  type CreateSSOProviderData,
  type UpdateSSOProviderData
} from './sso-providers';
import { generateEncryptionKey, encrypt } from '../crypto';
import type { D1Database } from '@cloudflare/workers-types';

describe('SSO Providers Database Functions', () => {
  let mockDb: D1Database;
  let testEncryptionKey: string;
  const siteId = 'site-1';

  beforeEach(async () => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database;

    // Generate a fresh encryption key for each test
    testEncryptionKey = await generateEncryptionKey();
  });

  describe('getSSOProviders', () => {
    it('should retrieve all SSO providers for a site without client_secret', async () => {
      const mockProviders: SSOProviderSafe[] = [
        {
          id: 'sso-1',
          site_id: siteId,
          provider: 'google',
          enabled: 1,
          client_id: 'google-client-id',
          tenant: null,
          display_name: 'Google',
          icon: '🔍',
          sort_order: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'sso-2',
          site_id: siteId,
          provider: 'github',
          enabled: 0,
          client_id: 'github-client-id',
          tenant: null,
          display_name: 'GitHub',
          icon: '🐙',
          sort_order: 1,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockProviders });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getSSOProviders(mockDb, siteId);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, site_id, provider, enabled, client_id')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId);
      expect(result).toEqual(mockProviders);
      // Verify client_secret is not in results
      expect(result[0]).not.toHaveProperty('client_secret');
    });

    it('should return empty array when no providers exist', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getSSOProviders(mockDb, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getSSOProvider', () => {
    it('should retrieve a specific SSO provider by provider name', async () => {
      // Encrypt a test secret
      const plainSecret = 'google-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Google',
        icon: '🔍',
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getSSOProvider(mockDb, siteId, 'google', testEncryptionKey);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND provider = ?')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'google');
      expect(result).toBeTruthy();
      expect(result?.client_secret).toBe(plainSecret); // Should be decrypted
    });

    it('should return null when provider not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getSSOProvider(mockDb, siteId, 'twitter', testEncryptionKey);

      expect(result).toBeNull();
    });
  });

  describe('getEnabledSSOProviders', () => {
    it('should retrieve only enabled SSO providers', async () => {
      const plainSecret = 'google-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const mockProviders: SSOProvider[] = [
        {
          id: 'sso-1',
          site_id: siteId,
          provider: 'google',
          enabled: 1,
          client_id: 'google-client-id',
          client_secret: encryptedSecret,
          tenant: null,
          display_name: 'Google',
          icon: '🔍',
          sort_order: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockProviders });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getEnabledSSOProviders(mockDb, siteId, testEncryptionKey);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND enabled = 1')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId);
      expect(result).toHaveLength(1);
      expect(result[0].client_secret).toBe(plainSecret); // Should be decrypted
    });
  });

  describe('createSSOProvider', () => {
    it('should create a new SSO provider', async () => {
      const plainSecret = 'google-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const providerData: CreateSSOProviderData = {
        provider: 'google',
        enabled: true,
        client_id: 'google-client-id',
        client_secret: plainSecret,
        display_name: 'Google',
        icon: '🔍',
        sort_order: 0
      };

      // Mock the encrypted version returned from database
      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Google',
        icon: '🔍',
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindInsert = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindInsert })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await createSSOProvider(mockDb, siteId, providerData, testEncryptionKey);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sso_providers')
      );
      expect(result).toBeTruthy();
      expect(result.client_secret).toBe(plainSecret); // Should return decrypted
    });

    it('should create SSO provider with optional fields', async () => {
      const plainSecret = 'ms-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const providerData: CreateSSOProviderData = {
        provider: 'microsoft',
        enabled: true,
        client_id: 'ms-client-id',
        client_secret: plainSecret,
        tenant: 'common'
      };

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'microsoft',
        enabled: 1,
        client_id: 'ms-client-id',
        client_secret: encryptedSecret,
        tenant: 'common',
        display_name: null,
        icon: null,
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindInsert = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindInsert })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await createSSOProvider(mockDb, siteId, providerData, testEncryptionKey);

      expect(result.tenant).toBe('common');
      expect(result.client_secret).toBe(plainSecret); // Should return decrypted
    });
  });

  describe('updateSSOProvider', () => {
    it('should update an existing SSO provider', async () => {
      const plainSecret = 'google-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const updateData: UpdateSSOProviderData = {
        enabled: false,
        client_id: 'new-client-id',
        display_name: 'Updated Google'
      };

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 0,
        client_id: 'new-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Updated Google',
        icon: '🔍',
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindUpdate })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'google',
        updateData,
        testEncryptionKey
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE sso_providers'));
      expect(result).toBeTruthy();
      expect(result?.client_secret).toBe(plainSecret); // Should return decrypted
    });

    it('should return null if provider not found', async () => {
      const updateData: UpdateSSOProviderData = {
        enabled: false
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindUpdate })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'linkedin',
        updateData,
        testEncryptionKey
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteSSOProvider', () => {
    it('should delete an SSO provider', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      await deleteSSOProvider(mockDb, siteId, 'google');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sso_providers')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'google');
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('disableSSOProvider', () => {
    it('should disable an SSO provider', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      await disableSSOProvider(mockDb, siteId, 'google');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sso_providers SET enabled = 0')
      );
      expect(mockBind).toHaveBeenCalledWith(expect.any(Number), siteId, 'google');
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('reorderSSOProviders', () => {
    it('should update sort orders for multiple providers', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      mockDb.prepare = mockPrepare;

      const mockBatch = vi.fn().mockResolvedValue([{ success: true }, { success: true }]);
      mockDb.batch = mockBatch;

      const providerOrders = [
        { provider: 'google' as const, sort_order: 1 },
        { provider: 'github' as const, sort_order: 0 }
      ];

      await reorderSSOProviders(mockDb, siteId, providerOrders);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sso_providers SET sort_order = ?')
      );
      expect(mockBatch).toHaveBeenCalled();
    });
  });

  describe('updateSSOProvider - edge cases', () => {
    it('should throw error when updating client_secret without encryption key', async () => {
      const updateData: UpdateSSOProviderData = {
        client_secret: 'new-secret'
      };

      await expect(updateSSOProvider(mockDb, siteId, 'google', updateData)).rejects.toThrow(
        'Encryption key required to update client_secret'
      );
    });

    it('should update client_secret when encryption key is provided', async () => {
      const plainSecret = 'new-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const updateData: UpdateSSOProviderData = {
        client_secret: plainSecret
      };

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Google',
        icon: '🔍',
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindUpdate })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'google',
        updateData,
        testEncryptionKey
      );

      expect(result).toBeTruthy();
    });

    it('should return existing provider when no updates provided', async () => {
      const plainSecret = 'existing-secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Google',
        icon: '🔍',
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBindSelect });

      const result = await updateSSOProvider(mockDb, siteId, 'google', {}, testEncryptionKey);

      expect(result).toBeTruthy();
      expect(result?.client_secret).toBe(plainSecret);
    });

    it('should update tenant field', async () => {
      const plainSecret = 'secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const updateData: UpdateSSOProviderData = {
        tenant: 'my-tenant-id'
      };

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'microsoft',
        enabled: 1,
        client_id: 'ms-client-id',
        client_secret: encryptedSecret,
        tenant: 'my-tenant-id',
        display_name: 'Microsoft',
        icon: null,
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindUpdate })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'microsoft',
        updateData,
        testEncryptionKey
      );

      expect(result?.tenant).toBe('my-tenant-id');
    });

    it('should update icon field', async () => {
      const plainSecret = 'secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const updateData: UpdateSSOProviderData = {
        icon: '🔐'
      };

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Google',
        icon: '🔐',
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindUpdate })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'google',
        updateData,
        testEncryptionKey
      );

      expect(result?.icon).toBe('🔐');
    });

    it('should update sort_order field', async () => {
      const plainSecret = 'secret';
      const encryptedSecret = await encrypt(plainSecret, testEncryptionKey);

      const updateData: UpdateSSOProviderData = {
        sort_order: 5
      };

      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: encryptedSecret,
        tenant: null,
        display_name: 'Google',
        icon: null,
        sort_order: 5,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindUpdate })
        .mockReturnValueOnce({ bind: mockBindSelect });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'google',
        updateData,
        testEncryptionKey
      );

      expect(result?.sort_order).toBe(5);
    });
  });

  describe('getSSOProvider - error handling', () => {
    it('should throw error when decryption fails', async () => {
      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: 'invalid-encrypted-secret',
        tenant: null,
        display_name: 'Google',
        icon: null,
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      await expect(getSSOProvider(mockDb, siteId, 'google', testEncryptionKey)).rejects.toThrow(
        'Failed to decrypt SSO provider credentials'
      );
    });
  });

  describe('createSSOProvider - edge cases', () => {
    it('should throw error when failed to create provider', async () => {
      const providerData: CreateSSOProviderData = {
        provider: 'google',
        enabled: true,
        client_id: 'google-client-id',
        client_secret: 'secret',
        display_name: 'Google'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindInsert = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(null); // Simulate failure to retrieve
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindInsert })
        .mockReturnValueOnce({ bind: mockBindSelect });

      await expect(
        createSSOProvider(mockDb, siteId, providerData, testEncryptionKey)
      ).rejects.toThrow('Failed to create SSO provider');
    });
  });

  describe('getEnabledSSOProviders - edge cases', () => {
    it('should return empty array when no enabled providers', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getEnabledSSOProviders(mockDb, siteId, testEncryptionKey);

      expect(result).toEqual([]);
    });

    it('should handle multiple enabled providers', async () => {
      const secret1 = await encrypt('secret1', testEncryptionKey);
      const secret2 = await encrypt('secret2', testEncryptionKey);

      const mockProviders: SSOProvider[] = [
        {
          id: 'sso-1',
          site_id: siteId,
          provider: 'google',
          enabled: 1,
          client_id: 'google-id',
          client_secret: secret1,
          tenant: null,
          display_name: 'Google',
          icon: null,
          sort_order: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'sso-2',
          site_id: siteId,
          provider: 'github',
          enabled: 1,
          client_id: 'github-id',
          client_secret: secret2,
          tenant: null,
          display_name: 'GitHub',
          icon: null,
          sort_order: 1,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockProviders });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getEnabledSSOProviders(mockDb, siteId, testEncryptionKey);

      expect(result).toHaveLength(2);
      expect(result[0].client_secret).toBe('secret1');
      expect(result[1].client_secret).toBe('secret2');
    });
  });

  describe('getEnabledSSOProviders - additional branch coverage', () => {
    it('should return providers without decryption when no encryption key', async () => {
      const mockProviders: SSOProvider[] = [
        {
          id: 'sso-1',
          site_id: siteId,
          provider: 'google',
          enabled: 1,
          client_id: 'google-client-id',
          client_secret: 'raw-encrypted-text',
          tenant: null,
          display_name: 'Google',
          icon: null,
          sort_order: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockProviders });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getEnabledSSOProviders(mockDb, siteId);

      expect(result).toHaveLength(1);
      expect(result[0].client_secret).toBe('raw-encrypted-text');
    });

    it('should skip decryption for provider with empty client_secret', async () => {
      const mockProviders: SSOProvider[] = [
        {
          id: 'sso-1',
          site_id: siteId,
          provider: 'google',
          enabled: 1,
          client_id: 'google-client-id',
          client_secret: '',
          tenant: null,
          display_name: 'Google',
          icon: null,
          sort_order: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockProviders });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getEnabledSSOProviders(mockDb, siteId, testEncryptionKey);

      expect(result).toHaveLength(1);
      expect(result[0].client_secret).toBe('');
    });

    it('should throw when decryption fails for an enabled provider', async () => {
      const mockProviders: SSOProvider[] = [
        {
          id: 'sso-1',
          site_id: siteId,
          provider: 'google',
          enabled: 1,
          client_id: 'google-client-id',
          client_secret: 'invalid-encrypted-data',
          tenant: null,
          display_name: 'Google',
          icon: null,
          sort_order: 0,
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockAll = vi.fn().mockResolvedValue({ results: mockProviders });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      await expect(getEnabledSSOProviders(mockDb, siteId, testEncryptionKey)).rejects.toThrow(
        'Failed to decrypt SSO provider credentials'
      );
    });
  });

  describe('getSSOProvider - without encryption key', () => {
    it('should return provider with raw client_secret when no encryption key', async () => {
      const mockProvider: SSOProvider = {
        id: 'sso-1',
        site_id: siteId,
        provider: 'google',
        enabled: 1,
        client_id: 'google-client-id',
        client_secret: 'raw-encrypted-text',
        tenant: null,
        display_name: 'Google',
        icon: null,
        sort_order: 0,
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockFirst = vi.fn().mockResolvedValue(mockProvider);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await getSSOProvider(mockDb, siteId, 'google');

      expect(result).toBeTruthy();
      expect(result?.client_secret).toBe('raw-encrypted-text');
    });
  });

  describe('updateSsoProvider additional branches', () => {
    it('should update client_id field', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        provider: 'google',
        site_id: siteId,
        enabled: 1,
        client_id: 'new-client-id',
        client_secret: 'encrypted',
        tenant: null,
        display_name: null,
        icon: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(mockDb, siteId, 'google', {
        client_id: 'new-client-id'
      });

      expect(result).toBeTruthy();
    });

    it('should update tenant field', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        provider: 'microsoft',
        site_id: siteId,
        enabled: 1,
        client_id: 'cid',
        client_secret: 'encrypted',
        tenant: 'my-tenant',
        display_name: null,
        icon: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(mockDb, siteId, 'microsoft', {
        tenant: 'my-tenant'
      });

      expect(result).toBeTruthy();
    });

    it('should update display_name and icon fields', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        provider: 'google',
        site_id: siteId,
        enabled: 1,
        client_id: 'cid',
        client_secret: 'encrypted',
        tenant: null,
        display_name: 'Google Login',
        icon: 'google-icon',
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(mockDb, siteId, 'google', {
        display_name: 'Google Login',
        icon: 'google-icon'
      });

      expect(result).toBeTruthy();
    });

    it('should update client_secret with encryption when encryptionKey provided', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'sso-1',
        provider: 'google',
        site_id: siteId,
        enabled: 1,
        client_id: 'cid',
        client_secret: null,
        tenant: null,
        display_name: null,
        icon: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(
        mockDb,
        siteId,
        'google',
        { client_secret: 'new-secret' },
        testEncryptionKey
      );

      expect(result).toBeTruthy();
    });

    it('should update sort_order field', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'sso-1',
        provider: 'google',
        site_id: siteId,
        enabled: 1,
        client_id: 'cid',
        client_secret: 'encrypted',
        tenant: null,
        display_name: null,
        icon: null,
        sort_order: 5,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(mockDb, siteId, 'google', {
        sort_order: 5
      });

      expect(result).toBeTruthy();
    });

    it('should convert empty string tenant to null', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'sso-1',
        provider: 'microsoft',
        site_id: siteId,
        enabled: 1,
        client_id: 'cid',
        client_secret: null,
        tenant: null,
        display_name: null,
        icon: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(mockDb, siteId, 'microsoft', {
        tenant: ''
      });

      expect(result).toBeTruthy();
      // Empty string should be converted to null via || null
      // bind receives: (null, timestamp, siteId, provider) = 4 args
      expect(mockBind).toHaveBeenCalledWith(
        null,
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('should convert empty string display_name to null', async () => {
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'sso-1',
        provider: 'google',
        site_id: siteId,
        enabled: 1,
        client_id: 'cid',
        client_secret: null,
        tenant: null,
        display_name: null,
        icon: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const result = await updateSSOProvider(mockDb, siteId, 'google', {
        display_name: '',
        icon: ''
      });

      expect(result).toBeTruthy();
    });
  });

  describe('null results fallbacks', () => {
    it('getSSOProviders should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const { getSSOProviders } = await import('./sso-providers');
      const result = await getSSOProviders(mockDb, siteId);
      expect(result).toEqual([]);
    });

    it('getEnabledSSOProviders should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ bind: mockBind });

      const { getEnabledSSOProviders } = await import('./sso-providers');
      const result = await getEnabledSSOProviders(mockDb, siteId);
      expect(result).toEqual([]);
    });
  });
});
