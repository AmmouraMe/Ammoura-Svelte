/**
 * AI Context Detector
 * Analyzes URL paths, page state, and conversation to determine user intent
 */

import type { AIContext, AIContextType, AIContextDetectionResult } from '$lib/types/ai-context';
import {
  PRODUCT_CREATION_SYSTEM_PROMPT,
  PRODUCT_EDIT_SYSTEM_PROMPT,
  PAGE_BUILDER_SYSTEM_PROMPT,
  PAGE_EDIT_SYSTEM_PROMPT,
  LAYOUT_BUILDER_SYSTEM_PROMPT,
  LAYOUT_EDIT_SYSTEM_PROMPT,
  COMPONENT_BUILDER_SYSTEM_PROMPT,
  COMPONENT_EDIT_SYSTEM_PROMPT,
  GENERAL_HELP_SYSTEM_PROMPT,
  DASHBOARD_INSIGHTS_SYSTEM_PROMPT
} from './prompts';

/**
 * Detect AI context from URL path
 */
export function detectContextFromUrl(urlPath: string): AIContextType {
  // Product routes
  if (urlPath.includes('/admin/products/new')) {
    return 'product_creation';
  }
  if (urlPath.match(/\/admin\/products\/[^/]+\/edit/)) {
    return 'product_editing';
  }

  // Builder routes
  if (urlPath.includes('/admin/builder/layout')) {
    // Check if it's a new layout or editing existing
    if (urlPath === '/admin/builder/layout' || urlPath === '/admin/builder/layout/') {
      return 'layout_building';
    }
    return 'layout_editing';
  }
  if (urlPath.includes('/admin/builder/component')) {
    // Check if it's a new component or editing existing
    if (urlPath === '/admin/builder/component' || urlPath === '/admin/builder/component/') {
      return 'component_building';
    }
    return 'component_editing';
  }
  if (urlPath.includes('/admin/builder')) {
    // Main builder route for pages
    if (urlPath === '/admin/builder' || urlPath === '/admin/builder/') {
      return 'page_building';
    }
    return 'page_editing';
  }

  // Legacy page routes (if still used)
  if (urlPath.includes('/admin/pages/new')) {
    return 'page_building';
  }
  if (urlPath.match(/\/admin\/pages\/[^/]+\/edit/)) {
    return 'page_editing';
  }

  // Dashboard
  if (urlPath === '/admin/dashboard' || urlPath === '/admin') {
    return 'dashboard_insights';
  }

  // AI chat standalone page
  if (urlPath.includes('/admin/ai-chat')) {
    return 'product_creation'; // Default to product creation in standalone chat
  }

  // Default fallback
  return 'general_help';
}

/**
 * Extract entity ID from URL path
 */
export function extractEntityIdFromUrl(urlPath: string): string | undefined {
  const productMatch = urlPath.match(/\/admin\/products\/([^/]+)\/edit/);
  if (productMatch) {
    return productMatch[1];
  }

  const pageMatch = urlPath.match(/\/admin\/pages\/([^/]+)\/edit/);
  if (pageMatch) {
    return pageMatch[1];
  }

  // Builder routes
  const builderPageMatch = urlPath.match(/\/admin\/builder\/([^/]+)/);
  if (builderPageMatch && !urlPath.includes('/layout') && !urlPath.includes('/component')) {
    return builderPageMatch[1];
  }

  const layoutMatch = urlPath.match(/\/admin\/builder\/layout\/([^/]+)/);
  if (layoutMatch) {
    return layoutMatch[1];
  }

  const componentMatch = urlPath.match(/\/admin\/builder\/component\/([^/]+)/);
  if (componentMatch) {
    return componentMatch[1];
  }

  return undefined;
}

/**
 * Analyze conversation to refine context
 */
export function analyzeConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentContext: AIContextType
): AIContextType {
  if (messages.length === 0) {
    return currentContext;
  }

  // Look for keywords in recent messages
  const recentMessages = messages.slice(-5).map((m) => m.content.toLowerCase());
  const conversationText = recentMessages.join(' ');

  // Check for product-related keywords
  const productKeywords = [
    'product',
    'item',
    'price',
    'stock',
    'inventory',
    'fulfillment',
    'shipping'
  ];
  const pageKeywords = ['page', 'widget', 'hero', 'section', 'building'];
  const layoutKeywords = ['layout', 'template', 'reusable'];
  const componentKeywords = ['component', 'custom widget', 'reusable widget'];
  const widgetKeywords = ['add', 'remove', 'delete', 'insert', 'widget', 'section', 'component'];
  const helpKeywords = ['how do', 'help', 'explain', 'what is', 'show me'];

  const hasProductKeywords = productKeywords.some((kw) => conversationText.includes(kw));
  const hasPageKeywords = pageKeywords.some((kw) => conversationText.includes(kw));
  const hasLayoutKeywords = layoutKeywords.some((kw) => conversationText.includes(kw));
  const hasComponentKeywords = componentKeywords.some((kw) => conversationText.includes(kw));
  const hasWidgetKeywords = widgetKeywords.some((kw) => conversationText.includes(kw));
  const hasHelpKeywords = helpKeywords.some((kw) => conversationText.includes(kw));

  // If we're in any builder context and user is talking about widgets, stay in builder context
  const isBuilderContext = [
    'page_building',
    'page_editing',
    'layout_building',
    'layout_editing',
    'component_building',
    'component_editing'
  ].includes(currentContext);

  if (isBuilderContext && hasWidgetKeywords) {
    return currentContext;
  }

  // If we're in product_creation or general_help and user mentions layouts, switch context
  if (currentContext === 'general_help' || currentContext === 'product_creation') {
    if (hasLayoutKeywords && !hasProductKeywords) {
      return 'layout_building';
    }
    if (hasComponentKeywords && !hasProductKeywords) {
      return 'component_building';
    }
    if (hasPageKeywords && !hasProductKeywords) {
      return 'page_building';
    }
  }

  // If we're in general_help and user mentions specific tasks, switch context
  if (currentContext === 'general_help') {
    if (hasProductKeywords && !hasPageKeywords && !hasLayoutKeywords) {
      return 'product_creation';
    }
  }

  // If conversation asks for help, switch to general help
  if (
    hasHelpKeywords &&
    !hasProductKeywords &&
    !hasPageKeywords &&
    !hasLayoutKeywords &&
    !hasComponentKeywords
  ) {
    return 'general_help';
  }

  return currentContext;
}

/**
 * Get system prompt for context
 */
function getSystemPromptForContext(
  contextType: AIContextType,
  _entityData?: AIContext['entityData']
): string {
  switch (contextType) {
    case 'product_creation':
      return PRODUCT_CREATION_SYSTEM_PROMPT;
    case 'product_editing':
      return PRODUCT_EDIT_SYSTEM_PROMPT;
    case 'page_building':
      return PAGE_BUILDER_SYSTEM_PROMPT;
    case 'page_editing':
      return PAGE_EDIT_SYSTEM_PROMPT;
    case 'layout_building':
      return LAYOUT_BUILDER_SYSTEM_PROMPT;
    case 'layout_editing':
      return LAYOUT_EDIT_SYSTEM_PROMPT;
    case 'component_building':
      return COMPONENT_BUILDER_SYSTEM_PROMPT;
    case 'component_editing':
      return COMPONENT_EDIT_SYSTEM_PROMPT;
    case 'dashboard_insights':
      return DASHBOARD_INSIGHTS_SYSTEM_PROMPT;
    case 'general_help':
    default:
      return GENERAL_HELP_SYSTEM_PROMPT;
  }
}

/**
 * Get capabilities for context
 */
function getCapabilitiesForContext(contextType: AIContextType): string[] {
  switch (contextType) {
    case 'product_creation':
      return [
        'Analyze product images',
        'Suggest product details',
        'Generate SEO-optimized descriptions',
        'Configure fulfillment options',
        'Create product variants'
      ];
    case 'product_editing':
      return [
        'Update product fields',
        'Improve descriptions',
        'Optimize pricing',
        'Manage inventory',
        'Update fulfillment options'
      ];
    case 'page_building':
      return [
        'Add page sections',
        'Design layouts',
        'Generate content',
        'Optimize for mobile',
        'Add interactive widgets'
      ];
    case 'page_editing':
      return [
        'Modify existing sections',
        'Reorganize layout',
        'Update content',
        'Change styling',
        'Add new widgets'
      ];
    case 'layout_building':
      return [
        'Add widgets to layout',
        'Remove widgets from layout',
        'Configure widget settings',
        'Design reusable structures',
        'Create responsive layouts'
      ];
    case 'layout_editing':
      return [
        'Modify layout widgets',
        'Add new sections',
        'Remove sections',
        'Reorganize structure',
        'Update configurations'
      ];
    case 'component_building':
      return [
        'Configure component widget',
        'Set component properties',
        'Design reusable element',
        'Add custom styling',
        'Test component preview'
      ];
    case 'component_editing':
      return [
        'Update component config',
        'Modify component content',
        'Change component type',
        'Adjust styling',
        'Refine functionality'
      ];
    case 'dashboard_insights':
      return [
        'Analyze sales trends',
        'Generate reports',
        'Suggest improvements',
        'Answer business questions',
        'Provide KPI insights'
      ];
    case 'general_help':
    default:
      return [
        'Answer questions',
        'Provide guidance',
        'Explain features',
        'Offer best practices',
        'Navigate the platform'
      ];
  }
}

/**
 * Get suggestions for context
 */
function getSuggestionsForContext(contextType: AIContextType): string[] {
  switch (contextType) {
    case 'product_creation':
      return [
        'I want to add a new product',
        'Help me create a product listing',
        'Analyze this product image'
      ];
    case 'product_editing':
      return [
        'Improve this product description',
        'Update the pricing strategy',
        'Add more inventory'
      ];
    case 'page_building':
      return ['Add a hero section', 'Create a product grid', 'Design a landing page'];
    case 'page_editing':
      return ['Update the hero image', 'Reorganize the layout', 'Add a new section'];
    case 'layout_building':
      return [
        'Add a hero section to the layout',
        'Create a navbar',
        'Add a footer with text and links'
      ];
    case 'layout_editing':
      return ['Remove the second hero section', 'Add a navbar at the top', 'Update the footer'];
    case 'component_building':
      return [
        'Create a call-to-action button',
        'Design a feature card',
        'Make a testimonial widget'
      ];
    case 'component_editing':
      return ['Change the button text', 'Update the component styling', 'Modify the configuration'];
    case 'dashboard_insights':
      return ['Show me sales insights', 'What are my top products?', 'Generate a report'];
    case 'general_help':
    default:
      return [
        'How do I add a new category?',
        'Explain the fulfillment system',
        'Show me best practices'
      ];
  }
}

/**
 * Main context detection function
 */
export function detectAIContext(
  urlPath: string,
  entityData?: AIContext['entityData'],
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): AIContextDetectionResult {
  // Start with URL-based detection
  let contextType = detectContextFromUrl(urlPath);

  // Refine with conversation analysis if available
  // Only analyze if conversation has substance
  if (conversationHistory && conversationHistory.length > 1) {
    contextType = analyzeConversation(conversationHistory, contextType);
  }

  // Extract entity ID if applicable
  const entityId = extractEntityIdFromUrl(urlPath);

  // Build complete context
  const context: AIContext = {
    type: contextType,
    entityId,
    entityData,
    urlPath,
    conversationHistory
  };

  // Get system prompt and capabilities
  const systemPrompt = getSystemPromptForContext(contextType, entityData);
  const capabilities = getCapabilitiesForContext(contextType);
  const suggestions = getSuggestionsForContext(contextType);

  return {
    context,
    systemPrompt,
    capabilities,
    suggestions
  };
}
