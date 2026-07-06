import { describe, it, expect } from 'vitest';
import { validateSlug, suggestSlug, RESERVED_SLUGS } from './slugs';

describe('slugs', () => {
  describe('validateSlug', () => {
    it('should accept valid slugs', () => {
      expect(validateSlug('my-store').valid).toBe(true);
      expect(validateSlug('store123').valid).toBe(true);
      expect(validateSlug('abc').valid).toBe(true);
    });

    it('should reject empty and too-short slugs', () => {
      expect(validateSlug('').valid).toBe(false);
      expect(validateSlug('ab').valid).toBe(false);
    });

    it('should reject slugs over 63 characters', () => {
      expect(validateSlug('a'.repeat(64)).valid).toBe(false);
      expect(validateSlug('a'.repeat(63)).valid).toBe(true);
    });

    it('should reject invalid characters and hyphen placement', () => {
      expect(validateSlug('My-Store').valid).toBe(false);
      expect(validateSlug('my_store').valid).toBe(false);
      expect(validateSlug('my store').valid).toBe(false);
      expect(validateSlug('-store').valid).toBe(false);
      expect(validateSlug('store-').valid).toBe(false);
      expect(validateSlug('my--store').valid).toBe(false);
    });

    it('should reject reserved slugs', () => {
      for (const reserved of ['www', 'api', 'admin', 'connect']) {
        expect(RESERVED_SLUGS.has(reserved)).toBe(true);
        expect(validateSlug(reserved).valid).toBe(false);
      }
    });
  });

  describe('suggestSlug', () => {
    it('should slugify a plain name', () => {
      expect(suggestSlug('My Cool Store')).toBe('my-cool-store');
    });

    it('should strip accents and punctuation', () => {
      expect(suggestSlug('Café & Résumé!')).toBe('cafe-resume');
    });

    it('should collapse and trim hyphens', () => {
      expect(suggestSlug('  --Weird   name--  ')).toBe('weird-name');
    });

    it('should cap length at 63', () => {
      expect(suggestSlug('x'.repeat(100)).length).toBeLessThanOrEqual(63);
    });
  });
});
