/**
 * Custom domain lifecycle for sites (tenancy plan §4): attach a customer-owned
 * hostname, provision it through Cloudflare for SaaS when credentials are
 * configured, surface the DNS records the customer must create, poll status,
 * and detach cleanly.
 */

import {
  addSiteDomain,
  getSiteDomainById,
  getSiteDomainByHostname,
  getDomainsForSite,
  updateSiteDomainStatus,
  normalizeHostname,
  type SiteDomain
} from './db/site-domains.js';
import {
  createCustomHostname,
  getCustomHostname,
  deleteCustomHostname,
  mapCustomHostnameStatus,
  getCloudflareConfig,
  type CustomHostname
} from './cloudflare.js';
import { usesCloudflareDns } from './dns.js';
import { purgeRouteCache } from './site-routing.js';
import type { FetchLike } from './dns.js';

const HOSTNAME_PATTERN =
  /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/;

export interface DnsInstruction {
  type: 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: string;
}

export interface AddDomainResult {
  domain?: SiteDomain;
  instructions?: DnsInstruction[];
  dnsProvider?: { cloudflare: boolean; zone: string | null };
  error?: string;
}

/**
 * The CNAME target customers point their hostname at (the Cloudflare for
 * SaaS fallback origin).
 */
export function getConnectTarget(env: Record<string, unknown> | undefined): string {
  const platformDomain = (env?.PLATFORM_SITES_DOMAIN as string) || 'localhost';
  return `connect.${platformDomain}`;
}

export function validateCustomHostname(
  hostname: string,
  platformSitesDomain: string
): string | null {
  if (!hostname) {
    return 'Domain is required';
  }
  if (!HOSTNAME_PATTERN.test(hostname)) {
    return 'Enter a valid domain like example.com or shop.example.com';
  }
  if (hostname === platformSitesDomain || hostname.endsWith(`.${platformSitesDomain}`)) {
    return 'This domain is provided by the platform and cannot be added as a custom domain';
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return 'This domain cannot be added';
  }
  return null;
}

export function buildInstructions(
  hostname: string,
  connectTarget: string,
  customHostname?: CustomHostname
): DnsInstruction[] {
  const instructions: DnsInstruction[] = [
    {
      type: 'CNAME',
      name: hostname,
      value: connectTarget,
      purpose: 'Points your domain at the platform'
    }
  ];

  if (customHostname?.ownership_verification) {
    instructions.push({
      type: 'TXT',
      name: customHostname.ownership_verification.name,
      value: customHostname.ownership_verification.value,
      purpose: 'Proves you own the domain'
    });
  }

  for (const record of customHostname?.ssl?.validation_records || []) {
    if (record.txt_name && record.txt_value) {
      instructions.push({
        type: 'TXT',
        name: record.txt_name,
        value: record.txt_value,
        purpose: 'Certificate validation'
      });
    }
  }

  return instructions;
}

export async function addCustomDomain(
  db: D1Database,
  kv: KVNamespace | undefined,
  env: Record<string, unknown> | undefined,
  siteId: string,
  rawHostname: string,
  fetchImpl: FetchLike = fetch
): Promise<AddDomainResult> {
  const hostname = normalizeHostname(rawHostname);
  const platformSitesDomain = (env?.PLATFORM_SITES_DOMAIN as string) || 'localhost';

  const validationError = validateCustomHostname(hostname, platformSitesDomain);
  if (validationError) {
    return { error: validationError };
  }

  const existing = await getSiteDomainByHostname(db, hostname);
  if (existing) {
    return {
      error:
        existing.site_id === siteId
          ? 'This domain is already attached to this site'
          : 'This domain is already in use on the platform'
    };
  }

  // Provision through Cloudflare for SaaS when credentials are configured
  const cfConfig = getCloudflareConfig(env);
  let customHostname: CustomHostname | undefined;
  if (cfConfig) {
    try {
      customHostname = await createCustomHostname(cfConfig, hostname, fetchImpl);
    } catch (error) {
      console.error('Custom hostname creation failed:', error);
      return { error: 'Could not start domain provisioning. Please try again.' };
    }
  }

  const domain = await addSiteDomain(db, {
    site_id: siteId,
    hostname,
    kind: 'custom',
    status: customHostname ? mapCustomHostnameStatus(customHostname) : 'pending_dns',
    cf_custom_hostname_id: customHostname?.id,
    verification: customHostname ? { cloudflare: customHostname } : undefined
  });

  // Clear any cached negative lookup from visits before the domain existed
  await purgeRouteCache(kv, hostname);

  // Detect whether their DNS is on Cloudflare so the UI can offer the
  // assisted flow. Best-effort: a DoH failure must not fail the add.
  let dnsProvider: AddDomainResult['dnsProvider'];
  try {
    dnsProvider = await usesCloudflareDns(hostname, fetchImpl);
  } catch {
    dnsProvider = undefined;
  }

  return {
    domain,
    instructions: buildInstructions(hostname, getConnectTarget(env), customHostname),
    dnsProvider
  };
}

export interface RefreshResult {
  domain?: SiteDomain;
  instructions?: DnsInstruction[];
  error?: string;
}

export async function refreshDomainStatus(
  db: D1Database,
  kv: KVNamespace | undefined,
  env: Record<string, unknown> | undefined,
  domainId: string,
  fetchImpl: FetchLike = fetch
): Promise<RefreshResult> {
  const domain = await getSiteDomainById(db, domainId);
  if (!domain || domain.status === 'removed') {
    return { error: 'Domain not found' };
  }

  const cfConfig = getCloudflareConfig(env);
  if (!cfConfig || !domain.cf_custom_hostname_id) {
    // Nothing to poll; return current state with instructions
    return {
      domain,
      instructions: buildInstructions(domain.hostname, getConnectTarget(env))
    };
  }

  let customHostname: CustomHostname;
  try {
    customHostname = await getCustomHostname(cfConfig, domain.cf_custom_hostname_id, fetchImpl);
  } catch (error) {
    console.error('Custom hostname status check failed:', error);
    return { error: 'Could not check domain status. Please try again.' };
  }

  const newStatus = mapCustomHostnameStatus(customHostname);
  if (newStatus !== domain.status) {
    await updateSiteDomainStatus(db, domain.id, newStatus, { cloudflare: customHostname });
    await purgeRouteCache(kv, domain.hostname);
  }

  const updated = await getSiteDomainById(db, domainId);
  return {
    domain: updated || domain,
    instructions: buildInstructions(domain.hostname, getConnectTarget(env), customHostname)
  };
}

export async function removeCustomDomain(
  db: D1Database,
  kv: KVNamespace | undefined,
  env: Record<string, unknown> | undefined,
  domainId: string,
  fetchImpl: FetchLike = fetch
): Promise<{ success: boolean; error?: string }> {
  const domain = await getSiteDomainById(db, domainId);
  if (!domain || domain.status === 'removed') {
    return { success: false, error: 'Domain not found' };
  }
  if (domain.kind === 'platform') {
    return { success: false, error: 'The platform subdomain cannot be removed' };
  }

  const cfConfig = getCloudflareConfig(env);
  if (cfConfig && domain.cf_custom_hostname_id) {
    try {
      await deleteCustomHostname(cfConfig, domain.cf_custom_hostname_id, fetchImpl);
    } catch (error) {
      // Log but continue: the local record must not stay routable because a
      // remote cleanup call failed; a later sweep can reconcile.
      console.error('Custom hostname deletion failed:', error);
    }
  }

  const { removeSiteDomain } = await import('./db/site-domains.js');
  await removeSiteDomain(db, domainId);
  await purgeRouteCache(kv, domain.hostname);

  return { success: true };
}

export async function listDomainsForSite(db: D1Database, siteId: string): Promise<SiteDomain[]> {
  return await getDomainsForSite(db, siteId);
}
