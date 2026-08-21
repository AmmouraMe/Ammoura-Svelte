import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db/connection';
import {
  getSSOProviders,
  createSSOProvider,
  updateSSOProvider,
  disableSSOProvider,
  reorderSSOProviders,
  type CreateSSOProviderData,
  type UpdateSSOProviderData
} from '$lib/server/db/sso-providers';
import { getEnvOAuthProviders } from '$lib/server/oauth/env-providers';
import type { OAuthProvider } from '$lib/types/oauth';

const VALID_PROVIDERS: OAuthProvider[] = [
  'google',
  'linkedin',
  'apple',
  'facebook',
  'github',
  'twitter',
  'microsoft',
  'discord'
];

const PROVIDER_DEFAULTS = {
  google: { name: 'Google', icon: 'Chrome' },
  linkedin: { name: 'LinkedIn', icon: 'Linkedin' },
  apple: { name: 'Apple', icon: 'Apple' },
  facebook: { name: 'Facebook', icon: 'Facebook' },
  github: { name: 'GitHub', icon: 'Github' },
  twitter: { name: 'X (Twitter)', icon: 'Twitter' },
  microsoft: { name: 'Microsoft', icon: 'Building' },
  discord: { name: 'Discord', icon: 'MessageCircle' }
};

export const load: PageServerLoad = async ({ platform, locals }) => {
  // Check authentication
  if (!locals.currentUser) {
    throw error(401, 'Unauthorized');
  }

  // Only admins can manage SSO providers
  if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
    throw error(403, 'Access denied. Admin role required.');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;

  try {
    const providers = await getSSOProviders(db, siteId);

    // Map providers to include default display info if not set
    const providersWithDefaults = providers.map((p) => ({
      ...p,
      display_name: p.display_name || PROVIDER_DEFAULTS[p.provider].name,
      icon: p.icon || PROVIDER_DEFAULTS[p.provider].icon
    }));

    // Detect providers configured via environment variables
    const envProviders = getEnvOAuthProviders(platform?.env as unknown as Record<string, unknown>);
    const dbProviderSet = new Set(providers.map((p) => p.provider));

    // Create "virtual" entries for env-var providers not in DB
    const envOnlyProviders = envProviders
      .filter((ep) => !dbProviderSet.has(ep.provider))
      .map((ep) => ({
        id: `env-${ep.provider}`,
        site_id: siteId,
        provider: ep.provider,
        enabled: 1,
        client_id: ep.clientId.slice(0, 8) + '••••',
        tenant: null,
        display_name: ep.displayName,
        icon: ep.icon,
        sort_order: 0,
        created_at: 0,
        updated_at: 0,
        from_env: true
      }));

    return {
      providers: providersWithDefaults,
      envProviders: envOnlyProviders,
      availableProviders: VALID_PROVIDERS,
      providerDefaults: PROVIDER_DEFAULTS
    };
  } catch (err) {
    console.error('Failed to load SSO providers:', err);
    throw error(500, 'Failed to load SSO providers');
  }
};

export const actions: Actions = {
  create: async ({ request, platform, locals }) => {
    // Check authentication
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const formData = await request.formData();
    const provider = formData.get('provider')?.toString() as OAuthProvider;
    const enabled = formData.get('enabled') === 'true';
    const clientId = formData.get('client_id')?.toString();
    const clientSecret = formData.get('client_secret')?.toString();
    const tenant = formData.get('tenant')?.toString();
    const displayName = formData.get('display_name')?.toString();
    const icon = formData.get('icon')?.toString();
    const sortOrder = parseInt(formData.get('sort_order')?.toString() || '0');

    // Validate required fields
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return fail(400, { error: 'Invalid provider' });
    }

    if (!clientId || clientId.trim() === '') {
      return fail(400, { error: 'Client ID is required', field: 'client_id' });
    }

    if (!clientSecret || clientSecret.trim() === '') {
      return fail(400, { error: 'Client Secret is required', field: 'client_secret' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform?.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return fail(500, {
        error: 'Server encryption not configured. Contact system administrator.'
      });
    }

    try {
      const providerData: CreateSSOProviderData = {
        provider,
        enabled,
        client_id: clientId,
        client_secret: clientSecret,
        tenant: tenant || undefined,
        display_name: displayName || undefined,
        icon: icon || undefined,
        sort_order: sortOrder
      };

      // Client secret will be automatically encrypted before storage
      await createSSOProvider(db, siteId, providerData, encryptionKey);

      return { success: true, message: 'SSO provider created successfully' };
    } catch (err) {
      console.error('Failed to create SSO provider:', err);
      const errorMessage = String(err);
      if (errorMessage.includes('UNIQUE constraint failed')) {
        return fail(409, { error: 'Provider already exists for this site' });
      }
      return fail(500, { error: 'Failed to create SSO provider' });
    }
  },

  update: async ({ request, platform, locals }) => {
    // Check authentication
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const formData = await request.formData();
    const provider = formData.get('provider')?.toString() as OAuthProvider;
    const enabled = formData.get('enabled') === 'true';
    const clientId = formData.get('client_id')?.toString();
    const clientSecret = formData.get('client_secret')?.toString();
    const tenant = formData.get('tenant')?.toString();
    const displayName = formData.get('display_name')?.toString();
    const icon = formData.get('icon')?.toString();
    const sortOrder = formData.get('sort_order')?.toString();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return fail(400, { error: 'Invalid provider' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform?.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return fail(500, {
        error: 'Server encryption not configured. Contact system administrator.'
      });
    }

    try {
      const updateData: UpdateSSOProviderData = {
        enabled
      };

      if (clientId && clientId.trim() !== '') {
        updateData.client_id = clientId;
      }

      if (clientSecret && clientSecret.trim() !== '') {
        updateData.client_secret = clientSecret;
      }

      if (tenant !== undefined) {
        updateData.tenant = tenant || undefined;
      }

      if (displayName !== undefined) {
        updateData.display_name = displayName || undefined;
      }

      if (icon !== undefined) {
        updateData.icon = icon || undefined;
      }

      if (sortOrder !== undefined) {
        updateData.sort_order = parseInt(sortOrder);
      }

      // Client secret will be automatically encrypted if provided
      const result = await updateSSOProvider(db, siteId, provider, updateData, encryptionKey);

      if (!result) {
        return fail(404, { error: 'Provider not found' });
      }

      return { success: true, message: 'SSO provider updated successfully' };
    } catch (err) {
      console.error('Failed to update SSO provider:', err);
      return fail(500, { error: 'Failed to update SSO provider' });
    }
  },

  disable: async ({ request, platform, locals }) => {
    // Check authentication
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const formData = await request.formData();
    const provider = formData.get('provider')?.toString() as OAuthProvider;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return fail(400, { error: 'Invalid provider' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      await disableSSOProvider(db, siteId, provider);
      return { success: true, message: 'SSO provider disabled successfully' };
    } catch (err) {
      console.error('Failed to disable SSO provider:', err);
      return fail(500, { error: 'Failed to disable SSO provider' });
    }
  },

  reorder: async ({ request, platform, locals }) => {
    // Check authentication
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const formData = await request.formData();
    const ordersJson = formData.get('orders')?.toString();

    if (!ordersJson) {
      return fail(400, { error: 'Orders data is required' });
    }

    let providerOrders: Array<{ provider: OAuthProvider; sort_order: number }>;
    try {
      providerOrders = JSON.parse(ordersJson);
    } catch {
      return fail(400, { error: 'Invalid orders data format' });
    }

    // Validate all providers
    for (const item of providerOrders) {
      if (!VALID_PROVIDERS.includes(item.provider)) {
        return fail(400, { error: `Invalid provider: ${item.provider}` });
      }
    }

    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      await reorderSSOProviders(db, siteId, providerOrders);
      return { success: true, message: 'Provider order updated successfully' };
    } catch (err) {
      console.error('Failed to reorder SSO providers:', err);
      return fail(500, { error: 'Failed to reorder SSO providers' });
    }
  }
};
