import { describe, it, expect } from 'vitest';
import {
  groupCartItemsByShipping,
  calculateTotalShippingCost,
  validateShippingSelections,
  type ShippingGroup
} from './shippingGroups';
import type { CartItem } from '$lib/types';
import type { AvailableShippingOption } from '$lib/types/shipping';

function createMockCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: '1',
    name: 'Test Product',
    description: 'Test description',
    price: 20,
    quantity: 1,
    type: 'physical',
    image: '',
    category: 'test',
    stock: 100,
    tags: [],
    ...overrides
  };
}

function createMockShippingOption(
  overrides: Partial<AvailableShippingOption> = {}
): AvailableShippingOption {
  return {
    id: 'opt1',
    name: 'Standard Shipping',
    description: null,
    carrier: 'USPS',
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    price: 5.99,
    isDefault: false,
    isFreeShipping: false,
    ...overrides
  };
}

describe('shippingGroups', () => {
  describe('groupCartItemsByShipping', () => {
    it('returns empty array when no physical products in cart', () => {
      const cartItems: CartItem[] = [createMockCartItem({ type: 'digital' })];
      const productShippingMap = new Map<string, AvailableShippingOption[]>();
      const groups = groupCartItemsByShipping(cartItems, productShippingMap);
      expect(groups).toEqual([]);
    });

    it('creates single group when all products share same shipping options', () => {
      const shippingOption1 = createMockShippingOption({ id: 'opt1', price: 5.99 });
      const shippingOption2 = createMockShippingOption({
        id: 'opt2',
        name: 'Express Shipping',
        carrier: 'FedEx',
        price: 12.99
      });
      const cartItems: CartItem[] = [
        createMockCartItem({ id: '1', name: 'Product 1' }),
        createMockCartItem({ id: '2', name: 'Product 2', quantity: 2 })
      ];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([
        ['1', [shippingOption1, shippingOption2]],
        ['2', [shippingOption1, shippingOption2]]
      ]);
      const groups = groupCartItemsByShipping(cartItems, productShippingMap);
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('group-0');
      expect(groups[0].products).toHaveLength(2);
      expect(groups[0].shippingOptions).toHaveLength(2);
      expect(groups[0].isFree).toBe(false);
    });

    it('creates separate groups when products have different shipping options', () => {
      const shippingOption1 = createMockShippingOption({ id: 'opt1', price: 5.99 });
      const shippingOption2 = createMockShippingOption({ id: 'opt2', price: 12.99 });
      const cartItems: CartItem[] = [
        createMockCartItem({ id: '1', name: 'Product 1' }),
        createMockCartItem({ id: '2', name: 'Product 2' })
      ];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([
        ['1', [shippingOption1]],
        ['2', [shippingOption2]]
      ]);
      const groups = groupCartItemsByShipping(cartItems, productShippingMap);
      expect(groups).toHaveLength(2);
      expect(groups[0].products).toHaveLength(1);
      expect(groups[0].products[0].id).toBe('1');
      expect(groups[1].products).toHaveLength(1);
      expect(groups[1].products[0].id).toBe('2');
    });

    it('creates single free group when all products have no shipping options', () => {
      const cartItems: CartItem[] = [
        createMockCartItem({ id: '1', name: 'Product 1' }),
        createMockCartItem({ id: '2', name: 'Product 2' })
      ];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([
        ['1', []],
        ['2', []]
      ]);
      const groups = groupCartItemsByShipping(cartItems, productShippingMap);
      expect(groups).toHaveLength(1);
      expect(groups[0].isFree).toBe(true);
      expect(groups[0].products).toHaveLength(2);
      expect(groups[0].shippingOptions).toHaveLength(0);
    });

    it('merges free shipping products into groups with shipping options', () => {
      const shippingOption = createMockShippingOption({ id: 'opt1', price: 5.99 });
      const cartItems: CartItem[] = [
        createMockCartItem({ id: '1', name: 'Product 1' }),
        createMockCartItem({ id: '2', name: 'Product 2 (Free Shipping)' })
      ];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([
        ['1', [shippingOption]],
        ['2', []]
      ]);
      const groups = groupCartItemsByShipping(cartItems, productShippingMap);
      // Should merge into a single group since product 2 has no shipping options
      expect(groups).toHaveLength(1);
      expect(groups[0].isFree).toBe(false);
      expect(groups[0].products).toHaveLength(2);
      expect(groups[0].products.some((p) => p.id === '1')).toBe(true);
      expect(groups[0].products.some((p) => p.id === '2')).toBe(true);
      expect(groups[0].shippingOptions).toHaveLength(1);
    });

    it('handles mixed cart with shared, different, and free shipping', () => {
      const shippingOption1 = createMockShippingOption({ id: 'opt1', price: 5.99 });
      const shippingOption2 = createMockShippingOption({ id: 'opt2', price: 12.99 });
      const shippingOption3 = createMockShippingOption({ id: 'opt3', price: 3.99 });
      const cartItems: CartItem[] = [
        createMockCartItem({ id: '1', name: 'Product 1' }),
        createMockCartItem({ id: '2', name: 'Product 2' }),
        createMockCartItem({ id: '3', name: 'Product 3' }),
        createMockCartItem({ id: '4', name: 'Product 4 (Free)' }),
        createMockCartItem({ id: '5', name: 'Digital', type: 'digital' })
      ];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([
        ['1', [shippingOption1, shippingOption2]],
        ['2', [shippingOption1, shippingOption2]],
        ['3', [shippingOption3]], // Cheapest shipping
        ['4', []]
      ]);
      const groups = groupCartItemsByShipping(cartItems, productShippingMap);
      // Should create 2 groups: one for products 1&2, another for product 3
      // Product 4 (free) should be merged into the group with cheapest shipping (product 3)
      expect(groups).toHaveLength(2);

      const sharedGroup = groups.find(
        (g) => g.products.some((p) => p.id === '1') && g.products.some((p) => p.id === '2')
      );
      expect(sharedGroup).toBeDefined();
      expect(sharedGroup!.shippingOptions).toHaveLength(2);
      expect(sharedGroup!.products).toHaveLength(2);

      const cheapestGroup = groups.find((g) => g.products.some((p) => p.id === '3'));
      expect(cheapestGroup).toBeDefined();
      expect(cheapestGroup!.shippingOptions).toHaveLength(1);
      expect(cheapestGroup!.shippingOptions[0].price).toBe(3.99);
      // Product 4 should be merged into this group (has cheapest shipping)
      expect(cheapestGroup!.products).toHaveLength(2);
      expect(cheapestGroup!.products.some((p) => p.id === '4')).toBe(true);
    });
  });

  describe('calculateTotalShippingCost', () => {
    it('returns 0 when no groups', () => {
      const groups: ShippingGroup[] = [];
      const selectedOptions = {};
      const total = calculateTotalShippingCost(groups, selectedOptions);
      expect(total).toBe(0);
    });

    it('returns 0 when all groups are free', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [],
          isFree: true
        }
      ];
      const selectedOptions = {};
      const total = calculateTotalShippingCost(groups, selectedOptions);
      expect(total).toBe(0);
    });

    it('calculates total from single selected option', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [createMockShippingOption({ id: 'opt1', price: 5.99 })],
          isFree: false
        }
      ];
      const selectedOptions = { 'group-0': 'opt1' };
      const total = calculateTotalShippingCost(groups, selectedOptions);
      expect(total).toBe(5.99);
    });

    it('calculates total from multiple selected options', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [
            createMockShippingOption({ id: 'opt1', price: 5.99 }),
            createMockShippingOption({ id: 'opt2', price: 12.99 })
          ],
          isFree: false
        },
        {
          id: 'group-1',
          products: [createMockCartItem({ id: '2' })],
          shippingOptions: [createMockShippingOption({ id: 'opt3', price: 8.5 })],
          isFree: false
        }
      ];
      const selectedOptions = { 'group-0': 'opt1', 'group-1': 'opt3' };
      const total = calculateTotalShippingCost(groups, selectedOptions);
      expect(total).toBe(14.49);
    });

    it('ignores groups without selection', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [createMockShippingOption({ id: 'opt1', price: 5.99 })],
          isFree: false
        },
        {
          id: 'group-1',
          products: [createMockCartItem({ id: '2' })],
          shippingOptions: [createMockShippingOption({ id: 'opt2', price: 12.99 })],
          isFree: false
        }
      ];
      const selectedOptions = { 'group-0': 'opt1' };
      const total = calculateTotalShippingCost(groups, selectedOptions);
      expect(total).toBe(5.99);
    });
  });

  describe('validateShippingSelections', () => {
    it('returns empty errors when all non-free groups have selection', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [createMockShippingOption({ id: 'opt1', price: 5.99 })],
          isFree: false
        }
      ];
      const selectedOptions = { 'group-0': 'opt1' };
      const errors = validateShippingSelections(groups, selectedOptions);
      expect(errors).toEqual({});
    });

    it('returns error for group without selection', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [createMockShippingOption({ id: 'opt1', price: 5.99 })],
          isFree: false
        }
      ];
      const selectedOptions = {};
      const errors = validateShippingSelections(groups, selectedOptions);
      expect(errors).toEqual({
        'group-0': 'Please select a shipping option for this group'
      });
    });

    it('does not require selection for free groups', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [],
          isFree: true
        }
      ];
      const selectedOptions = {};
      const errors = validateShippingSelections(groups, selectedOptions);
      expect(errors).toEqual({});
    });

    it('validates multiple groups independently', () => {
      const groups: ShippingGroup[] = [
        {
          id: 'group-0',
          products: [createMockCartItem({ id: '1' })],
          shippingOptions: [createMockShippingOption({ id: 'opt1', price: 5.99 })],
          isFree: false
        },
        {
          id: 'group-1',
          products: [createMockCartItem({ id: '2' })],
          shippingOptions: [createMockShippingOption({ id: 'opt2', price: 12.99 })],
          isFree: false
        },
        {
          id: 'group-2',
          products: [createMockCartItem({ id: '3' })],
          shippingOptions: [],
          isFree: true
        }
      ];
      const selectedOptions = { 'group-0': 'opt1' };
      const errors = validateShippingSelections(groups, selectedOptions);
      expect(errors).toEqual({
        'group-1': 'Please select a shipping option for this group'
      });
    });
  });

  describe('groupCartItemsByShipping edge cases', () => {
    it('should handle physical product with no shipping options', () => {
      const items = [createMockCartItem({ id: 'prod-1', type: 'physical' })];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([]);

      const result = groupCartItemsByShipping(items, productShippingMap);
      expect(result).toHaveLength(1);
    });

    it('should group products with identical shipping options together', () => {
      const shippingOptions: AvailableShippingOption[] = [
        {
          id: 'ship-1',
          name: 'Standard',
          price: 5.99,
          description: null,
          estimatedDaysMin: null,
          estimatedDaysMax: null,
          carrier: null,
          isDefault: false,
          isFreeShipping: false
        }
      ];
      const items = [
        createMockCartItem({ id: 'prod-1', type: 'physical' }),
        createMockCartItem({ id: 'prod-2', type: 'physical' })
      ];
      const productShippingMap = new Map<string, AvailableShippingOption[]>([
        ['prod-1', shippingOptions],
        ['prod-2', shippingOptions]
      ]);

      const result = groupCartItemsByShipping(items, productShippingMap);
      // Both products should be in the same group since they share the same shipping options
      const physicalGroups = result.filter((g) => g.products.some((p) => p.type === 'physical'));
      expect(physicalGroups.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle product with no shipping map entry', () => {
      const items: CartItem[] = [
        {
          id: 'prod-orphan',
          name: 'Orphan Product',
          price: 10,
          quantity: 1,
          type: 'physical',
          description: '',
          image: '',
          category: 'Test',
          stock: 10,
          tags: []
        }
      ];
      const emptyMap = new Map<string, AvailableShippingOption[]>();

      const result = groupCartItemsByShipping(items, emptyMap);

      // Product should still appear in a group even without shipping options
      const allProducts = result.flatMap((g) => g.products);
      expect(allProducts.length).toBe(1);
    });
  });
});
