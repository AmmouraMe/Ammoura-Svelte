import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLayout, createLayoutWidget } from '$lib/server/db/layouts';
import type { PageWidget, PageComponent } from '$lib/types/pages';

/**
 * POST /api/layouts
 * Create a new layout with widgets/components
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform?.env?.DB) {
    throw error(500, 'Database not available');
  }

  const siteId = locals.siteId;

  try {
    const body = (await request.json()) as {
      name: string;
      slug: string;
      description?: string;
      widgets?: PageWidget[];
      components?: PageComponent[]; // Also accept components (used by builder)
    };

    if (!body.name || !body.slug) {
      throw error(400, 'Name and slug are required');
    }

    // Create the layout
    const layout = await createLayout(platform.env.DB, siteId, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      is_default: false
    });

    // Accept either widgets or components (builder sends components)
    const widgetsToCreate = body.widgets || body.components || [];

    // If widgets are provided, create them
    if (widgetsToCreate.length > 0) {
      // Create each widget for the layout
      await Promise.all(
        widgetsToCreate.map((widget, index) =>
          createLayoutWidget(platform.env.DB, layout.id, {
            id: widget.id,
            type: widget.type,
            // Ensure position is set, fallback to index if not provided
            position: widget.position ?? index,
            config: widget.config
          })
        )
      );
    }

    return json({ layoutId: layout.id, layout }, { status: 201 });
  } catch (err) {
    console.error('Failed to create layout:', err);
    const message = err instanceof Error ? err.message : 'Failed to create layout';
    throw error(500, message);
  }
};
