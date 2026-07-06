import { describe, it, expect, vi } from 'vitest';
import {
  lookupNameservers,
  isCloudflareNameserver,
  usesCloudflareDns,
  type FetchLike
} from './dns';

function dnsJson(answers: Array<{ name: string; type: number; data: string }>, status = 0) {
  return {
    ok: true,
    json: async () => ({ Status: status, Answer: answers.length ? answers : undefined })
  } as Response;
}

function mockFetchByName(zones: Record<string, string[]>): FetchLike {
  return vi.fn(async (input: string) => {
    const url = new URL(input);
    const name = url.searchParams.get('name') || '';
    const ns = zones[name];
    if (!ns) {
      return dnsJson([], 3); // NXDOMAIN / no answer
    }
    return dnsJson(ns.map((data) => ({ name, type: 2, data })));
  });
}

describe('dns', () => {
  describe('isCloudflareNameserver', () => {
    it('should match Cloudflare nameservers case-insensitively', () => {
      expect(isCloudflareNameserver('gail.ns.cloudflare.com')).toBe(true);
      expect(isCloudflareNameserver('Kip.NS.Cloudflare.COM.')).toBe(true);
    });

    it('should reject other providers and lookalikes', () => {
      expect(isCloudflareNameserver('ns1.godaddy.com')).toBe(false);
      expect(isCloudflareNameserver('evil-ns.cloudflare.com.attacker.net')).toBe(false);
    });
  });

  describe('lookupNameservers', () => {
    it('should find NS records at the hostname itself', async () => {
      const fetchImpl = mockFetchByName({
        'example.com': ['gail.ns.cloudflare.com.', 'kip.ns.cloudflare.com.']
      });
      const result = await lookupNameservers('example.com', fetchImpl);
      expect(result?.zone).toBe('example.com');
      expect(result?.nameservers).toEqual(['gail.ns.cloudflare.com', 'kip.ns.cloudflare.com']);
    });

    it('should walk up from a subdomain to the registrable domain', async () => {
      const fetchImpl = mockFetchByName({
        'example.com': ['ns1.dnsimple.com']
      });
      const result = await lookupNameservers('shop.deep.example.com', fetchImpl);
      expect(result?.zone).toBe('example.com');
      expect(result?.nameservers).toEqual(['ns1.dnsimple.com']);
    });

    it('should return null when nothing answers', async () => {
      const fetchImpl = mockFetchByName({});
      expect(await lookupNameservers('nope.invalid', fetchImpl)).toBeNull();
    });

    it('should never query the bare TLD', async () => {
      const fetchImpl = mockFetchByName({});
      await lookupNameservers('shop.example.com', fetchImpl);
      const queried = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
        new URL(call[0] as string).searchParams.get('name')
      );
      expect(queried).toEqual(['shop.example.com', 'example.com']);
    });
  });

  describe('usesCloudflareDns', () => {
    it('should detect a Cloudflare-hosted zone', async () => {
      const fetchImpl = mockFetchByName({
        'example.com': ['gail.ns.cloudflare.com', 'kip.ns.cloudflare.com']
      });
      expect(await usesCloudflareDns('shop.example.com', fetchImpl)).toEqual({
        cloudflare: true,
        zone: 'example.com'
      });
    });

    it('should report non-Cloudflare zones with the zone name', async () => {
      const fetchImpl = mockFetchByName({ 'example.com': ['ns1.godaddy.com'] });
      expect(await usesCloudflareDns('example.com', fetchImpl)).toEqual({
        cloudflare: false,
        zone: 'example.com'
      });
    });

    it('should require ALL nameservers to be Cloudflare', async () => {
      const fetchImpl = mockFetchByName({
        'example.com': ['gail.ns.cloudflare.com', 'ns1.godaddy.com']
      });
      const result = await usesCloudflareDns('example.com', fetchImpl);
      expect(result.cloudflare).toBe(false);
    });

    it('should handle unresolvable hostnames', async () => {
      const fetchImpl = mockFetchByName({});
      expect(await usesCloudflareDns('nope.invalid', fetchImpl)).toEqual({
        cloudflare: false,
        zone: null
      });
    });
  });
});
