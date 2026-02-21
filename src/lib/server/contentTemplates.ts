/**
 * Pre-built content type templates
 * Each template defines a field schema and default configuration
 * for common content types (Blog, FAQ, Team Members, etc.)
 */

import type { ContentTypeTemplate, ContentFieldDefinition } from '../types/contentTypes.js';

// ============================================================================
// Blog Template
// ============================================================================

const blogFields: ContentFieldDefinition[] = [
  {
    slug: 'featured_image',
    name: 'Featured Image',
    type: 'media',
    required: false,
    position: 1,
    helpText: 'Main image displayed at the top of the blog post',
    config: { allowedTypes: ['image'] }
  },
  {
    slug: 'excerpt',
    name: 'Excerpt',
    type: 'textarea',
    required: false,
    position: 2,
    placeholder: 'Brief summary of the post...',
    helpText: 'Short description shown on listing pages and in search results',
    config: { maxLength: 500 }
  },
  {
    slug: 'body',
    name: 'Body',
    type: 'rich_text',
    required: true,
    position: 3,
    helpText: 'The main content of the blog post'
  },
  {
    slug: 'author',
    name: 'Author',
    type: 'text',
    required: false,
    position: 4,
    placeholder: 'Author name'
  },
  {
    slug: 'category',
    name: 'Category',
    type: 'selection',
    required: false,
    position: 5,
    config: {
      options: [
        { label: 'General', value: 'general' },
        { label: 'News', value: 'news' },
        { label: 'Tutorial', value: 'tutorial' },
        { label: 'Announcement', value: 'announcement' }
      ],
      allowCustom: true
    }
  },
  {
    slug: 'tags',
    name: 'Tags',
    type: 'multi_selection',
    required: false,
    position: 6,
    helpText: 'Tags to categorize this post',
    config: {
      options: [],
      allowCustom: true
    }
  },
  {
    slug: 'published_date',
    name: 'Published Date',
    type: 'datetime',
    required: false,
    position: 7,
    helpText: 'When this post should be displayed as published'
  }
];

// ============================================================================
// FAQ Template
// ============================================================================

const faqFields: ContentFieldDefinition[] = [
  {
    slug: 'question',
    name: 'Question',
    type: 'text',
    required: true,
    position: 1,
    placeholder: 'Enter the frequently asked question'
  },
  {
    slug: 'answer',
    name: 'Answer',
    type: 'rich_text',
    required: true,
    position: 2,
    helpText: 'Detailed answer to the question'
  },
  {
    slug: 'category',
    name: 'Category',
    type: 'selection',
    required: false,
    position: 3,
    config: {
      options: [
        { label: 'General', value: 'general' },
        { label: 'Shipping', value: 'shipping' },
        { label: 'Returns', value: 'returns' },
        { label: 'Payments', value: 'payments' },
        { label: 'Account', value: 'account' }
      ],
      allowCustom: true
    }
  },
  {
    slug: 'sort_order',
    name: 'Sort Order',
    type: 'number',
    required: false,
    position: 4,
    defaultValue: 0,
    helpText: 'Lower numbers appear first',
    config: { min: 0 }
  }
];

// ============================================================================
// Team Members Template
// ============================================================================

const teamMemberFields: ContentFieldDefinition[] = [
  {
    slug: 'photo',
    name: 'Photo',
    type: 'media',
    required: false,
    position: 1,
    helpText: 'Profile photo of the team member',
    config: { allowedTypes: ['image'] }
  },
  {
    slug: 'name',
    name: 'Full Name',
    type: 'text',
    required: true,
    position: 2,
    placeholder: 'Full name'
  },
  {
    slug: 'role',
    name: 'Role / Title',
    type: 'text',
    required: false,
    position: 3,
    placeholder: 'e.g., CEO, Designer, Engineer'
  },
  {
    slug: 'bio',
    name: 'Bio',
    type: 'rich_text',
    required: false,
    position: 4,
    helpText: 'Short biography or description'
  },
  {
    slug: 'email',
    name: 'Email',
    type: 'email',
    required: false,
    position: 5,
    placeholder: 'team.member@company.com'
  },
  {
    slug: 'phone',
    name: 'Phone',
    type: 'tel',
    required: false,
    position: 6,
    placeholder: '+1 (555) 123-4567'
  },
  {
    slug: 'social_links',
    name: 'Social Links',
    type: 'json',
    required: false,
    position: 7,
    helpText: 'Social media links as JSON (e.g., {"linkedin": "...", "twitter": "..."})',
    defaultValue: {}
  }
];

// ============================================================================
// Testimonials Template
// ============================================================================

const testimonialFields: ContentFieldDefinition[] = [
  {
    slug: 'quote',
    name: 'Quote',
    type: 'textarea',
    required: true,
    position: 1,
    placeholder: 'What the customer said...',
    helpText: 'The testimonial quote'
  },
  {
    slug: 'author_name',
    name: 'Author Name',
    type: 'text',
    required: true,
    position: 2,
    placeholder: 'Customer name'
  },
  {
    slug: 'company',
    name: 'Company',
    type: 'text',
    required: false,
    position: 3,
    placeholder: 'Company or organization'
  },
  {
    slug: 'avatar',
    name: 'Avatar',
    type: 'media',
    required: false,
    position: 4,
    helpText: 'Photo of the testimonial author',
    config: { allowedTypes: ['image'] }
  },
  {
    slug: 'rating',
    name: 'Rating',
    type: 'number',
    required: false,
    position: 5,
    defaultValue: 5,
    helpText: 'Rating from 1 to 5',
    config: { min: 1, max: 5, step: 1 }
  },
  {
    slug: 'featured',
    name: 'Featured',
    type: 'boolean',
    required: false,
    position: 6,
    defaultValue: false,
    helpText: 'Show this testimonial prominently'
  }
];

// ============================================================================
// Knowledge Base Template
// ============================================================================

const knowledgeBaseFields: ContentFieldDefinition[] = [
  {
    slug: 'body',
    name: 'Article Body',
    type: 'rich_text',
    required: true,
    position: 1,
    helpText: 'The main content of the knowledge base article'
  },
  {
    slug: 'category',
    name: 'Category',
    type: 'selection',
    required: false,
    position: 2,
    config: {
      options: [
        { label: 'Getting Started', value: 'getting-started' },
        { label: 'How-To Guides', value: 'how-to' },
        { label: 'Troubleshooting', value: 'troubleshooting' },
        { label: 'Reference', value: 'reference' },
        { label: 'API', value: 'api' }
      ],
      allowCustom: true
    }
  },
  {
    slug: 'tags',
    name: 'Tags',
    type: 'multi_selection',
    required: false,
    position: 3,
    helpText: 'Tags to help users find this article',
    config: {
      options: [],
      allowCustom: true
    }
  },
  {
    slug: 'related_articles',
    name: 'Related Articles',
    type: 'reference',
    required: false,
    position: 4,
    helpText: 'Link to related knowledge base articles',
    config: {
      targetType: 'content_entry',
      multiple: true
    }
  }
];

// ============================================================================
// Events Template
// ============================================================================

const eventFields: ContentFieldDefinition[] = [
  {
    slug: 'description',
    name: 'Description',
    type: 'rich_text',
    required: false,
    position: 1,
    helpText: 'Detailed description of the event'
  },
  {
    slug: 'start_date',
    name: 'Start Date & Time',
    type: 'datetime',
    required: true,
    position: 2,
    helpText: 'When the event starts'
  },
  {
    slug: 'end_date',
    name: 'End Date & Time',
    type: 'datetime',
    required: false,
    position: 3,
    helpText: 'When the event ends'
  },
  {
    slug: 'location',
    name: 'Location',
    type: 'text',
    required: false,
    position: 4,
    placeholder: 'e.g., 123 Main St, City, State'
  },
  {
    slug: 'venue',
    name: 'Venue',
    type: 'text',
    required: false,
    position: 5,
    placeholder: 'e.g., Convention Center, Room 101'
  },
  {
    slug: 'image',
    name: 'Event Image',
    type: 'media',
    required: false,
    position: 6,
    config: { allowedTypes: ['image'] }
  },
  {
    slug: 'registration_url',
    name: 'Registration URL',
    type: 'url',
    required: false,
    position: 7,
    placeholder: 'https://example.com/register',
    helpText: 'Link to registration form or ticket purchase'
  },
  {
    slug: 'capacity',
    name: 'Capacity',
    type: 'number',
    required: false,
    position: 8,
    helpText: 'Maximum number of attendees',
    config: { min: 0 }
  }
];

// ============================================================================
// Template Registry
// ============================================================================

/**
 * All available content type templates
 */
export const CONTENT_TYPE_TEMPLATES: ContentTypeTemplate[] = [
  {
    id: 'blog',
    name: 'Blog',
    description:
      'A blog with articles featuring images, rich text, categories, and tags. Perfect for news, updates, and thought leadership.',
    icon: '📝',
    slug: 'blog',
    basePath: '/blog',
    fieldsSchema: blogFields
  },
  {
    id: 'faq',
    name: 'FAQ',
    description:
      'Frequently asked questions organized by category. Great for customer support and self-service.',
    icon: '❓',
    slug: 'faq',
    basePath: '/faq',
    fieldsSchema: faqFields
  },
  {
    id: 'team',
    name: 'Team Members',
    description: 'Showcase your team with photos, roles, bios, and contact information.',
    icon: '👥',
    slug: 'team',
    basePath: '/team',
    fieldsSchema: teamMemberFields
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Customer testimonials and reviews with ratings, photos, and attribution.',
    icon: '💬',
    slug: 'testimonials',
    basePath: '/testimonials',
    fieldsSchema: testimonialFields
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    description: 'Documentation and help articles with categories, tags, and cross-referencing.',
    icon: '📚',
    slug: 'knowledge-base',
    basePath: '/knowledge-base',
    fieldsSchema: knowledgeBaseFields
  },
  {
    id: 'events',
    name: 'Events',
    description:
      'Upcoming events with dates, locations, registration links, and capacity tracking.',
    icon: '📅',
    slug: 'events',
    basePath: '/events',
    fieldsSchema: eventFields
  }
];

/**
 * Get a template by ID
 */
export function getContentTypeTemplate(templateId: string): ContentTypeTemplate | null {
  return CONTENT_TYPE_TEMPLATES.find((t) => t.id === templateId) || null;
}

/**
 * Get all available templates
 */
export function getAllContentTypeTemplates(): ContentTypeTemplate[] {
  return [...CONTENT_TYPE_TEMPLATES];
}
