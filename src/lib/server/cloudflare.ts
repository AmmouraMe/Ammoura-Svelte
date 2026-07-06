/**
 * Minimal Cloudflare API client for Cloudflare for SaaS custom hostnames
 * (tenancy plan §4). Credentials come from Worker secrets:
 *   CLOUDFLARE_API_TOKEN — scoped token with SSL and Certificates: Edit on the zone
 *   CLOUDFLARE_ZONE_ID   — the ammoura.me zone id
 * When credentials are absent (local dev), the domains service still records
 * domains and shows DNS instructions; provisioning just doesn't happen.
 */

import type { FetchLike } from './dns.js';

const API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
}

export function getCloudflareConfig(
  env: Record<string, unknown> | undefined
): CloudflareConfig | null {
  const apiToken = env?.CLOUDFLARE_API_TOKEN as string | undefined;
  const zoneId = env?.CLOUDFLARE_ZONE_ID as string | undefined;
  if (!apiToken || !zoneId) {
    return null;
  }
  return { apiToken, zoneId };
}

export interface ValidationRecord {
  txt_name?: string;
  txt_value?: string;
  http_url?: string;
  http_body?: string;
}

export interface CustomHostname {
  id: string;
  hostname: string;
  status: string; // pending | active | moved | deleted | blocked ...
  ownership_verification?: { type: string; name: string; value: string };
  ssl?: {
    status: string; // initializing | pending_validation | pending_issuance | active ...
    validation_records?: ValidationRecord[];
  };
  verification_errors?: string[];
}

interface CfEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code: number; message: string }>;
}

async function cfRequest<T>(
  config: CloudflareConfig,
  method: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike
): Promise<T> {
  const response = await fetchImpl(`${API_BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${config.apiToken}`,
      'content-type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = (await response.json()) as CfEnvelope<T>;
  if (!response.ok || !data.success) {
    const message = data.errors?.map((e) => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API error: ${message}`);
  }
  return data.result;
}

export async function createCustomHostname(
  config: CloudflareConfig,
  hostname: string,
  fetchImpl: FetchLike = fetch
): Promise<CustomHostname> {
  return await cfRequest<CustomHostname>(
    config,
    'POST',
    `/zones/${config.zoneId}/custom_hostnames`,
    { hostname, ssl: { method: 'http', type: 'dv' } },
    fetchImpl
  );
}

export async function getCustomHostname(
  config: CloudflareConfig,
  customHostnameId: string,
  fetchImpl: FetchLike = fetch
): Promise<CustomHostname> {
  return await cfRequest<CustomHostname>(
    config,
    'GET',
    `/zones/${config.zoneId}/custom_hostnames/${customHostnameId}`,
    undefined,
    fetchImpl
  );
}

export async function deleteCustomHostname(
  config: CloudflareConfig,
  customHostnameId: string,
  fetchImpl: FetchLike = fetch
): Promise<void> {
  await cfRequest<unknown>(
    config,
    'DELETE',
    `/zones/${config.zoneId}/custom_hostnames/${customHostnameId}`,
    undefined,
    fetchImpl
  );
}

/**
 * Map a Cloudflare custom hostname payload to our site_domains status machine.
 */
export function mapCustomHostnameStatus(
  ch: CustomHostname
): 'pending_dns' | 'pending_validation' | 'active' | 'error' {
  if (ch.status === 'active' && (!ch.ssl || ch.ssl.status === 'active')) {
    return 'active';
  }
  if (ch.status === 'blocked' || ch.status === 'moved' || ch.status === 'deleted') {
    return 'error';
  }
  if (
    ch.status === 'active' ||
    ch.ssl?.status === 'pending_validation' ||
    ch.ssl?.status === 'pending_issuance' ||
    ch.ssl?.status === 'pending_deployment'
  ) {
    return 'pending_validation';
  }
  return 'pending_dns';
}
