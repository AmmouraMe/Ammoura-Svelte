import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkoutStore, copyShippingToBilling } from './checkout';
import type { CheckoutFormData, CheckoutValidationErrors } from '../types/checkout';
import type { AvailableShippingOption } from '../types/shipping';
import type { ShippingGroup } from '../utils/shippingGroups';

interface CheckoutState {
  formData: CheckoutFormData;
  currentStep: number;
  isSubmitting: boolean;
  validationErrors: CheckoutValidationErrors;
  availableShippingOptions: AvailableShippingOption[];
  loadingShippingOptions: boolean;
  shippingGroups: ShippingGroup[];
  shippingGroupsLoaded: boolean;
}

describe('Checkout Store', () => {
  beforeEach(() => {
    checkoutStore.reset();
  });

  describe('updateFormData', () => {
    it('should update form data', () => {
      const newData: Partial<CheckoutFormData> = {
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '9876543210',
          address: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'United States'
        }
      };

      checkoutStore.updateFormData(newData);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.shippingAddress.firstName).toBe('Jane');
      expect(state?.formData.shippingAddress.lastName).toBe('Smith');
      expect(state?.formData.shippingAddress.email).toBe('jane@example.com');
      unsubscribe();
    });

    it('should partially update form data', () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        }
      });

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.shippingAddress.firstName).toBe('John');
      expect(state?.formData.shippingAddress.lastName).toBe('Doe');
      unsubscribe();
    });
  });

  describe('setSameAsShipping', () => {
    it('should set sameAsShipping to true', () => {
      checkoutStore.setSameAsShipping(true);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.sameAsShipping).toBe(true);
      unsubscribe();
    });

    it('should set sameAsShipping to false', () => {
      checkoutStore.setSameAsShipping(false);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.sameAsShipping).toBe(false);
      unsubscribe();
    });
  });

  describe('validateForm', () => {
    it('should return errors for invalid form', () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'J',
          lastName: '',
          email: 'invalid',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        }
      });

      const errors = checkoutStore.validateForm();
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(errors.shippingAddress).toBeDefined();
    });

    it('should return no errors for valid form', () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      const errors = checkoutStore.validateForm();
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should update validation errors in store', () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'J',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        }
      });

      checkoutStore.validateForm();

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state).toBeDefined();
      expect(Object.keys(state!.validationErrors).length).toBeGreaterThan(0);
      expect(state?.validationErrors.shippingAddress).toBeDefined();
      unsubscribe();
    });
  });

  describe('submitOrder', () => {
    it('should fail with validation errors', async () => {
      const mockCartItems = [
        {
          id: 'prod-1',
          name: 'Test Product',
          price: 29.99,
          quantity: 2,
          image: '/test.jpg'
        }
      ];
      const result = await checkoutStore.submitOrder(mockCartItems, 59.98, 9.99, 5.6, 75.57);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Please fix the validation errors');
    });

    it('should succeed with valid form data', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      // Mock fetch for API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, url: 'https://checkout.stripe.com/pay/cs_test_123' })
      });

      const mockCartItems = [
        {
          id: 'prod-1',
          name: 'Test Product',
          price: 29.99,
          quantity: 2,
          image: '/test.jpg'
        }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 59.98, 9.99, 5.6, 75.57);

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.url).toBeDefined();
      }
    }, 10000);

    it('should set isSubmitting during submission', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      // Mock fetch for API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, url: 'https://checkout.stripe.com/pay/cs_test_123' })
      });

      const mockCartItems = [
        {
          id: 'prod-1',
          name: 'Test Product',
          price: 29.99,
          quantity: 2,
          image: '/test.jpg'
        }
      ];

      const submitPromise = checkoutStore.submitOrder(mockCartItems, 59.98, 9.99, 5.6, 75.57);

      // Check isSubmitting is true during submission
      let wasSubmitting = false;
      const unsubscribe = checkoutStore.subscribe((state) => {
        if (state.isSubmitting) {
          wasSubmitting = true;
        }
      });

      await submitPromise;
      unsubscribe();

      expect(wasSubmitting).toBe(true);
    }, 10000);
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        }
      });

      checkoutStore.setCurrentStep(3);

      checkoutStore.reset();

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.shippingAddress.firstName).toBe('');
      expect(state?.currentStep).toBe(1);
      expect(state?.isSubmitting).toBe(false);
      expect(Object.keys(state!.validationErrors)).toHaveLength(0);
      unsubscribe();
    });
  });

  describe('getCurrentStep and setCurrentStep', () => {
    it('should return current step', () => {
      const step = checkoutStore.getCurrentStep();
      expect(step).toBe(1);
    });

    it('should set current step', () => {
      checkoutStore.setCurrentStep(2);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.currentStep).toBe(2);
      unsubscribe();
    });

    it('should update and retrieve step', () => {
      checkoutStore.setCurrentStep(3);
      const step = checkoutStore.getCurrentStep();
      expect(step).toBe(3);
    });
  });

  describe('copyShippingToBilling', () => {
    it('should copy all fields from shipping to billing', () => {
      const shipping = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      };

      const billing = copyShippingToBilling(shipping);

      expect(billing.firstName).toBe(shipping.firstName);
      expect(billing.lastName).toBe(shipping.lastName);
      expect(billing.address).toBe(shipping.address);
      expect(billing.city).toBe(shipping.city);
      expect(billing.state).toBe(shipping.state);
      expect(billing.zipCode).toBe(shipping.zipCode);
      expect(billing.country).toBe(shipping.country);
    });

    it('should not include email and phone in billing address', () => {
      const shipping = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      };

      const billing = copyShippingToBilling(shipping);

      expect(billing).not.toHaveProperty('email');
      expect(billing).not.toHaveProperty('phone');
    });
  });

  describe('loadShippingGroups', () => {
    beforeEach(() => {
      checkoutStore.reset();
      vi.clearAllMocks();
    });

    it('should load shipping groups successfully with productOptions', async () => {
      const mockProductOptions = {
        'prod-1': [
          {
            id: 'ship-1',
            name: 'Standard',
            description: '5-7 days',
            price: 5.99,
            estimatedDaysMin: 5,
            estimatedDaysMax: 7,
            carrier: 'USPS',
            isDefault: true,
            isFreeShipping: false
          }
        ],
        'prod-2': [
          {
            id: 'ship-2',
            name: 'Express',
            description: '1-2 days',
            price: 15.99,
            estimatedDaysMin: 1,
            estimatedDaysMax: 2,
            carrier: 'FedEx',
            isDefault: false,
            isFreeShipping: false
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          options: [],
          hasPhysicalProducts: true,
          productOptions: mockProductOptions
        })
      });

      const cartItems = [
        {
          id: 'prod-1',
          name: 'Product 1',
          description: 'Test product 1',
          category: 'Test',
          price: 10,
          quantity: 1,
          image: '',
          stock: 10,
          tags: [],
          type: 'physical' as const
        },
        {
          id: 'prod-2',
          name: 'Product 2',
          description: 'Test product 2',
          category: 'Test',
          price: 20,
          quantity: 2,
          image: '',
          stock: 10,
          tags: [],
          type: 'physical' as const
        }
      ];

      await checkoutStore.loadShippingGroups(cartItems);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.shippingGroupsLoaded).toBe(true);
      expect(state?.loadingShippingOptions).toBe(false);
      unsubscribe();
    });

    it('should load shipping groups with fallback options for physical products', async () => {
      const mockOptions = [
        {
          id: 'ship-1',
          name: 'Standard',
          description: '5-7 days',
          price: 5.99,
          estimatedDaysMin: 5,
          estimatedDaysMax: 7,
          carrier: 'USPS',
          isDefault: true,
          isFreeShipping: false
        }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          options: mockOptions,
          hasPhysicalProducts: true
        })
      });

      const cartItems = [
        {
          id: 'prod-1',
          name: 'Product 1',
          description: 'Test product',
          category: 'Test',
          price: 10,
          quantity: 1,
          image: '',
          stock: 10,
          tags: [],
          type: 'physical' as const
        }
      ];

      await checkoutStore.loadShippingGroups(cartItems);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.shippingGroupsLoaded).toBe(true);
      expect(state?.loadingShippingOptions).toBe(false);
      unsubscribe();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to load' })
      });

      const cartItems = [
        {
          id: 'prod-1',
          name: 'Product 1',
          description: 'Test product',
          category: 'Test',
          price: 10,
          quantity: 1,
          image: '',
          stock: 10,
          tags: [],
          type: 'physical' as const
        }
      ];

      await checkoutStore.loadShippingGroups(cartItems);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.shippingGroups).toEqual([]);
      expect(state?.shippingGroupsLoaded).toBe(false);
      expect(state?.loadingShippingOptions).toBe(false);
      unsubscribe();
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const cartItems = [
        {
          id: 'prod-1',
          name: 'Product 1',
          description: 'Test product',
          category: 'Test',
          price: 10,
          quantity: 1,
          image: '',
          stock: 10,
          tags: [],
          type: 'physical' as const
        }
      ];

      await checkoutStore.loadShippingGroups(cartItems);

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.shippingGroups).toEqual([]);
      expect(state?.shippingGroupsLoaded).toBe(false);
      expect(state?.loadingShippingOptions).toBe(false);
      unsubscribe();
    });
  });

  describe('setShippingOptionForGroup', () => {
    it('should set shipping option for a specific group', () => {
      checkoutStore.setShippingOptionForGroup('group-1', 'option-1');

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.selectedShippingOptions['group-1']).toBe('option-1');
      unsubscribe();
    });

    it('should set shipping options for multiple groups', () => {
      checkoutStore.setShippingOptionForGroup('group-1', 'option-1');
      checkoutStore.setShippingOptionForGroup('group-2', 'option-2');

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.selectedShippingOptions['group-1']).toBe('option-1');
      expect(state?.formData.selectedShippingOptions['group-2']).toBe('option-2');
      unsubscribe();
    });

    it('should override existing shipping option for group', () => {
      checkoutStore.setShippingOptionForGroup('group-1', 'option-1');
      checkoutStore.setShippingOptionForGroup('group-1', 'option-2');

      let state: CheckoutState | undefined;
      const unsubscribe = checkoutStore.subscribe((s) => {
        state = s;
      });

      expect(state?.formData.selectedShippingOptions['group-1']).toBe('option-2');
      unsubscribe();
    });
  });

  describe('getTotalShippingCost', () => {
    it('should return 0 when no shipping groups are present', () => {
      const cost = checkoutStore.getTotalShippingCost();
      expect(cost).toBe(0);
    });
  });

  describe('submitOrder with shipping groups', () => {
    beforeEach(() => {
      checkoutStore.reset();
      vi.clearAllMocks();
    });

    it('should succeed when form is valid and API returns success', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, url: 'https://checkout.stripe.com/pay/cs_order-123' })
      });

      const mockCartItems = [
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 1, image: '/test.jpg' }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 29.99, 5.99, 2.0, 37.98);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_order-123');
    }, 10000);

    it('should handle API failure during order submission', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Payment failed' })
      });

      const mockCartItems = [
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 1, image: '/test.jpg' }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 29.99, 5.99, 2.0, 37.98);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should handle network errors during order submission', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const mockCartItems = [
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 1, image: '/test.jpg' }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 29.99, 5.99, 2.0, 37.98);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    }, 10000);

    it('should use billing address when sameAsShipping is false', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'Jane',
          lastName: 'Smith',
          address: '456 Oak Avenue',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        },
        sameAsShipping: false
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          url: 'https://checkout.stripe.com/pay/cs_order-billing-test'
        })
      });

      const mockCartItems = [
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 1, image: '/test.jpg' }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 29.99, 5.99, 2.0, 37.98);
      expect(result.success).toBe(true);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.billing_address.firstName).toBe('Jane');
      expect(body.billing_address.city).toBe('Chicago');
    }, 10000);

    it('should handle API returning success false with error message', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: 'Inventory unavailable' })
      });

      const mockCartItems = [
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 1, image: '/test.jpg' }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 29.99, 5.99, 2.0, 37.98);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Inventory unavailable');
    }, 10000);

    it('should handle non-Error exception in submitOrder catch', async () => {
      checkoutStore.updateFormData({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        paymentMethod: {
          type: 'credit-card',
          cardNumber: '4532015112830366',
          cardHolderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2027',
          cvv: '123'
        }
      });

      global.fetch = vi.fn().mockRejectedValue('string error');

      const mockCartItems = [
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 1, image: '/test.jpg' }
      ];

      const result = await checkoutStore.submitOrder(mockCartItems, 29.99, 5.99, 2.0, 37.98);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process order');
    }, 10000);
  });
});
