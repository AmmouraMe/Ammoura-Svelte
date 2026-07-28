import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './hooks.server';
import type { RequestEvent } from '@sveltejs/kit';

describe('Server Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handle', () => {
    it('should set default site ID when platform is not available', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      const event = {
        url: new URL('http://localhost:5173'),
        locals: {} as App.Locals,
        platform: undefined
      } as unknown as RequestEvent;

      await handle({ event, resolve: mockResolve });

      expect(event.locals.siteId).toBe('default-site');
      expect(event.locals.locale).toBe('en');
      expect(event.locals.i18n).toEqual({ defaultLocale: 'en', enabledLocales: ['en'] });
      expect(mockResolve).toHaveBeenCalledWith(event, expect.any(Object));
    });

    it('resolves locale from Accept-Language when the site enables it', async () => {
      // Site settings: default en, enabled [en, es]
      const settingsRows = [
        { setting_key: 'i18n_default_locale', setting_value: 'en' },
        { setting_key: 'i18n_enabled_locales', setting_value: '["en","es"]' }
      ];
      const mockAll = vi.fn().mockResolvedValue({ results: settingsRows });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind, first: mockFirst });
      const mockResolve = vi.fn().mockResolvedValue(new Response());

      const event = {
        url: new URL('http://localhost:5173'),
        locals: {} as App.Locals,
        cookies: { get: vi.fn().mockReturnValue(undefined), delete: vi.fn() },
        request: { headers: new Headers({ 'accept-language': 'es-MX,es;q=0.9,en;q=0.5' }) },
        platform: {
          env: { DB: { prepare: mockPrepare } },
          context: {} as ExecutionContext,
          caches: {} as CacheStorage & { default: Cache }
        }
      } as unknown as RequestEvent;

      await handle({ event, resolve: mockResolve });

      expect(event.locals.locale).toBe('es');
      expect(event.locals.i18n.enabledLocales).toEqual(['en', 'es']);
    });

    it('should set default site ID when DB is not available', async () => {
      const mockResolve = vi.fn().mockResolvedValue(new Response());
      const event = {
        url: new URL('http://localhost:5173'),
        locals: {} as App.Locals,
        platform: {
          env: {},
          context: {} as ExecutionContext,
          caches: {} as CacheStorage & { default: Cache }
        }
      } as unknown as RequestEvent;

      await handle({ event, resolve: mockResolve });

      expect(event.locals.siteId).toBe('default-site');
      expect(mockResolve).toHaveBeenCalledWith(event, expect.any(Object));
    });

    it('should set default site ID when site not found in database', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const mockResolve = vi.fn().mockResolvedValue(new Response());
      const event = {
        url: new URL('http://example.com'),
        locals: {} as App.Locals,
        platform: {
          env: { DB: mockDB },
          context: {} as ExecutionContext,
          caches: {} as CacheStorage & { default: Cache }
        }
      } as unknown as RequestEvent;

      await handle({ event, resolve: mockResolve });

      expect(event.locals.siteId).toBe('default-site');
      expect(mockResolve).toHaveBeenCalledWith(event, expect.any(Object));
    });

    it('should set site ID from database when site found', async () => {
      const mockSite = {
        id: 'site-123',
        name: 'Test Site',
        domain: 'example.com',
        description: 'Test',
        settings: null,
        status: 'active',
        created_at: 123456,
        updated_at: 123456
      };

      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const mockResolve = vi.fn().mockResolvedValue(new Response());
      const event = {
        url: new URL('http://example.com'),
        locals: {} as App.Locals,
        platform: {
          env: { DB: mockDB },
          context: {} as ExecutionContext,
          caches: {} as CacheStorage & { default: Cache }
        }
      } as unknown as RequestEvent;

      await handle({ event, resolve: mockResolve });

      expect(event.locals.siteId).toBe('site-123');
      expect(mockResolve).toHaveBeenCalledWith(event, expect.any(Object));
    });

    it('should handle database errors gracefully', async () => {
      const mockBind = vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error'))
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const mockResolve = vi.fn().mockResolvedValue(new Response());
      const event = {
        url: new URL('http://example.com'),
        locals: {} as App.Locals,
        platform: {
          env: { DB: mockDB },
          context: {} as ExecutionContext,
          caches: {} as CacheStorage & { default: Cache }
        }
      } as unknown as RequestEvent;

      await handle({ event, resolve: mockResolve });

      // Should fall back to default site on error
      expect(event.locals.siteId).toBe('default-site');
      expect(mockResolve).toHaveBeenCalledWith(event, expect.any(Object));
    });

    it('should handle different hostnames', async () => {
      const hostnames = [
        'localhost',
        'example.com',
        'subdomain.example.com',
        '192.168.1.1',
        'store.myshop.local'
      ];

      for (const hostname of hostnames) {
        const mockFirst = vi.fn().mockResolvedValue(null);
        const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
        const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
        const mockDB = { prepare: mockPrepare } as unknown as D1Database;

        const mockResolve = vi.fn().mockResolvedValue(new Response());
        const event = {
          url: new URL(`http://${hostname}`),
          locals: {} as App.Locals,
          platform: {
            env: { DB: mockDB },
            context: {} as ExecutionContext,
            caches: {} as CacheStorage & { default: Cache }
          }
        } as unknown as RequestEvent;

        await handle({ event, resolve: mockResolve });

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM sites WHERE domain = ?');
        expect(mockBind).toHaveBeenCalledWith(hostname);
      }
    });
  });
});
