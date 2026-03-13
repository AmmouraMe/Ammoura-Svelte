import { describe, it, expect } from 'vitest';
import {
  getProviderCapabilities,
  PROVIDER_TYPES,
  isValidProviderType
} from './providerCapabilities';
import type { ProviderType } from '$lib/types/fulfillment';

describe('providerCapabilities', () => {
  describe('PROVIDER_TYPES', () => {
    it('includes manual provider type', () => {
      expect(PROVIDER_TYPES).toContain('manual');
    });

    it('includes printful provider type', () => {
      expect(PROVIDER_TYPES).toContain('printful');
    });
  });

  describe('isValidProviderType', () => {
    it('returns true for manual', () => {
      expect(isValidProviderType('manual')).toBe(true);
    });

    it('returns true for printful', () => {
      expect(isValidProviderType('printful')).toBe(true);
    });

    it('returns false for unknown types', () => {
      expect(isValidProviderType('unknown')).toBe(false);
      expect(isValidProviderType('')).toBe(false);
      expect(isValidProviderType('MANUAL')).toBe(false);
    });
  });

  describe('getProviderCapabilities', () => {
    describe('manual provider', () => {
      it('manages stock locally', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.managesOwnStock).toBe(true);
      });

      it('does not manage shipping externally', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.managesShipping).toBe(false);
      });

      it('does not have an external catalog', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.hasExternalCatalog).toBe(false);
      });

      it('does not require external sync', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.requiresExternalSync).toBe(false);
      });

      it('allows manual pricing', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.allowsManualPricing).toBe(true);
      });

      it('supports customization zones', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.supportsCustomizationZones).toBe(true);
      });

      it('supports customization fields', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.supportsCustomizationFields).toBe(true);
      });

      it('allows all product types', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.allowedProductTypes).toEqual(['physical', 'digital', 'service']);
      });

      it('has correct display label', () => {
        const caps = getProviderCapabilities('manual');
        expect(caps.displayName).toBe('Manual / Self-Fulfilled');
      });
    });

    describe('printful provider', () => {
      it('does not manage stock locally (Printful manages it)', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.managesOwnStock).toBe(false);
      });

      it('manages shipping externally', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.managesShipping).toBe(true);
      });

      it('has an external catalog', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.hasExternalCatalog).toBe(true);
      });

      it('requires external sync', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.requiresExternalSync).toBe(true);
      });

      it('does not allow manual pricing (Printful sets base cost)', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.allowsManualPricing).toBe(false);
      });

      it('supports customization zones (print areas)', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.supportsCustomizationZones).toBe(true);
      });

      it('does not support customization fields (no custom text engraving etc)', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.supportsCustomizationFields).toBe(false);
      });

      it('only allows physical product type', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.allowedProductTypes).toEqual(['physical']);
      });

      it('has correct display label', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.displayName).toBe('Printful');
      });

      it('requires API key configuration', () => {
        const caps = getProviderCapabilities('printful');
        expect(caps.requiredConfig).toContain('apiKey');
      });
    });

    describe('unknown provider type', () => {
      it('falls back to manual capabilities', () => {
        const caps = getProviderCapabilities('nonexistent' as ProviderType);
        expect(caps.managesOwnStock).toBe(true);
        expect(caps.displayName).toBe('Manual / Self-Fulfilled');
      });
    });
  });
});
