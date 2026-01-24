/**
 * AI Context Detection and Management
 * Determines what the user is trying to do based on URL, conversation, and page state
 */

export type AIContextType =
  | 'product_creation'
  | 'product_editing'
  | 'page_building'
  | 'page_editing'
  | 'layout_building'
  | 'layout_editing'
  | 'component_building'
  | 'component_editing'
  | 'general_help'
  | 'dashboard_insights';

export interface AIContext {
  type: AIContextType;
  entityId?: string;
  entityData?: {
    // For product editing
    product?: {
      id: string;
      name: string;
      description: string;
      price: number;
      category: string;
      type: string;
      stock: number;
      tags: string[];
    };
    // For page building
    page?: {
      id: string;
      title: string;
      slug: string;
      widgets: Array<Record<string, unknown>>;
    };
    // For layout building
    layout?: {
      id: string;
      name: string;
      slug: string;
      widgets: Array<Record<string, unknown>>;
    };
    // For component building
    component?: {
      id: string;
      name: string;
      type: string;
      config: Record<string, unknown>;
    };
    // Builder context (for all builder modes)
    builder?: {
      mode: 'page' | 'layout' | 'component';
      entityId: string | null;
      entityName: string;
      slug: string;
      widgets: Array<Record<string, unknown>>;
      layoutId: number | null;
      availableWidgetTypes: string[];
    };
  };
  urlPath: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIContextDetectionResult {
  context: AIContext;
  systemPrompt: string;
  capabilities: string[];
  suggestions: string[];
}
