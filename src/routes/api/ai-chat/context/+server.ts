import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectAIContext } from '$lib/server/ai/context-detector';

/**
 * POST /api/ai-chat/context
 * Detect AI context from URL and conversation
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!locals.currentUser) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { urlPath, entityData, conversationHistory } = body as {
      urlPath: string;
      entityData?: Record<string, unknown>;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    const result = detectAIContext(urlPath, entityData, conversationHistory);

    return json(result);
  } catch (error) {
    console.error('Context detection error:', error);
    return json({ error: 'Failed to detect context' }, { status: 500 });
  }
};
