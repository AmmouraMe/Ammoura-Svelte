/**
 * DNS-over-HTTPS lookups for the assisted custom-domain flow (tenancy plan
 * §4.2): detect whether a customer's domain uses Cloudflare nameservers so we
 * can offer to set their DNS records for them via a scoped API token.
 */

const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';

interface DnsJsonAnswer {
  name: string;
  type: number;
  data: string;
}

interface DnsJsonResponse {
  Status: number;
  Answer?: DnsJsonAnswer[];
}

const TYPE_NS = 2;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function queryNs(name: string, fetchImpl: FetchLike): Promise<string[]> {
  const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=NS`;
  const response = await fetchImpl(url, {
    headers: { accept: 'application/dns-json' }
  });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as DnsJsonResponse;
  if (data.Status !== 0 || !data.Answer) {
    return [];
  }
  return data.Answer.filter((a) => a.type === TYPE_NS).map((a) =>
    a.data.toLowerCase().replace(/\.$/, '')
  );
}

/**
 * Find the nameservers responsible for a hostname. NS records live at the
 * registrable domain, so for `shop.example.com` this walks up the labels
 * (shop.example.com → example.com) until an NS answer appears.
 */
export async function lookupNameservers(
  hostname: string,
  fetchImpl: FetchLike = fetch
): Promise<{ zone: string; nameservers: string[] } | null> {
  const labels = hostname.trim().toLowerCase().replace(/\.$/, '').split('.');

  // Walk from the full hostname up to (but not including) the bare TLD
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    const nameservers = await queryNs(candidate, fetchImpl);
    if (nameservers.length > 0) {
      return { zone: candidate, nameservers };
    }
  }
  return null;
}

export function isCloudflareNameserver(ns: string): boolean {
  return /\.ns\.cloudflare\.com$/.test(ns.toLowerCase().replace(/\.$/, ''));
}

/**
 * True when the hostname's zone is served by Cloudflare DNS — the signal to
 * offer the assisted "connect via Cloudflare" flow.
 */
export async function usesCloudflareDns(
  hostname: string,
  fetchImpl: FetchLike = fetch
): Promise<{ cloudflare: boolean; zone: string | null }> {
  const result = await lookupNameservers(hostname, fetchImpl);
  if (!result || result.nameservers.length === 0) {
    return { cloudflare: false, zone: null };
  }
  return {
    cloudflare: result.nameservers.every(isCloudflareNameserver),
    zone: result.zone
  };
}
