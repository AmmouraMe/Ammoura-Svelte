import { describe, it, expect, vi } from 'vitest';
import { resolveSiteIdForHostname, purgeRouteCache, ROUTE_CACHE_TTL_SECONDS } from './site-routing';

function mockDb(
  domainRow: { site_id: string } | null,
  legacySite: unknown = null,
  slugSite: unknown = null
) {
  const mockFirst = vi
    .fn()
    .mockResolvedValueOnce(domainRow)
    .mockResolvedValueOnce(legacySite)
    .mockResolvedValueOnce(slugSite);
  const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
  const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
  return { db: { prepare: mockPrepare } as unknown as D1Database, mockBind };
}

function mockKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    kv: {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      put: vi.fn(async (k: string, v: string) => void store.set(k, v)),
      delete: vi.fn(async (k: string) => void store.delete(k))
    } as unknown as KVNamespace,
    store
  };
}

describe('site-routing', () => {
  it('should resolve via site_domains and cache the result', async () => {
    const { db } = mockDb({ site_id: 'site-1' });
    const { kv, store } = mockKv();

    const result = await resolveSiteIdForHostname(db, kv, 'Shop.Example.com');
    expect(result).toBe('site-1');
    expect(store.get('host:shop.example.com')).toBe('site-1');
  });

  it('should serve from cache without touching the database', async () => {
    const { db } = mockDb(null);
    const { kv } = mockKv({ 'host:shop.example.com': 'site-1' });

    const result = await resolveSiteIdForHostname(db, kv, 'shop.example.com');
    expect(result).toBe('site-1');
    expect((db as unknown as { prepare: ReturnType<typeof vi.fn> }).prepare).not.toHaveBeenCalled();
  });

  it('should fall back to the legacy sites.domain column', async () => {
    const { db } = mockDb(null, { id: 'legacy-site', status: 'active' });

    const result = await resolveSiteIdForHostname(db, undefined, 'old.example.com');
    expect(result).toBe('legacy-site');
  });

  it('should not route to inactive legacy sites', async () => {
    const { db } = mockDb(null, { id: 'legacy-site', status: 'inactive' });

    const result = await resolveSiteIdForHostname(db, undefined, 'old.example.com');
    expect(result).toBeNull();
  });

  it('should cache negative results and honor them', async () => {
    const { db } = mockDb(null, null);
    const { kv, store } = mockKv();

    expect(await resolveSiteIdForHostname(db, kv, 'nope.example.com')).toBeNull();
    expect(store.get('host:nope.example.com')).toBe('__none__');

    // Second call hits the negative cache, not the db
    const { db: db2 } = mockDb({ site_id: 'should-not-be-used' });
    expect(await resolveSiteIdForHostname(db2, kv, 'nope.example.com')).toBeNull();
  });

  it('should work without a KV binding', async () => {
    const { db } = mockDb({ site_id: 'site-1' });
    expect(await resolveSiteIdForHostname(db, undefined, 'shop.example.com')).toBe('site-1');
  });

  it('should purge cache entries by hostname', async () => {
    const { kv, store } = mockKv({ 'host:shop.example.com': 'site-1' });
    await purgeRouteCache(kv, 'Shop.Example.com');
    expect(store.has('host:shop.example.com')).toBe(false);
  });

  it('should use a short TTL so stale routes expire quickly', () => {
    expect(ROUTE_CACHE_TTL_SECONDS).toBeLessThanOrEqual(300);
  });

  describe('platform-subdomain slug fallback', () => {
    it('should resolve <slug>.<platformSitesDomain> by slug when hostname rows miss', async () => {
      const { db } = mockDb(null, null, { id: 'slug-site', status: 'active' });

      const result = await resolveSiteIdForHostname(db, undefined, 'sdfg.localhost', 'localhost');
      expect(result).toBe('slug-site');
    });

    it('should not resolve by slug for hostnames outside the platform domain', async () => {
      const { db, mockBind } = mockDb(null, null, { id: 'slug-site', status: 'active' });

      const result = await resolveSiteIdForHostname(db, undefined, 'shop.example.com', 'localhost');
      expect(result).toBeNull();
      // Only the site_domains and legacy lookups ran — no slug query
      expect(mockBind).toHaveBeenCalledTimes(2);
    });

    it('should not resolve nested subdomains by slug', async () => {
      const { db, mockBind } = mockDb(null, null, { id: 'slug-site', status: 'active' });

      const result = await resolveSiteIdForHostname(db, undefined, 'a.b.localhost', 'localhost');
      expect(result).toBeNull();
      expect(mockBind).toHaveBeenCalledTimes(2);
    });

    it('should not route to inactive sites via slug', async () => {
      const { db } = mockDb(null, null, { id: 'slug-site', status: 'inactive' });

      const result = await resolveSiteIdForHostname(db, undefined, 'sdfg.localhost', 'localhost');
      expect(result).toBeNull();
    });
  });
});
