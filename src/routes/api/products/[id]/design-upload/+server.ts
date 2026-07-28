import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, getCustomizationZones, createMediaLibraryItem } from '$lib/server/db';
import {
  hashClientAddress,
  checkRateLimit,
  validateDimensions,
  validateAgainstZone,
  RATE_LIMIT_WINDOW_SECONDS
} from '$lib/server/design-uploads';

/**
 * Customer design upload.
 *
 * Distinct from `/api/media/upload`, which is the owner's media library. This
 * one is reachable by anonymous shoppers, so it validates against the target
 * zone's own limits, rate-limits per client, and tags what it stores as
 * customer artwork rather than site content.
 */
export const POST: RequestHandler = async ({
  request,
  params,
  platform,
  locals,
  getClientAddress
}) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  // A malformed or bodyless POST throws here; without this it surfaces as an
  // opaque 500 and a stack trace in the logs, rather than telling the caller
  // what was wrong.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw error(400, 'Expected a multipart form upload');
  }

  const file = formData.get('file');
  const zoneId = formData.get('zoneId');

  if (!(file instanceof File)) {
    throw error(400, 'No file provided');
  }
  if (typeof zoneId !== 'string' || !zoneId) {
    throw error(400, 'No design area specified');
  }

  // The zone must belong to this product on this site — otherwise the limits
  // being enforced are not the ones the owner configured.
  const zones = await getCustomizationZones(db, siteId, params.id);
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) {
    throw error(404, 'Design area not found for this product');
  }

  const fileCheck = validateAgainstZone(
    { size: file.size, type: file.type },
    { maxFileSize: zone.maxFileSize, allowedTypes: zone.allowedTypes }
  );
  if (!fileCheck.allowed) {
    throw error(400, fileCheck.reason as string);
  }

  let dimensions: { width: number; height: number } | null = null;
  const rawDimensions = formData.get('dimensions');
  if (typeof rawDimensions === 'string') {
    try {
      dimensions = JSON.parse(rawDimensions) as { width: number; height: number };
    } catch {
      dimensions = null;
    }
  }
  const dimensionCheck = validateDimensions(dimensions);
  if (!dimensionCheck.allowed) {
    throw error(400, dimensionCheck.reason as string);
  }

  // Rate limit per client, per site, over a rolling window.
  // `ENCRYPTION_KEY` is the project's existing secret binding; the site id is a
  // last-resort fallback so local dev without secrets still counts correctly.
  const salt = (platform.env.ENCRYPTION_KEY as string) || siteId;
  const ipHash = await hashClientAddress(getClientAddress(), salt);
  const windowStart = Math.floor(Date.now() / 1000) - RATE_LIMIT_WINDOW_SECONDS;

  const usageRow = await db
    .prepare(
      `SELECT COUNT(*) AS uploads, COALESCE(SUM(bytes), 0) AS bytes
         FROM customer_upload_events
        WHERE site_id = ? AND ip_hash = ? AND created_at > ?`
    )
    .bind(siteId, ipHash, windowStart)
    .first<{ uploads: number; bytes: number }>();

  const decision = checkRateLimit(
    { uploads: usageRow?.uploads ?? 0, bytes: usageRow?.bytes ?? 0 },
    file.size
  );
  if (!decision.allowed) {
    throw error(429, decision.reason as string);
  }

  // Store the ORIGINAL untouched — the print file is generated from it.
  let url: string;
  if (platform.env.MEDIA_BUCKET) {
    const extension = file.name.split('.').pop() || 'png';
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    const key = `${siteId}/designs/${unique}.${extension}`;
    await platform.env.MEDIA_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });
    url = `/api/media/${key}`;
  } else {
    // No bucket bound (bare local dev): fall back to an inline copy so the
    // flow still works, accepting that it is not a production path.
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (const byte of buffer) binary += String.fromCharCode(byte);
    url = `data:${file.type};base64,${btoa(binary)}`;
  }

  const mediaItem = await createMediaLibraryItem(db, siteId, {
    type: 'image',
    url,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    width: dimensions?.width,
    height: dimensions?.height,
    source: 'customer_design'
  });

  await db
    .prepare(
      `INSERT INTO customer_upload_events (id, site_id, ip_hash, bytes, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), siteId, ipHash, file.size, Math.floor(Date.now() / 1000))
    .run();

  return json(
    {
      id: mediaItem.id,
      url: mediaItem.url,
      width: mediaItem.width || dimensions?.width,
      height: mediaItem.height || dimensions?.height
    },
    { status: 201 }
  );
};
