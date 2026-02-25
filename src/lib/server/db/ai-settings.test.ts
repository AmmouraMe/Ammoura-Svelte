import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import {
  getAISettings,
  getAISetting,
  upsertAISetting,
  deleteAISetting,
  hasAPIKeysConfigured,
  isAIChatEnabled,
  getAvailableProviders,
  setDefaultAIConfig,
  getAvailableFulfillmentProvidersForAI
} from './ai-settings';
import * as crypto from '../crypto';

// Mock the crypto module
vi.mock('../crypto', () => ({
  encrypt: vi.fn((plaintext: string) => Promise.resolve(`encrypted_${plaintext}`)),
  decrypt: vi.fn((ciphertext: string) => Promise.resolve(ciphertext.replace('encrypted_', '')))
}));

describe('AI Settings Database Operations', () => {
  let mockDb: D1Database;
  let mockPrepare: ReturnType<typeof vi.fn>;
  let mockBind: ReturnType<typeof vi.fn>;
  let mockRun: ReturnType<typeof vi.fn>;
  let mockFirst: ReturnType<typeof vi.fn>;
  let mockAll: ReturnType<typeof vi.fn>;
  const testEncryptionKey = 'test-key-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
    mockFirst = vi.fn();
    mockAll = vi.fn();
    mockBind = vi.fn().mockReturnValue({
      run: mockRun,
      first: mockFirst,
      all: mockAll
    });
    mockPrepare = vi.fn().mockReturnValue({
      bind: mockBind
    });
    mockDb = {
      prepare: mockPrepare
    } as unknown as D1Database;
  });

  describe('getAISettings', () => {
    it('should return all AI settings with decrypted values', async () => {
      const mockSettings = [
        {
          id: '1',
          site_id: 'site-1',
          setting_key: 'openai_api_key',
          setting_value: 'encrypted_sk-test123',
          setting_type: 'encrypted',
          description: null,
          created_at: 1000000,
          updated_at: 1000000
        },
        {
          id: '2',
          site_id: 'site-1',
          setting_key: 'temperature',
          setting_value: '0.7',
          setting_type: 'number',
          description: null,
          created_at: 1000000,
          updated_at: 1000000
        },
        {
          id: '3',
          site_id: 'site-1',
          setting_key: 'preferred_model',
          setting_value: 'gpt-4o',
          setting_type: 'string',
          description: null,
          created_at: 1000000,
          updated_at: 1000000
        }
      ];
      mockAll.mockResolvedValue({ results: mockSettings });

      const settings = await getAISettings(mockDb, 'site-1', testEncryptionKey);

      expect(settings.openai_api_key).toBe('sk-test123');
      expect(settings.temperature).toBe(0.7);
      expect(settings.preferred_model).toBe('gpt-4o');
      expect(crypto.decrypt).toHaveBeenCalledWith('encrypted_sk-test123', testEncryptionKey);
    });

    it('should handle boolean settings', async () => {
      const mockSettings = [
        {
          id: '1',
          site_id: 'site-1',
          setting_key: 'some_boolean',
          setting_value: 'true',
          setting_type: 'boolean',
          description: null,
          created_at: 1000000,
          updated_at: 1000000
        }
      ];
      mockAll.mockResolvedValue({ results: mockSettings });

      const settings = await getAISettings(mockDb, 'site-1', testEncryptionKey);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((settings as any).some_boolean).toBe(true);
    });

    it('should skip settings that fail to decrypt', async () => {
      const mockSettings = [
        {
          id: '1',
          site_id: 'site-1',
          setting_key: 'openai_api_key',
          setting_value: 'corrupted_data',
          setting_type: 'encrypted',
          description: null,
          created_at: 1000000,
          updated_at: 1000000
        }
      ];
      mockAll.mockResolvedValue({ results: mockSettings });
      vi.mocked(crypto.decrypt).mockRejectedValueOnce(new Error('Decryption failed'));

      const settings = await getAISettings(mockDb, 'site-1', testEncryptionKey);

      expect(settings.openai_api_key).toBeUndefined();
    });

    it('should return empty object when no settings found', async () => {
      mockAll.mockResolvedValue({ results: [] });

      const settings = await getAISettings(mockDb, 'site-1', testEncryptionKey);

      expect(settings).toEqual({});
    });
  });

  describe('getAISetting', () => {
    it('should return decrypted encrypted setting', async () => {
      const mockSetting = {
        id: '1',
        site_id: 'site-1',
        setting_key: 'openai_api_key',
        setting_value: 'encrypted_sk-test123',
        setting_type: 'encrypted',
        description: null,
        created_at: 1000000,
        updated_at: 1000000
      };
      mockFirst.mockResolvedValue(mockSetting);

      const value = await getAISetting(mockDb, 'site-1', 'openai_api_key', testEncryptionKey);

      expect(value).toBe('sk-test123');
      expect(crypto.decrypt).toHaveBeenCalledWith('encrypted_sk-test123', testEncryptionKey);
    });

    it('should return number setting as number', async () => {
      const mockSetting = {
        id: '1',
        site_id: 'site-1',
        setting_key: 'temperature',
        setting_value: '0.7',
        setting_type: 'number',
        description: null,
        created_at: 1000000,
        updated_at: 1000000
      };
      mockFirst.mockResolvedValue(mockSetting);

      const value = await getAISetting(mockDb, 'site-1', 'temperature', testEncryptionKey);

      expect(value).toBe(0.7);
    });

    it('should return boolean setting as boolean', async () => {
      const mockSetting = {
        id: '1',
        site_id: 'site-1',
        setting_key: 'some_flag',
        setting_value: 'true',
        setting_type: 'boolean',
        description: null,
        created_at: 1000000,
        updated_at: 1000000
      };
      mockFirst.mockResolvedValue(mockSetting);

      const value = await getAISetting(mockDb, 'site-1', 'some_flag', testEncryptionKey);

      expect(value).toBe(true);
    });

    it('should return null when setting not found', async () => {
      mockFirst.mockResolvedValue(null);

      const value = await getAISetting(mockDb, 'site-1', 'nonexistent', testEncryptionKey);

      expect(value).toBeNull();
    });

    it('should return null when decryption fails', async () => {
      const mockSetting = {
        id: '1',
        site_id: 'site-1',
        setting_key: 'openai_api_key',
        setting_value: 'corrupted_data',
        setting_type: 'encrypted',
        description: null,
        created_at: 1000000,
        updated_at: 1000000
      };
      mockFirst.mockResolvedValue(mockSetting);
      vi.mocked(crypto.decrypt).mockRejectedValueOnce(new Error('Decryption failed'));

      const value = await getAISetting(mockDb, 'site-1', 'openai_api_key', testEncryptionKey);

      expect(value).toBeNull();
    });
  });

  describe('upsertAISetting', () => {
    it('should encrypt and store encrypted setting', async () => {
      await upsertAISetting(
        mockDb,
        'site-1',
        'openai_api_key',
        'sk-test123',
        'encrypted',
        testEncryptionKey,
        'OpenAI API Key'
      );

      expect(crypto.encrypt).toHaveBeenCalledWith('sk-test123', testEncryptionKey);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ai_settings'));
      expect(mockBind).toHaveBeenCalledWith(
        expect.any(String), // id
        'site-1',
        'openai_api_key',
        'encrypted_sk-test123',
        'encrypted',
        'OpenAI API Key',
        expect.any(Number), // created_at
        expect.any(Number), // updated_at
        'encrypted_sk-test123', // for ON CONFLICT
        'encrypted',
        'OpenAI API Key',
        expect.any(Number) // updated_at for ON CONFLICT
      );
    });

    it('should store number setting as string', async () => {
      await upsertAISetting(mockDb, 'site-1', 'temperature', 0.7, 'number', testEncryptionKey);

      expect(crypto.encrypt).not.toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalledWith(
        expect.any(String),
        'site-1',
        'temperature',
        '0.7',
        'number',
        null,
        expect.any(Number),
        expect.any(Number),
        '0.7',
        'number',
        null,
        expect.any(Number)
      );
    });

    it('should store boolean setting as string', async () => {
      await upsertAISetting(mockDb, 'site-1', 'some_flag', true, 'boolean', testEncryptionKey);

      expect(mockBind).toHaveBeenCalledWith(
        expect.any(String),
        'site-1',
        'some_flag',
        'true',
        'boolean',
        null,
        expect.any(Number),
        expect.any(Number),
        'true',
        'boolean',
        null,
        expect.any(Number)
      );
    });
  });

  describe('deleteAISetting', () => {
    it('should delete a setting', async () => {
      await deleteAISetting(mockDb, 'site-1', 'openai_api_key');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM ai_settings WHERE site_id = ? AND setting_key = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('site-1', 'openai_api_key');
    });
  });

  describe('hasAPIKeysConfigured', () => {
    it('should return true when API keys exist', async () => {
      mockFirst.mockResolvedValue({ count: 2 });

      const hasKeys = await hasAPIKeysConfigured(mockDb, 'site-1');

      expect(hasKeys).toBe(true);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'));
    });

    it('should return false when no API keys exist', async () => {
      mockFirst.mockResolvedValue({ count: 0 });

      const hasKeys = await hasAPIKeysConfigured(mockDb, 'site-1');

      expect(hasKeys).toBe(false);
    });

    it('should return false when result is null', async () => {
      mockFirst.mockResolvedValue(null);

      const hasKeys = await hasAPIKeysConfigured(mockDb, 'site-1');

      expect(hasKeys).toBe(false);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of configured providers', async () => {
      const mockSettings = [
        { setting_key: 'openai_api_key' },
        { setting_key: 'anthropic_api_key' }
      ];
      mockAll.mockResolvedValue({ results: mockSettings });

      const providers = await getAvailableProviders(mockDb, 'site-1');

      expect(providers).toEqual(['openai', 'anthropic']);
    });

    it('should return empty array when no providers configured', async () => {
      mockAll.mockResolvedValue({ results: [] });

      const providers = await getAvailableProviders(mockDb, 'site-1');

      expect(providers).toEqual([]);
    });

    it('should handle all provider types', async () => {
      const mockSettings = [
        { setting_key: 'openai_api_key' },
        { setting_key: 'anthropic_api_key' },
        { setting_key: 'grok_api_key' }
      ];
      mockAll.mockResolvedValue({ results: mockSettings });

      const providers = await getAvailableProviders(mockDb, 'site-1');

      expect(providers).toEqual(['openai', 'anthropic', 'grok']);
    });
  });

  describe('setDefaultAIConfig', () => {
    it('should set all default configuration values', async () => {
      await setDefaultAIConfig(mockDb, 'site-1', testEncryptionKey);

      // Should call upsertAISetting 5 times (5 default settings)
      expect(mockPrepare).toHaveBeenCalledTimes(5);
      expect(mockBind).toHaveBeenCalledTimes(5);

      // Verify the defaults were set
      const calls = mockBind.mock.calls;
      expect(calls.some((call) => call[2] === 'preferred_model')).toBe(true);
      expect(calls.some((call) => call[2] === 'temperature')).toBe(true);
      expect(calls.some((call) => call[2] === 'max_tokens')).toBe(true);
      expect(calls.some((call) => call[2] === 'cost_limit_daily')).toBe(true);
      expect(calls.some((call) => call[2] === 'rate_limit_per_minute')).toBe(true);
    });
  });

  describe('getAvailableFulfillmentProvidersForAI', () => {
    it('should return active fulfillment providers ordered by default first', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'In-House', is_default: 1 },
        { id: 'provider-2', name: 'Amazon FBA', is_default: 0 },
        { id: 'provider-3', name: 'Dropship', is_default: 0 }
      ];
      mockAll.mockResolvedValue({ results: mockProviders });

      const providers = await getAvailableFulfillmentProvidersForAI(mockDb, 'site-1');

      expect(providers).toEqual([
        { id: 'provider-1', name: 'In-House', isDefault: true },
        { id: 'provider-2', name: 'Amazon FBA', isDefault: false },
        { id: 'provider-3', name: 'Dropship', isDefault: false }
      ]);
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND is_active = 1')
      );
      expect(mockBind).toHaveBeenCalledWith('site-1');
    });

    it('should return empty array when no active providers exist', async () => {
      mockAll.mockResolvedValue({ results: [] });

      const providers = await getAvailableFulfillmentProvidersForAI(mockDb, 'site-1');

      expect(providers).toEqual([]);
    });

    it('should only return active providers', async () => {
      const mockProviders = [{ id: 'provider-1', name: 'In-House', is_default: 1 }];
      mockAll.mockResolvedValue({ results: mockProviders });

      await getAvailableFulfillmentProvidersForAI(mockDb, 'site-1');

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('is_active = 1'));
    });

    it('should order by is_default DESC then name ASC', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'In-House', is_default: 1 },
        { id: 'provider-2', name: 'Amazon', is_default: 0 }
      ];
      mockAll.mockResolvedValue({ results: mockProviders });

      await getAvailableFulfillmentProvidersForAI(mockDb, 'site-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_default DESC, name ASC')
      );
    });
  });

  describe('getAISetting edge cases', () => {
    it('should return number for number-typed setting', async () => {
      mockFirst.mockResolvedValue({
        setting_value: '42',
        setting_type: 'number'
      });

      const result = await getAISetting(mockDb, 'site-1', 'max_tokens', testEncryptionKey);
      expect(result).toBe(42);
    });

    it('should return boolean for boolean-typed setting', async () => {
      mockFirst.mockResolvedValue({
        setting_value: 'true',
        setting_type: 'boolean'
      });

      const result = await getAISetting(mockDb, 'site-1', 'enabled', testEncryptionKey);
      expect(result).toBe(true);
    });

    it('should return null when decrypt fails for encrypted setting', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(crypto.decrypt).mockRejectedValueOnce(new Error('Decrypt failed'));

      mockFirst.mockResolvedValue({
        setting_value: 'encrypted_value',
        setting_type: 'encrypted'
      });

      const result = await getAISetting(mockDb, 'site-1', 'api_key', testEncryptionKey);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to decrypt'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should return string for string-typed setting', async () => {
      mockFirst.mockResolvedValue({
        setting_value: 'hello',
        setting_type: 'string'
      });

      const result = await getAISetting(mockDb, 'site-1', 'greeting', testEncryptionKey);
      expect(result).toBe('hello');
    });
  });

  describe('isAIChatEnabled', () => {
    it('should return false when ai_chat_enabled is not true', async () => {
      mockFirst.mockResolvedValue({
        setting_value: 'false',
        setting_type: 'boolean'
      });

      const result = await isAIChatEnabled(mockDb, 'site-1', testEncryptionKey);
      expect(result).toBe(false);
    });

    it('should return false when enabled but no API keys configured', async () => {
      // First call: getAISetting returns true (ai_chat_enabled)
      // Second call: hasAPIKeysConfigured returns false (no keys)
      mockFirst
        .mockResolvedValueOnce({
          setting_value: 'true',
          setting_type: 'boolean'
        })
        .mockResolvedValueOnce(null);
      mockAll.mockResolvedValueOnce({ results: [] });

      const result = await isAIChatEnabled(mockDb, 'site-1', testEncryptionKey);
      expect(result).toBe(false);
    });
  });

  describe('null results fallbacks', () => {
    it('getAISettings should handle null results from all', async () => {
      mockAll.mockResolvedValue({ results: null });
      const result = await getAISettings(mockDb, 'site-1', testEncryptionKey);
      expect(result).toEqual({});
    });

    it('getAvailableProviders should handle null results', async () => {
      mockAll.mockResolvedValue({ results: null });
      const result = await getAvailableProviders(mockDb, 'site-1');
      expect(result).toEqual([]);
    });

    it('getAvailableFulfillmentProvidersForAI should handle null results', async () => {
      mockAll.mockResolvedValue({ results: null });
      const result = await getAvailableFulfillmentProvidersForAI(mockDb, 'site-1');
      expect(result).toEqual([]);
    });
  });
});
