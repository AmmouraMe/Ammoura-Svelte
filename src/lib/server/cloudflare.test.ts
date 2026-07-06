import { describe, it, expect, vi } from 'vitest';
import {
  getCloudflareConfig,
  createCustomHostname,
  deleteCustomHostname,
  mapCustomHostnameStatus,
  type CustomHostname
} from './cloudflare';

function cfResponse(result: unknown, success = true, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => ({ success, result, errors: success ? [] : [{ code: 1, message: 'boom' }] })
  } as Response;
}

describe('cloudflare', () => {
  describe('getCloudflareConfig', () => {
    it('should return null unless both token and zone are set', () => {
      expect(getCloudflareConfig(undefined)).toBeNull();
      expect(getCloudflareConfig({ CLOUDFLARE_API_TOKEN: 't' })).toBeNull();
      expect(getCloudflareConfig({ CLOUDFLARE_ZONE_ID: 'z' })).toBeNull();
      expect(getCloudflareConfig({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: 'z' })).toEqual({
        apiToken: 't',
        zoneId: 'z'
      });
    });
  });

  describe('createCustomHostname', () => {
    it('should POST to the zone custom_hostnames endpoint with http ssl validation', async () => {
      const fetchImpl = vi.fn(async () =>
        cfResponse({ id: 'ch-1', hostname: 'a.com', status: 'pending' })
      );
      const result = await createCustomHostname(
        { apiToken: 'tok', zoneId: 'zone-1' },
        'a.com',
        fetchImpl
      );
      expect(result.id).toBe('ch-1');

      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.cloudflare.com/client/v4/zones/zone-1/custom_hostnames');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
      expect(JSON.parse(init.body as string)).toEqual({
        hostname: 'a.com',
        ssl: { method: 'http', type: 'dv' }
      });
    });

    it('should throw with the API error message on failure', async () => {
      const fetchImpl = vi.fn(async () => cfResponse(null, false, 400));
      await expect(
        createCustomHostname({ apiToken: 't', zoneId: 'z' }, 'a.com', fetchImpl)
      ).rejects.toThrow(/boom/);
    });
  });

  describe('deleteCustomHostname', () => {
    it('should DELETE the custom hostname by id', async () => {
      const fetchImpl = vi.fn(async () => cfResponse({ id: 'ch-1' }));
      await deleteCustomHostname({ apiToken: 't', zoneId: 'z' }, 'ch-1', fetchImpl);
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/zones/z/custom_hostnames/ch-1');
      expect(init.method).toBe('DELETE');
    });
  });

  describe('mapCustomHostnameStatus', () => {
    const base = { id: 'x', hostname: 'a.com' };

    it('should be active only when hostname and ssl are both active', () => {
      expect(
        mapCustomHostnameStatus({ ...base, status: 'active', ssl: { status: 'active' } })
      ).toBe('active');
      expect(mapCustomHostnameStatus({ ...base, status: 'active' } as CustomHostname)).toBe(
        'active'
      );
    });

    it('should be pending_validation while certs are issuing', () => {
      expect(
        mapCustomHostnameStatus({
          ...base,
          status: 'pending',
          ssl: { status: 'pending_validation' }
        })
      ).toBe('pending_validation');
      expect(
        mapCustomHostnameStatus({ ...base, status: 'active', ssl: { status: 'pending_issuance' } })
      ).toBe('pending_validation');
    });

    it('should be pending_dns before anything verifies', () => {
      expect(
        mapCustomHostnameStatus({ ...base, status: 'pending', ssl: { status: 'initializing' } })
      ).toBe('pending_dns');
    });

    it('should map terminal Cloudflare states to error', () => {
      expect(mapCustomHostnameStatus({ ...base, status: 'blocked' } as CustomHostname)).toBe(
        'error'
      );
      expect(mapCustomHostnameStatus({ ...base, status: 'moved' } as CustomHostname)).toBe('error');
    });
  });
});
