import { describe, it, expect, vi } from 'vitest';
import { connectDomainViaCloudflare } from './assisted-dns-service';
import type { FetchLike } from './dns';

const DOMAIN_ROW = {
  id: 'dom-1',
  site_id: 'site-1',
  hostname: 'shop.example.com',
  kind: 'custom',
  is_primary: 0,
  status: 'pending_dns',
  cf_custom_hostname_id: null,
  verification: null,
  created_at: 1,
  updated_at: 1
};

function mockDb(domainRow: unknown = DOMAIN_ROW) {
  const mockFirst = vi.fn().mockResolvedValue(domainRow);
  const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
  const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
  const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
  return { prepare: mockPrepare } as unknown as D1Database;
}

/** Routes Cloudflare API calls made with the customer token. */
function cfRouter(opts: { tokenActive?: boolean; zones?: unknown[] }) {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetchImpl: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || 'GET';
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(init.body as string) : undefined
    });
    const respond = (result: unknown) =>
      ({ ok: true, status: 200, json: async () => ({ success: true, result }) }) as Response;

    if (url.includes('/user/tokens/verify')) {
      return respond({ status: opts.tokenActive === false ? 'disabled' : 'active' });
    }
    if (url.includes('/zones?name=')) {
      const name = new URL(url).searchParams.get('name');
      return respond(
        name === 'example.com' ? (opts.zones ?? [{ id: 'z1', name: 'example.com' }]) : []
      );
    }
    if (url.includes('/dns_records')) {
      return method === 'GET' ? respond([]) : respond({ id: 'rec-1' });
    }
    throw new Error('unexpected url: ' + url);
  });
  return { fetchImpl, calls };
}

describe('assisted-dns-service', () => {
  it('should reject an empty token without any API calls', async () => {
    const { fetchImpl, calls } = cfRouter({});
    const result = await connectDomainViaCloudflare(
      mockDb(),
      undefined,
      {},
      'dom-1',
      '  ',
      fetchImpl
    );
    expect(result.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('should reject an invalid token', async () => {
    const { fetchImpl } = cfRouter({ tokenActive: false });
    const result = await connectDomainViaCloudflare(
      mockDb(),
      undefined,
      {},
      'dom-1',
      'bad-token',
      fetchImpl
    );
    expect(result.error).toContain('token is not valid');
  });

  it('should error when the token cannot see the zone', async () => {
    const { fetchImpl } = cfRouter({ zones: [] });
    const result = await connectDomainViaCloudflare(
      mockDb(),
      undefined,
      {},
      'dom-1',
      'tok',
      fetchImpl
    );
    expect(result.error).toContain('cannot see a zone');
  });

  it('should create the CNAME grey-clouded and report outcomes on success', async () => {
    const { fetchImpl, calls } = cfRouter({});
    const result = await connectDomainViaCloudflare(
      mockDb(),
      undefined,
      { PLATFORM_SITES_DOMAIN: 'ammoura.me' },
      'dom-1',
      'tok',
      fetchImpl
    );

    expect(result.error).toBeUndefined();
    expect(result.zone).toBe('example.com');
    expect(result.outcomes).toEqual([
      {
        record: { type: 'CNAME', name: 'shop.example.com', content: 'connect.ammoura.me' },
        outcome: 'created'
      }
    ]);

    const post = calls.find((c) => c.method === 'POST' && c.url.includes('/dns_records'));
    expect(post?.body).toMatchObject({
      type: 'CNAME',
      name: 'shop.example.com',
      content: 'connect.ammoura.me',
      proxied: false
    });
  });

  it('should refuse platform domains and missing rows', async () => {
    const { fetchImpl } = cfRouter({});
    const platformRow = { ...DOMAIN_ROW, kind: 'platform' };
    expect(
      (
        await connectDomainViaCloudflare(
          mockDb(platformRow),
          undefined,
          {},
          'dom-1',
          't',
          fetchImpl
        )
      ).error
    ).toContain('not found');
    expect(
      (await connectDomainViaCloudflare(mockDb(null), undefined, {}, 'dom-1', 't', fetchImpl)).error
    ).toContain('not found');
  });
});
