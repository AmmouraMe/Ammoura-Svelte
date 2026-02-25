import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSiteSettings,
  getSiteSetting,
  upsertSiteSetting,
  getThemeColors,
  updateThemeColors,
  type SiteSetting
} from './site-settings';
import type { D1Database } from '@cloudflare/workers-types';

describe('Site Settings Database Functions', () => {
  let mockDb: D1Database;
  const siteId = 'site-1';

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database;
  });

  describe('getSiteSettings', () => {
    it('should retrieve all settings for a site', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'theme_light_primary',
          setting_value: '#ef4444',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'theme_light_secondary',
          setting_value: '#64748b',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getSiteSettings(mockDb, siteId);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM site_settings WHERE site_id = ? ORDER BY setting_key'
      );
      expect(mockStatement.bind).toHaveBeenCalledWith(siteId);
      expect(result).toEqual(mockSettings);
    });

    it('should return empty array when no settings exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getSiteSettings(mockDb, siteId);

      expect(result).toEqual([]);
    });

    it('should handle null results', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: null })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getSiteSettings(mockDb, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getSiteSetting', () => {
    it('should retrieve a specific setting', async () => {
      const mockResult = { setting_value: '#ef4444' };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockResult)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getSiteSetting(mockDb, siteId, 'theme_light_primary');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT setting_value FROM site_settings WHERE site_id = ? AND setting_key = ?'
      );
      expect(mockStatement.bind).toHaveBeenCalledWith(siteId, 'theme_light_primary');
      expect(result).toBe('#ef4444');
    });

    it('should return null when setting not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getSiteSetting(mockDb, siteId, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when setting_value is undefined', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getSiteSetting(mockDb, siteId, 'test_key');

      expect(result).toBeNull();
    });
  });

  describe('upsertSiteSetting', () => {
    it('should insert a new setting', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await upsertSiteSetting(mockDb, siteId, 'test_key', 'test_value');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO site_settings')
      );
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'test_key',
        'test_value',
        'test_value'
      );
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should update existing setting on conflict', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await upsertSiteSetting(mockDb, siteId, 'existing_key', 'new_value');

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DO UPDATE SET'));
    });
  });

  describe('getThemeColors', () => {
    it('should retrieve light theme colors', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'theme_light_primary',
          setting_value: '#ff0000',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'theme_light_secondary',
          setting_value: '#00ff00',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getThemeColors(mockDb, siteId, 'light');

      expect(result.primary).toBe('#ff0000');
      expect(result.secondary).toBe('#00ff00');
      expect(result.bgPrimary).toBe('#ffffff'); // Default for light mode
      expect(result.textPrimary).toBe('#111827'); // Default for light mode
    });

    it('should retrieve dark theme colors', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'theme_dark_primary',
          setting_value: '#ff00ff',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getThemeColors(mockDb, siteId, 'dark');

      expect(result.primary).toBe('#ff00ff');
      expect(result.bgPrimary).toBe('#0a0118'); // Default for dark mode
      expect(result.textPrimary).toBe('#fdf4ff'); // Default for dark mode
    });

    it('should use defaults when no custom colors set', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getThemeColors(mockDb, siteId, 'light');

      expect(result.primary).toBe('#ef4444');
      expect(result.primaryHover).toBe('#dc2626');
      expect(result.secondary).toBe('#64748b');
    });

    it('should handle snake_case to camelCase conversion', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'theme_light_primary_hover',
          setting_value: '#custom',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'theme_light_bg_primary',
          setting_value: '#ffffff',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getThemeColors(mockDb, siteId, 'light');

      expect(result.primaryHover).toBe('#custom');
      expect(result.bgPrimary).toBe('#ffffff');
    });
  });

  describe('updateThemeColors', () => {
    it('should update light theme colors', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const colors = {
        primary: '#ff0000',
        secondary: '#00ff00'
      };

      await updateThemeColors(mockDb, siteId, 'light', colors);

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'theme_light_primary',
        '#ff0000',
        '#ff0000'
      );
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'theme_light_secondary',
        '#00ff00',
        '#00ff00'
      );
    });

    it('should update dark theme colors', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const colors = {
        bgPrimary: '#000000',
        textPrimary: '#ffffff'
      };

      await updateThemeColors(mockDb, siteId, 'dark', colors);

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'theme_dark_bg_primary',
        '#000000',
        '#000000'
      );
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'theme_dark_text_primary',
        '#ffffff',
        '#ffffff'
      );
    });

    it('should handle camelCase to snake_case conversion', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const colors = {
        primaryHover: '#custom',
        borderSecondary: '#border'
      };

      await updateThemeColors(mockDb, siteId, 'light', colors);

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'theme_light_primary_hover',
        '#custom',
        '#custom'
      );
      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'theme_light_border_secondary',
        '#border',
        '#border'
      );
    });

    it('should skip undefined or null values', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const colors = {
        primary: '#ff0000',
        secondary: undefined as unknown as string
      };

      await updateThemeColors(mockDb, siteId, 'light', colors);

      // Should only be called once for primary, not for secondary
      expect(mockStatement.run).toHaveBeenCalledTimes(1);
    });

    it('should update all color properties', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const allColors = {
        primary: '#1',
        primaryHover: '#2',
        primaryLight: '#3',
        secondary: '#4',
        secondaryHover: '#5',
        bgPrimary: '#6',
        bgSecondary: '#7',
        bgTertiary: '#8',
        textPrimary: '#9',
        textSecondary: '#10',
        borderPrimary: '#11',
        borderSecondary: '#12'
      };

      await updateThemeColors(mockDb, siteId, 'dark', allColors);

      expect(mockStatement.run).toHaveBeenCalledTimes(12);
    });
  });

  describe('getGeneralSettings', () => {
    it('should retrieve general settings with defaults', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'general_store_name',
          setting_value: 'My Store',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'general_currency',
          setting_value: 'EUR',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getGeneralSettings(mockDb, siteId);

      expect(result.storeName).toBe('My Store');
      expect(result.currency).toBe('EUR');
      expect(result.timezone).toBe('UTC'); // Default
    });
  });

  describe('updateGeneralSettings', () => {
    it('should update general settings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await (
        await import('./site-settings')
      ).updateGeneralSettings(mockDb, siteId, {
        storeName: 'Updated Store',
        currency: 'GBP'
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'general_store_name',
        'Updated Store',
        'Updated Store'
      );
    });
  });

  describe('getAddressSettings', () => {
    it('should retrieve address settings with defaults', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'address_city',
          setting_value: 'London',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'address_geolocation_enabled',
          setting_value: 'true',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getAddressSettings(mockDb, siteId);

      expect(result.city).toBe('London');
      expect(result.geolocationEnabled).toBe(true);
      expect(result.country).toBe('US'); // Default
    });
  });

  describe('updateAddressSettings', () => {
    it('should update address settings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await (
        await import('./site-settings')
      ).updateAddressSettings(mockDb, siteId, {
        city: 'Paris',
        geolocationEnabled: false
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'address_city',
        'Paris',
        'Paris'
      );
    });
  });

  describe('getTaxSettings', () => {
    it('should retrieve tax settings with defaults', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'tax_calculations_enabled',
          setting_value: 'true',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'tax_default_rate',
          setting_value: '20.5',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getTaxSettings(mockDb, siteId);

      expect(result.calculationsEnabled).toBe(true);
      expect(result.defaultRate).toBe(20.5);
      expect(result.taxClasses).toEqual([]);
    });

    it('should parse tax classes JSON', async () => {
      const taxClasses = [
        { id: '1', name: 'Standard', rate: 20 },
        { id: '2', name: 'Reduced', rate: 5 }
      ];

      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'tax_classes',
          setting_value: JSON.stringify(taxClasses),
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getTaxSettings(mockDb, siteId);

      expect(result.taxClasses).toEqual(taxClasses);
    });

    it('should handle invalid JSON for tax classes', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'tax_classes',
          setting_value: 'invalid json',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getTaxSettings(mockDb, siteId);

      expect(result.taxClasses).toEqual([]);
    });
  });

  describe('updateTaxSettings', () => {
    it('should update tax settings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await (
        await import('./site-settings')
      ).updateTaxSettings(mockDb, siteId, {
        calculationsEnabled: true,
        defaultRate: 15
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'tax_calculations_enabled',
        'true',
        'true'
      );
    });

    it('should update tax classes', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const taxClasses = [{ id: '1', name: 'Standard', rate: 20 }];

      await (
        await import('./site-settings')
      ).updateTaxSettings(mockDb, siteId, {
        taxClasses
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'tax_classes',
        JSON.stringify(taxClasses),
        JSON.stringify(taxClasses)
      );
    });
  });

  describe('getPaymentSettings', () => {
    it('should retrieve payment settings', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'payment_stripe_enabled',
          setting_value: 'true',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'payment_stripe_mode',
          setting_value: 'live',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getPaymentSettings(mockDb, siteId);

      expect(result.stripeEnabled).toBe(true);
      expect(result.stripeMode).toBe('live');
      expect(result.paypalMode).toBe('sandbox'); // Default
    });
  });

  describe('updatePaymentSettings', () => {
    it('should update payment settings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await (
        await import('./site-settings')
      ).updatePaymentSettings(mockDb, siteId, {
        stripeEnabled: true,
        stripePublicKey: 'pk_test_123'
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'payment_stripe_enabled',
        'true',
        'true'
      );
    });
  });

  describe('getEmailSettings', () => {
    it('should retrieve email settings', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'email_provider',
          setting_value: 'smtp',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'email_smtp_port',
          setting_value: '465',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-3',
          site_id: siteId,
          setting_key: 'email_smtp_secure',
          setting_value: 'true',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getEmailSettings(mockDb, siteId);

      expect(result.provider).toBe('smtp');
      expect(result.smtpPort).toBe(465);
      expect(result.smtpSecure).toBe(true);
    });
  });

  describe('updateEmailSettings', () => {
    it('should update email settings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await (
        await import('./site-settings')
      ).updateEmailSettings(mockDb, siteId, {
        provider: 'smtp',
        smtpHost: 'smtp.example.com'
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'email_provider',
        'smtp',
        'smtp'
      );
    });
  });

  describe('getApiSettings', () => {
    it('should retrieve API settings', async () => {
      const mockSettings: SiteSetting[] = [
        {
          id: 'setting-1',
          site_id: siteId,
          setting_key: 'api_rest_enabled',
          setting_value: 'true',
          created_at: 1234567890,
          updated_at: 1234567890
        },
        {
          id: 'setting-2',
          site_id: siteId,
          setting_key: 'api_rate_limit',
          setting_value: '200',
          created_at: 1234567890,
          updated_at: 1234567890
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockSettings })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await (await import('./site-settings')).getApiSettings(mockDb, siteId);

      expect(result.restEnabled).toBe(true);
      expect(result.rateLimit).toBe(200);
      expect(result.rateLimitWindow).toBe(60); // Default
    });
  });

  describe('updateApiSettings', () => {
    it('should update API settings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await (
        await import('./site-settings')
      ).updateApiSettings(mockDb, siteId, {
        restEnabled: true,
        rateLimit: 150
      });

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        'api_rest_enabled',
        'true',
        'true'
      );
    });
  });

  describe('updateTaxSettings additional branches', () => {
    it('should update pricesIncludeTax setting', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { updateTaxSettings } = await import('./site-settings');
      await updateTaxSettings(mockDb, siteId, {
        pricesIncludeTax: true
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should update displayPricesWithTax setting', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { updateTaxSettings } = await import('./site-settings');
      await updateTaxSettings(mockDb, siteId, {
        displayPricesWithTax: false
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should update both pricesIncludeTax and displayPricesWithTax', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { updateTaxSettings } = await import('./site-settings');
      await updateTaxSettings(mockDb, siteId, {
        pricesIncludeTax: true,
        displayPricesWithTax: true
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('getEmailSettings with populated values', () => {
    it('should use DB values when settings exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({
          results: [
            { setting_key: 'email_provider', setting_value: 'smtp' },
            { setting_key: 'email_smtp_host', setting_value: 'smtp.example.com' },
            { setting_key: 'email_smtp_port', setting_value: '465' }
          ]
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { getEmailSettings } = await import('./site-settings');
      const result = await getEmailSettings(mockDb, siteId);

      expect(result.provider).toBe('smtp');
      expect(result.smtpHost).toBe('smtp.example.com');
      expect(result.smtpPort).toBe(465);
    });
  });

  describe('getApiSettings with populated values', () => {
    it('should use DB values when settings exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({
          results: [
            { setting_key: 'api_rate_limit', setting_value: '200' },
            { setting_key: 'api_rate_limit_window', setting_value: '120' },
            { setting_key: 'api_rest_enabled', setting_value: 'true' }
          ]
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { getApiSettings } = await import('./site-settings');
      const result = await getApiSettings(mockDb, siteId);

      expect(result.rateLimit).toBe(200);
      expect(result.rateLimitWindow).toBe(120);
      expect(result.restEnabled).toBe(true);
    });
  });

  describe('getSiteSettings null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: null })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { getSiteSettings } = await import('./site-settings');
      const result = await getSiteSettings(mockDb, siteId);

      expect(result).toEqual([]);
    });

    it('should return payment settings with defaults when empty', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { getPaymentSettings } = await import('./site-settings');
      const result = await getPaymentSettings(mockDb, siteId);

      expect(result.stripeMode).toBe('test');
    });

    it('should skip undefined values in updatePaymentSettings', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: 1 } })
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { updatePaymentSettings } = await import('./site-settings');
      await updatePaymentSettings(mockDb, siteId, {
        stripeMode: 'live',
        stripePublicKey: undefined as unknown as string
      });

      // Should have called prepare for stripeMode but not for stripePublishableKey
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should return API settings with defaults when empty', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { getApiSettings } = await import('./site-settings');
      const result = await getApiSettings(mockDb, siteId);

      expect(result.rateLimit).toBe(100);
    });
  });
});
