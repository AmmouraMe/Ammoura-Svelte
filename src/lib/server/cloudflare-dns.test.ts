import { describe, it, expect, vi } from 'vitest';
import {
  verifyCustomerToken,
  findCustomerZone,
  upsertDnsRecord,
  buildTokenCreateUrl
} from './cloudflare-dns';
import type { FetchLike } from './dns';

function ok(result: unknown) {
  return { ok: true, status: 200, json: async () => ({ success: true, result }) } as Response;
}

describe('cloudflare-dns', () => {
  describe('verifyCustomerToken', () => {
    it('should accept an active token', async () => {
      const fetchImpl = vi.fn(async () => ok({ status: 'active' }));
      expect(await verifyCustomerToken('tok', fetchImpl)).toBe(true);
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/user/tokens/verify');
      expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    });

    it('should reject inactive or erroring tokens', async () => {
      expect(
        await verifyCustomerToken(
          't',
          vi.fn(async () => ok({ status: 'disabled' }))
        )
      ).toBe(false);
      expect(
        await verifyCustomerToken(
          't',
          vi.fn(async () => {
            throw new Error('network');
          })
        )
      ).toBe(false);
    });
  });

  describe('findCustomerZone', () => {
    it('should walk labels until the token sees a zone', async () => {
      const fetchImpl: FetchLike = vi.fn(async (url: string) => {
        const name = new URL(url).searchParams.get('name');
        return ok(name === 'example.com' ? [{ id: 'zone-1', name: 'example.com' }] : []);
      });
      const zone = await findCustomerZone('tok', 'shop.deep.example.com', fetchImpl);
      expect(zone).toEqual({ id: 'zone-1', name: 'example.com' });
    });

    it('should return null when no zone is visible', async () => {
      const fetchImpl = vi.fn(async () => ok([]));
      expect(await findCustomerZone('tok', 'shop.example.com', fetchImpl)).toBeNull();
    });
  });

  describe('upsertDnsRecord', () => {
    function router(existing: unknown[], capture: { calls: Array<[string, RequestInit]> }) {
      return vi.fn(async (url: string, init?: RequestInit) => {
        capture.calls.push([url, init || {}]);
        if ((init?.method || 'GET') === 'GET') {
          return ok(existing);
        }
        return ok({ id: 'new' });
      }) as FetchLike;
    }

    it('should create a missing record with proxied=false for CNAMEs', async () => {
      const capture = { calls: [] as Array<[string, RequestInit]> };
      const outcome = await upsertDnsRecord(
        'tok',
        'zone-1',
        { type: 'CNAME', name: 'shop.example.com', content: 'connect.ammoura.me' },
        router([], capture)
      );
      expect(outcome).toBe('created');
      const post = capture.calls.find(([, i]) => i.method === 'POST');
      expect(post).toBeDefined();
      const body = JSON.parse(post![1].body as string);
      expect(body.proxied).toBe(false);
      expect(body.content).toBe('connect.ammoura.me');
    });

    it('should leave matching grey-cloud records unchanged', async () => {
      const capture = { calls: [] as Array<[string, RequestInit]> };
      const outcome = await upsertDnsRecord(
        'tok',
        'zone-1',
        { type: 'CNAME', name: 'shop.example.com', content: 'connect.ammoura.me' },
        router(
          [
            {
              id: 'r1',
              type: 'CNAME',
              name: 'shop.example.com',
              content: 'connect.ammoura.me',
              proxied: false
            }
          ],
          capture
        )
      );
      expect(outcome).toBe('unchanged');
      expect(capture.calls.some(([, i]) => i.method === 'PUT')).toBe(false);
    });

    it('should update records with wrong content or orange cloud', async () => {
      const capture = { calls: [] as Array<[string, RequestInit]> };
      const outcome = await upsertDnsRecord(
        'tok',
        'zone-1',
        { type: 'CNAME', name: 'shop.example.com', content: 'connect.ammoura.me' },
        router(
          [
            {
              id: 'r1',
              type: 'CNAME',
              name: 'shop.example.com',
              content: 'connect.ammoura.me',
              proxied: true
            }
          ],
          capture
        )
      );
      expect(outcome).toBe('updated');
      const put = capture.calls.find(([, i]) => i.method === 'PUT');
      expect(put![0]).toContain('/dns_records/r1');
    });
  });

  describe('buildTokenCreateUrl', () => {
    it('should prefill name and permission groups', () => {
      const url = new URL(buildTokenCreateUrl('example.com', 'shop.example.com'));
      expect(url.origin + url.pathname).toBe('https://dash.cloudflare.com/profile/api-tokens');
      expect(url.searchParams.get('name')).toContain('example.com');
      const permissions = JSON.parse(url.searchParams.get('permissionGroupKeys') || '[]');
      expect(permissions).toEqual([
        { key: 'zone', type: 'read' },
        { key: 'dns', type: 'edit' }
      ]);
    });
  });
});
