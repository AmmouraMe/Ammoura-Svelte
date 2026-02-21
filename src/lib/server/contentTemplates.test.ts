/**
 * Tests for content type templates
 */

import { describe, it, expect } from 'vitest';
import {
  CONTENT_TYPE_TEMPLATES,
  getContentTypeTemplate,
  getAllContentTypeTemplates
} from './contentTemplates';

describe('Content Type Templates', () => {
  describe('CONTENT_TYPE_TEMPLATES', () => {
    it('should have 6 templates', () => {
      expect(CONTENT_TYPE_TEMPLATES).toHaveLength(6);
    });

    it('should include all expected template types', () => {
      const ids = CONTENT_TYPE_TEMPLATES.map((t) => t.id);
      expect(ids).toContain('blog');
      expect(ids).toContain('faq');
      expect(ids).toContain('team');
      expect(ids).toContain('testimonials');
      expect(ids).toContain('knowledge-base');
      expect(ids).toContain('events');
    });

    it('should have unique IDs', () => {
      const ids = CONTENT_TYPE_TEMPLATES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique slugs', () => {
      const slugs = CONTENT_TYPE_TEMPLATES.map((t) => t.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('should have unique base paths', () => {
      const paths = CONTENT_TYPE_TEMPLATES.map((t) => t.basePath);
      expect(new Set(paths).size).toBe(paths.length);
    });

    it('every template should have required properties', () => {
      for (const template of CONTENT_TYPE_TEMPLATES) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.slug).toBeTruthy();
        expect(template.basePath).toMatch(/^\//);
        expect(Array.isArray(template.fieldsSchema)).toBe(true);
        expect(template.fieldsSchema.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Template field schemas', () => {
    it('every field should have required properties', () => {
      for (const template of CONTENT_TYPE_TEMPLATES) {
        for (const field of template.fieldsSchema) {
          expect(field.slug).toBeTruthy();
          expect(field.name).toBeTruthy();
          expect(field.type).toBeTruthy();
          expect(typeof field.required).toBe('boolean');
          expect(typeof field.position).toBe('number');
        }
      }
    });

    it('field slugs should be unique within each template', () => {
      for (const template of CONTENT_TYPE_TEMPLATES) {
        const slugs = template.fieldsSchema.map((f) => f.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
    });

    it('field positions should be unique within each template', () => {
      for (const template of CONTENT_TYPE_TEMPLATES) {
        const positions = template.fieldsSchema.map((f) => f.position);
        expect(new Set(positions).size).toBe(positions.length);
      }
    });

    it('field positions should be sequential starting from 1', () => {
      for (const template of CONTENT_TYPE_TEMPLATES) {
        const positions = template.fieldsSchema.map((f) => f.position).sort((a, b) => a - b);
        for (let i = 0; i < positions.length; i++) {
          expect(positions[i]).toBe(i + 1);
        }
      }
    });
  });

  describe('Blog template', () => {
    it('should have expected fields', () => {
      const blog = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'blog')!;
      const slugs = blog.fieldsSchema.map((f) => f.slug);

      expect(slugs).toContain('featured_image');
      expect(slugs).toContain('body');
      expect(slugs).toContain('excerpt');
      expect(slugs).toContain('author');
      expect(slugs).toContain('category');
      expect(slugs).toContain('tags');
      expect(slugs).toContain('published_date');
    });

    it('should require the body field', () => {
      const blog = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'blog')!;
      const body = blog.fieldsSchema.find((f) => f.slug === 'body')!;
      expect(body.required).toBe(true);
      expect(body.type).toBe('rich_text');
    });

    it('featured_image should be a media field', () => {
      const blog = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'blog')!;
      const image = blog.fieldsSchema.find((f) => f.slug === 'featured_image')!;
      expect(image.type).toBe('media');
    });
  });

  describe('FAQ template', () => {
    it('should have question and answer fields', () => {
      const faq = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'faq')!;
      const slugs = faq.fieldsSchema.map((f) => f.slug);

      expect(slugs).toContain('question');
      expect(slugs).toContain('answer');
      expect(slugs).toContain('category');
      expect(slugs).toContain('sort_order');
    });

    it('should require question and answer', () => {
      const faq = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'faq')!;
      const question = faq.fieldsSchema.find((f) => f.slug === 'question')!;
      const answer = faq.fieldsSchema.find((f) => f.slug === 'answer')!;
      expect(question.required).toBe(true);
      expect(answer.required).toBe(true);
    });
  });

  describe('Team Members template', () => {
    it('should have expected fields', () => {
      const team = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'team')!;
      const slugs = team.fieldsSchema.map((f) => f.slug);

      expect(slugs).toContain('photo');
      expect(slugs).toContain('name');
      expect(slugs).toContain('role');
      expect(slugs).toContain('bio');
      expect(slugs).toContain('email');
      expect(slugs).toContain('phone');
      expect(slugs).toContain('social_links');
    });

    it('should require name', () => {
      const team = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'team')!;
      const name = team.fieldsSchema.find((f) => f.slug === 'name')!;
      expect(name.required).toBe(true);
    });
  });

  describe('Testimonials template', () => {
    it('should have rating field with min/max config', () => {
      const testimonials = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'testimonials')!;
      const rating = testimonials.fieldsSchema.find((f) => f.slug === 'rating')!;
      expect(rating.type).toBe('number');
      expect(rating.config).toEqual(expect.objectContaining({ min: 1, max: 5 }));
    });

    it('should require quote and author_name', () => {
      const testimonials = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'testimonials')!;
      const quote = testimonials.fieldsSchema.find((f) => f.slug === 'quote')!;
      const authorName = testimonials.fieldsSchema.find((f) => f.slug === 'author_name')!;
      expect(quote.required).toBe(true);
      expect(authorName.required).toBe(true);
    });
  });

  describe('Knowledge Base template', () => {
    it('should have related_articles reference field', () => {
      const kb = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'knowledge-base')!;
      const related = kb.fieldsSchema.find((f) => f.slug === 'related_articles')!;
      expect(related.type).toBe('reference');
      expect(related.config).toEqual(
        expect.objectContaining({ targetType: 'content_entry', multiple: true })
      );
    });
  });

  describe('Events template', () => {
    it('should require start_date', () => {
      const events = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'events')!;
      const startDate = events.fieldsSchema.find((f) => f.slug === 'start_date')!;
      expect(startDate.required).toBe(true);
      expect(startDate.type).toBe('datetime');
    });

    it('should have registration_url as url type', () => {
      const events = CONTENT_TYPE_TEMPLATES.find((t) => t.id === 'events')!;
      const url = events.fieldsSchema.find((f) => f.slug === 'registration_url')!;
      expect(url.type).toBe('url');
    });
  });

  describe('getContentTypeTemplate', () => {
    it('should return template by ID', () => {
      const template = getContentTypeTemplate('blog');
      expect(template).not.toBeNull();
      expect(template!.name).toBe('Blog');
    });

    it('should return null for unknown ID', () => {
      const template = getContentTypeTemplate('nonexistent');
      expect(template).toBeNull();
    });
  });

  describe('getAllContentTypeTemplates', () => {
    it('should return all templates', () => {
      const templates = getAllContentTypeTemplates();
      expect(templates).toHaveLength(6);
    });

    it('should return a copy (not the original array)', () => {
      const templates = getAllContentTypeTemplates();
      expect(templates).not.toBe(CONTENT_TYPE_TEMPLATES);
      expect(templates).toEqual(CONTENT_TYPE_TEMPLATES);
    });
  });
});
