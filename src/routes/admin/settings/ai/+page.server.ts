import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db/connection';
import {
  getAISettings,
  upsertAISetting,
  deleteAISetting,
  hasAPIKeysConfigured,
  getAvailableProviders,
  setDefaultAIConfig
} from '$lib/server/db/ai-settings';
import { createActivityLog } from '$lib/server/db/activity-logs';
import type { AIModel, AIProvider } from '$lib/types/ai-chat';

export const load: PageServerLoad = async ({ platform, locals }) => {
  // Check authentication
  if (!locals.currentUser) {
    throw error(401, 'Unauthorized');
  }

  // Only admins can manage AI settings
  if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
    throw error(403, 'Access denied. Admin role required.');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;
  const encryptionKey = platform?.env?.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
  }

  try {
    const hasKeys = await hasAPIKeysConfigured(db, siteId);
    const availableProviders = await getAvailableProviders(db, siteId);

    // Get settings without exposing the actual API keys
    const settings = await getAISettings(db, siteId, encryptionKey);

    // Mask API keys for display (only show if they exist)
    const maskedSettings = {
      ...settings,
      openai_api_key: settings.openai_api_key ? '••••••••••••' : undefined,
      anthropic_api_key: settings.anthropic_api_key ? '••••••••••••' : undefined,
      grok_api_key: settings.grok_api_key ? '••••••••••••' : undefined
    };

    return {
      settings: maskedSettings,
      hasKeys,
      availableProviders,
      supportedModels: getSupportedModels()
    };
  } catch (err) {
    console.error('Failed to load AI settings:', err);
    throw error(500, 'Failed to load AI settings');
  }
};

export const actions: Actions = {
  saveApiKey: async ({ request, platform, locals }) => {
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform?.env?.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return fail(500, { error: 'Encryption key not configured' });
    }

    const formData = await request.formData();
    const provider = formData.get('provider')?.toString() as AIProvider;
    const apiKey = formData.get('api_key')?.toString();

    // Validate provider
    if (!provider || !['openai', 'anthropic', 'grok'].includes(provider)) {
      return fail(400, { error: 'Invalid provider' });
    }

    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      return fail(400, { error: 'API key is required', field: 'api_key' });
    }

    // Basic API key format validation
    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      return fail(400, {
        error: 'Invalid OpenAI API key format (should start with sk-)',
        field: 'api_key'
      });
    }

    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      return fail(400, {
        error: 'Invalid Anthropic API key format (should start with sk-ant-)',
        field: 'api_key'
      });
    }

    try {
      const settingKey = `${provider}_api_key`;
      await upsertAISetting(
        db,
        siteId,
        settingKey,
        apiKey,
        'encrypted',
        encryptionKey,
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`
      );

      // Log the activity
      await createActivityLog(db, siteId, {
        user_id: locals.currentUser.id,
        action: 'Updated AI API Key',
        entity_type: 'ai_settings',
        entity_id: settingKey,
        description: `Added or updated ${provider} API key for AI chat interface`
      });

      return { success: true, message: `${provider} API key saved successfully` };
    } catch (err) {
      console.error('Failed to save API key:', err);
      return fail(500, { error: 'Failed to save API key' });
    }
  },

  deleteApiKey: async ({ request, platform, locals }) => {
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;

    const formData = await request.formData();
    const provider = formData.get('provider')?.toString() as AIProvider;

    if (!provider || !['openai', 'anthropic', 'grok'].includes(provider)) {
      return fail(400, { error: 'Invalid provider' });
    }

    try {
      const settingKey = `${provider}_api_key`;
      await deleteAISetting(db, siteId, settingKey);

      // Log the activity
      await createActivityLog(db, siteId, {
        user_id: locals.currentUser.id,
        action: 'Deleted AI API Key',
        entity_type: 'ai_settings',
        entity_id: settingKey,
        description: `Removed ${provider} API key for AI chat interface`
      });

      return { success: true, message: `${provider} API key deleted successfully` };
    } catch (err) {
      console.error('Failed to delete API key:', err);
      return fail(500, { error: 'Failed to delete API key' });
    }
  },

  saveSettings: async ({ request, platform, locals }) => {
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform?.env?.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return fail(500, { error: 'Encryption key not configured' });
    }

    const formData = await request.formData();
    const preferredModel = formData.get('preferred_model')?.toString();
    const temperature = formData.get('temperature')?.toString();
    const maxTokens = formData.get('max_tokens')?.toString();
    const costLimitDaily = formData.get('cost_limit_daily')?.toString();
    const rateLimitPerMinute = formData.get('rate_limit_per_minute')?.toString();

    try {
      if (preferredModel) {
        await upsertAISetting(
          db,
          siteId,
          'preferred_model',
          preferredModel,
          'string',
          encryptionKey
        );
      }

      if (temperature) {
        const temp = parseFloat(temperature);
        if (temp < 0 || temp > 2) {
          return fail(400, { error: 'Temperature must be between 0 and 2' });
        }
        await upsertAISetting(db, siteId, 'temperature', temp, 'number', encryptionKey);
      }

      if (maxTokens) {
        const tokens = parseInt(maxTokens);
        if (tokens < 100 || tokens > 16000) {
          return fail(400, { error: 'Max tokens must be between 100 and 16000' });
        }
        await upsertAISetting(db, siteId, 'max_tokens', tokens, 'number', encryptionKey);
      }

      if (costLimitDaily) {
        const limit = parseFloat(costLimitDaily);
        if (limit < 0) {
          return fail(400, { error: 'Cost limit must be positive' });
        }
        await upsertAISetting(db, siteId, 'cost_limit_daily', limit, 'number', encryptionKey);
      }

      if (rateLimitPerMinute) {
        const limit = parseInt(rateLimitPerMinute);
        if (limit < 1 || limit > 100) {
          return fail(400, { error: 'Rate limit must be between 1 and 100' });
        }
        await upsertAISetting(db, siteId, 'rate_limit_per_minute', limit, 'number', encryptionKey);
      }

      // Log the activity
      await createActivityLog(db, siteId, {
        user_id: locals.currentUser.id,
        action: 'Updated AI Settings',
        entity_type: 'ai_settings',
        description: 'Updated AI chat configuration settings'
      });

      return { success: true, message: 'Settings saved successfully' };
    } catch (err) {
      console.error('Failed to save settings:', err);
      return fail(500, { error: 'Failed to save settings' });
    }
  },

  initializeDefaults: async ({ platform, locals }) => {
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform?.env?.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return fail(500, { error: 'Encryption key not configured' });
    }

    try {
      await setDefaultAIConfig(db, siteId, encryptionKey);

      // Log the activity
      await createActivityLog(db, siteId, {
        user_id: locals.currentUser.id,
        action: 'Initialized AI Settings',
        entity_type: 'ai_settings',
        description: 'Set default AI chat configuration'
      });

      return { success: true, message: 'Default settings initialized successfully' };
    } catch (err) {
      console.error('Failed to initialize defaults:', err);
      return fail(500, { error: 'Failed to initialize defaults' });
    }
  },

  toggleEnabled: async ({ request, platform, locals }) => {
    if (!locals.currentUser) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (locals.currentUser.role !== 'admin' && locals.currentUser.role !== 'platform_engineer') {
      return fail(403, { error: 'Access denied. Admin role required.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const encryptionKey = platform?.env?.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return fail(500, { error: 'Encryption key not configured' });
    }

    const formData = await request.formData();
    const enabled = formData.get('enabled')?.toString() === 'true';

    try {
      await upsertAISetting(
        db,
        siteId,
        'ai_chat_enabled',
        enabled,
        'boolean',
        encryptionKey,
        'Enable or disable AI chat assistant'
      );

      // Log the activity
      await createActivityLog(db, siteId, {
        user_id: locals.currentUser.id,
        action: enabled ? 'Enabled AI Chat' : 'Disabled AI Chat',
        entity_type: 'ai_settings',
        entity_id: 'ai_chat_enabled',
        description: enabled
          ? 'Enabled AI chat assistant for the site'
          : 'Disabled AI chat assistant for the site'
      });

      return {
        success: true,
        message: enabled ? 'AI chat enabled successfully' : 'AI chat disabled successfully'
      };
    } catch (err) {
      console.error('Failed to toggle AI chat:', err);
      return fail(500, { error: 'Failed to toggle AI chat' });
    }
  }
};

function getSupportedModels(): { provider: AIProvider; model: AIModel; label: string }[] {
  return [
    { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster, cheaper)' },
    {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      label: 'Claude Sonnet 4 (Recommended)'
    },
    {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      label: 'Claude 3.5 Sonnet'
    },
    {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku (Faster, cheaper)'
    },
    { provider: 'grok', model: 'grok-4.5', label: 'Grok 4.5' }
  ];
}
