/**
 * Tests for site provisioning.
 *
 * The case that matters here is issue #72: the default footer links to
 * /privacy-policy and /terms-of-service, so a store that is created without
 * those pages ships two dead links from its first minute.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

vi.mock('./db/sites.js', () => ({
  createSite: vi.fn().mockResolvedValue({ id: 'site-new', name: 'Test Store' })
}));
vi.mock('./db/connection.js', () => ({
  executeOne: vi.fn().mockResolvedValue(null)
}));
vi.mock('./db/site-members.js', () => ({ addSiteMember: vi.fn() }));
vi.mock('./db/site-domains.js', () => ({ addSiteDomain: vi.fn() }));
vi.mock('./db/site-settings.js', () => ({ upsertSiteSetting: vi.fn() }));
vi.mock('./db/pages.js', () => ({
  createPage: vi.fn().mockResolvedValue({ id: 'home-page-id' })
}));
vi.mock('./db/revisions.js', () => ({ createRevision: vi.fn() }));
vi.mock('./site-routing.js', () => ({ purgeRouteCache: vi.fn() }));
vi.mock('./db/builtin-seeding.js', () => ({
  seedBuiltinPage: vi.fn().mockResolvedValue({ action: 'created' }),
  CURRENT_BUILTIN_VERSION: 3
}));

import { createSiteForAccount } from './sites-service';
import { seedBuiltinPage } from './db/builtin-seeding.js';
import { LEGAL_BUILTIN_PAGE_SLUGS } from '$lib/utils/editor/pageDefaults';

// createSiteForAccount writes the slug back with a direct prepare().
const mockDb = {
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({}),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] })
  })
} as unknown as D1Database;

describe('createSiteForAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(seedBuiltinPage).mockResolvedValue({
      action: 'created'
    } as Awaited<ReturnType<typeof seedBuiltinPage>>);
  });

  it('seeds the built-in legal pages so the default footer has no dead links', async () => {
    await createSiteForAccount(
      mockDb,
      undefined,
      'account-1',
      'Test Store',
      'test-store',
      'ammoura.me'
    );

    const seededSlugs = vi
      .mocked(seedBuiltinPage)
      .mock.calls.map(([, , definition]) => definition.slug);

    for (const slug of LEGAL_BUILTIN_PAGE_SLUGS) {
      expect(seededSlugs).toContain(slug);
    }
  });

  it('seeds the legal pages against the new site id', async () => {
    await createSiteForAccount(
      mockDb,
      undefined,
      'account-1',
      'Test Store',
      'test-store',
      'ammoura.me'
    );

    for (const [, siteId] of vi.mocked(seedBuiltinPage).mock.calls) {
      expect(siteId).toBe('site-new');
    }
  });

  it('still creates the site when a legal page cannot be seeded', async () => {
    vi.mocked(seedBuiltinPage).mockRejectedValue(new Error('D1 unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createSiteForAccount(
      mockDb,
      undefined,
      'account-1',
      'Test Store',
      'test-store',
      'ammoura.me'
    );

    expect(result.error).toBeUndefined();
    expect(result.site?.id).toBe('site-new');
  });
});
