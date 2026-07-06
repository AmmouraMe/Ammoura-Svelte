import { describe, it, expect, vi } from 'vitest';
import {
  validateCustomHostname,
  buildInstructions,
  getConnectTarget,
  addCustomDomain
} from './domains-service';
import type { CustomHostname } from './cloudflare';

describe('domains-service', () => {
  describe('validateCustomHostname', () => {
    it('should accept normal domains and subdomains', () => {
      expect(validateCustomHostname('example.com', 'ammoura.me')).toBeNull();
      expect(validateCustomHostname('shop.example.co.uk', 'ammoura.me')).toBeNull();
    });

    it('should reject invalid hostnames', () => {
      expect(validateCustomHostname('', 'ammoura.me')).toBeTruthy();
      expect(validateCustomHostname('not a domain', 'ammoura.me')).toBeTruthy();
      expect(validateCustomHostname('nodots', 'ammoura.me')).toBeTruthy();
      expect(validateCustomHostname('-bad.example.com', 'ammoura.me')).toBeTruthy();
    });

    it('should reject the platform domain and its subdomains', () => {
      expect(validateCustomHostname('ammoura.me', 'ammoura.me')).toBeTruthy();
      expect(validateCustomHostname('cool.ammoura.me', 'ammoura.me')).toBeTruthy();
    });

    it('should reject localhost', () => {
      expect(validateCustomHostname('foo.localhost', 'ammoura.me')).toBeTruthy();
    });
  });

  describe('getConnectTarget', () => {
    it('should build the fallback origin from the platform domain', () => {
      expect(getConnectTarget({ PLATFORM_SITES_DOMAIN: 'ammoura.me' })).toBe('connect.ammoura.me');
      expect(getConnectTarget(undefined)).toBe('connect.localhost');
    });
  });

  describe('buildInstructions', () => {
    it('should always include the CNAME', () => {
      const instructions = buildInstructions('shop.example.com', 'connect.ammoura.me');
      expect(instructions).toHaveLength(1);
      expect(instructions[0]).toMatchObject({
        type: 'CNAME',
        name: 'shop.example.com',
        value: 'connect.ammoura.me'
      });
    });

    it('should include ownership and cert validation TXT records when present', () => {
      const ch: CustomHostname = {
        id: 'ch-1',
        hostname: 'shop.example.com',
        status: 'pending',
        ownership_verification: {
          type: 'txt',
          name: '_cf-custom-hostname.shop.example.com',
          value: 'token-1'
        },
        ssl: {
          status: 'pending_validation',
          validation_records: [{ txt_name: '_acme-challenge.shop.example.com', txt_value: 'v1' }]
        }
      };
      const instructions = buildInstructions('shop.example.com', 'connect.ammoura.me', ch);
      expect(instructions).toHaveLength(3);
      expect(instructions[1].type).toBe('TXT');
      expect(instructions[1].name).toBe('_cf-custom-hostname.shop.example.com');
      expect(instructions[2].name).toBe('_acme-challenge.shop.example.com');
    });
  });

  describe('addCustomDomain', () => {
    function mockDb(existingByHostname: unknown) {
      // first() call order in addCustomDomain:
      //   1. getSiteDomainByHostname
      //   2. getSiteDomainById after insert (returns the created row)
      const created = {
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
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(existingByHostname)
        .mockResolvedValue(created);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      return { db: { prepare: mockPrepare } as unknown as D1Database, created };
    }

    const noDns = vi.fn(async () => ({ ok: true, json: async () => ({ Status: 3 }) }) as Response);

    it('should reject a hostname already attached elsewhere', async () => {
      const { db } = mockDb({ site_id: 'other-site' });
      const result = await addCustomDomain(db, undefined, {}, 'site-1', 'shop.example.com', noDns);
      expect(result.error).toContain('already in use');
    });

    it('should create a pending domain with instructions when no CF credentials', async () => {
      const { db, created } = mockDb(null);
      const result = await addCustomDomain(
        db,
        undefined,
        { PLATFORM_SITES_DOMAIN: 'ammoura.me' },
        'site-1',
        'Shop.Example.COM',
        noDns
      );
      expect(result.error).toBeUndefined();
      expect(result.domain).toEqual(created);
      expect(result.instructions?.[0]).toMatchObject({
        type: 'CNAME',
        name: 'shop.example.com',
        value: 'connect.ammoura.me'
      });
    });

    it('should surface Cloudflare-hosted DNS in the result', async () => {
      const { db } = mockDb(null);
      const dohFetch = vi.fn(async (url: string) => {
        if (url.includes('cloudflare-dns.com')) {
          return {
            ok: true,
            json: async () => ({
              Status: 0,
              Answer: [{ name: 'example.com', type: 2, data: 'gail.ns.cloudflare.com.' }]
            })
          } as Response;
        }
        throw new Error('unexpected fetch: ' + url);
      });
      const result = await addCustomDomain(
        db,
        undefined,
        { PLATFORM_SITES_DOMAIN: 'ammoura.me' },
        'site-1',
        'shop.example.com',
        dohFetch
      );
      expect(result.dnsProvider?.cloudflare).toBe(true);
    });
  });
});
