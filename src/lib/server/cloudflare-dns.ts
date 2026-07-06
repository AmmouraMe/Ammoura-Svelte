/**
 * Cloudflare DNS operations against a CUSTOMER's zone, authorized by a scoped
 * API token the customer creates and pastes in (tenancy plan §4.2).
 *
 * The token is used for the duration of one connect operation and never
 * persisted or logged. Required scopes: Zone → Zone → Read, Zone → DNS → Edit,
 * ideally limited to the single zone.
 */

import type { FetchLike } from './dns.js';

const API_BASE = 'https://api.cloudflare.com/client/v4';

interface CfEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code: number; message: string }>;
}

async function customerRequest<T>(
  token: string,
  method: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike
): Promise<T> {
  const response = await fetchImpl(`${API_BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = (await response.json()) as CfEnvelope<T>;
  if (!response.ok || !data.success) {
    const message = data.errors?.map((e) => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data.result;
}

export async function verifyCustomerToken(
  token: string,
  fetchImpl: FetchLike = fetch
): Promise<boolean> {
  try {
    const result = await customerRequest<{ status: string }>(
      token,
      'GET',
      '/user/tokens/verify',
      undefined,
      fetchImpl
    );
    return result.status === 'active';
  } catch {
    return false;
  }
}

export interface CustomerZone {
  id: string;
  name: string;
}

/**
 * Find the customer's zone for a hostname by walking labels up
 * (shop.example.com → example.com) until the token can see a zone.
 */
export async function findCustomerZone(
  token: string,
  hostname: string,
  fetchImpl: FetchLike = fetch
): Promise<CustomerZone | null> {
  const labels = hostname.toLowerCase().split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    const zones = await customerRequest<CustomerZone[]>(
      token,
      'GET',
      `/zones?name=${encodeURIComponent(candidate)}`,
      undefined,
      fetchImpl
    );
    if (zones.length > 0) {
      return { id: zones[0].id, name: zones[0].name };
    }
  }
  return null;
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
}

export interface DesiredRecord {
  type: 'CNAME' | 'TXT';
  name: string;
  content: string;
}

export type UpsertOutcome = 'created' | 'updated' | 'unchanged';

/**
 * Create or update one DNS record in the customer zone. CNAMEs are always
 * written DNS-only (grey cloud) so traffic routes straight to the platform by
 * custom hostname instead of through the customer's own proxy config (O2O).
 */
export async function upsertDnsRecord(
  token: string,
  zoneId: string,
  desired: DesiredRecord,
  fetchImpl: FetchLike = fetch
): Promise<UpsertOutcome> {
  const existing = await customerRequest<DnsRecord[]>(
    token,
    'GET',
    `/zones/${zoneId}/dns_records?type=${desired.type}&name=${encodeURIComponent(desired.name)}`,
    undefined,
    fetchImpl
  );

  const payload = {
    type: desired.type,
    name: desired.name,
    content: desired.content,
    ttl: 1, // automatic
    ...(desired.type === 'CNAME' ? { proxied: false } : {})
  };

  const match = existing.find((r) => r.name.toLowerCase() === desired.name.toLowerCase());
  if (!match) {
    await customerRequest<DnsRecord>(
      token,
      'POST',
      `/zones/${zoneId}/dns_records`,
      payload,
      fetchImpl
    );
    return 'created';
  }

  const contentMatches =
    match.content.replace(/^"|"$/g, '') === desired.content.replace(/^"|"$/g, '');
  if (contentMatches && (desired.type !== 'CNAME' || match.proxied === false)) {
    return 'unchanged';
  }

  await customerRequest<DnsRecord>(
    token,
    'PUT',
    `/zones/${zoneId}/dns_records/${match.id}`,
    payload,
    fetchImpl
  );
  return 'updated';
}

/**
 * Prefilled Cloudflare dashboard URL for creating the scoped token
 * (documented template-URL feature). The user still reviews and clicks
 * Create in their own dashboard; we never see their password.
 */
export function buildTokenCreateUrl(zoneName: string | null, hostname: string): string {
  const permissions = JSON.stringify([
    { key: 'zone', type: 'read' },
    { key: 'dns', type: 'edit' }
  ]);
  const name = `Ammoura DNS — ${zoneName || hostname}`;
  const params = new URLSearchParams({
    permissionGroupKeys: permissions,
    zoneId: 'all',
    name
  });
  return `https://dash.cloudflare.com/profile/api-tokens?${params.toString()}`;
}
