/**
 * Assisted custom-domain connection for domains whose DNS is on Cloudflare
 * (tenancy plan §4.2): with a customer-supplied scoped token, create the
 * required DNS records in their zone, then re-check provisioning status.
 *
 * The token lives only in this request. It is never stored, and never logged.
 */

import { getSiteDomainById } from './db/site-domains.js';
import {
  verifyCustomerToken,
  findCustomerZone,
  upsertDnsRecord,
  type DesiredRecord,
  type UpsertOutcome
} from './cloudflare-dns.js';
import { buildInstructions, getConnectTarget, refreshDomainStatus } from './domains-service.js';
import type { CustomHostname } from './cloudflare.js';
import type { FetchLike } from './dns.js';
import type { SiteDomain } from './db/site-domains.js';

export interface ConnectResult {
  outcomes?: Array<{ record: DesiredRecord; outcome: UpsertOutcome }>;
  domain?: SiteDomain;
  zone?: string;
  error?: string;
}

function desiredRecordsFor(domain: SiteDomain, connectTarget: string): DesiredRecord[] {
  let customHostname: CustomHostname | undefined;
  if (domain.verification) {
    try {
      customHostname = (JSON.parse(domain.verification) as { cloudflare?: CustomHostname })
        .cloudflare;
    } catch {
      customHostname = undefined;
    }
  }

  return buildInstructions(domain.hostname, connectTarget, customHostname).map((i) => ({
    type: i.type,
    name: i.name,
    content: i.value
  }));
}

export async function connectDomainViaCloudflare(
  db: D1Database,
  kv: KVNamespace | undefined,
  env: Record<string, unknown> | undefined,
  domainId: string,
  customerToken: string,
  fetchImpl: FetchLike = fetch
): Promise<ConnectResult> {
  const token = customerToken.trim();
  if (!token) {
    return { error: 'Paste the API token from your Cloudflare dashboard' };
  }

  const domain = await getSiteDomainById(db, domainId);
  if (!domain || domain.status === 'removed' || domain.kind !== 'custom') {
    return { error: 'Domain not found' };
  }

  if (!(await verifyCustomerToken(token, fetchImpl))) {
    return { error: 'That token is not valid. Create a new one and try again.' };
  }

  const zone = await findCustomerZone(token, domain.hostname, fetchImpl);
  if (!zone) {
    return {
      error:
        'The token cannot see a zone for this domain. Make sure it is scoped to the right zone.'
    };
  }

  const records = desiredRecordsFor(domain, getConnectTarget(env));
  const outcomes: ConnectResult['outcomes'] = [];
  for (const record of records) {
    try {
      const outcome = await upsertDnsRecord(token, zone.id, record, fetchImpl);
      outcomes.push({ record, outcome });
    } catch (error) {
      return {
        outcomes,
        error: `Could not write the ${record.type} record for ${record.name}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      };
    }
  }

  // Records are in place — ask Cloudflare to re-check provisioning
  const refreshed = await refreshDomainStatus(db, kv, env, domainId, fetchImpl);

  return {
    outcomes,
    domain: refreshed.domain,
    zone: zone.name
  };
}
