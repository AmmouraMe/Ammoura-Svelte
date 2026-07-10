import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Product, CartItem } from '../types/index.js';
import { toastStore } from './toast.js';

/**
 * Log cart action to backend for activity tracking
 */
async function logCartAction(
  action: 'add' | 'remove' | 'update' | 'clear',
  productId?: string,
  productName?: string,
  quantity?: number,
  price?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!browser) return;

  try {
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, productId, productName, quantity, price, metadata })
    });
  } catch (error) {
    // Silently fail - logging shouldn't break cart functionality
    console.debug('Failed to log cart action:', error);
  }
}

// Initialize with persisted data if available
const getInitialCartItems = (): CartItem[] => {
  if (browser) {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      return [];
    }
  }
  return [];
};

export const cartItems: Writable<CartItem[]> = writable(getInitialCartItems());

// Helper to get current cart state
let currentCartItems: CartItem[] = [];
cartItems.subscribe((items) => {
  currentCartItems = items;
});

// Helper to get item by ID (and, if the product has variants, the selected variant) from current cart state
function getItemByIdHelper(productId: string, variantId?: string): CartItem | undefined {
  return currentCartItems.find((item) => item.id === productId && item.variantId === variantId);
}

// Persist cart changes to localStorage
if (browser) {
  cartItems.subscribe((items) => {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  });
}

export interface CartStore {
  subscribe: typeof cartItems.subscribe;
  addItem: (product: Product | CartItem, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clear: () => void;
  clearCart: () => void;
  getItemQuantity: (items: CartItem[], productId: string, variantId?: string) => number;
  getTotalItems: (items: CartItem[]) => number;
  getTotalPrice: (items: CartItem[]) => number;
}

export const cartStore: CartStore = {
  subscribe: cartItems.subscribe,

  addItem: (product: Product | CartItem, quantity: number = 1): void => {
    cartItems.update((items: CartItem[]) => {
      // Customized products (zones or fields) are always added as new line items
      const cartProduct = product as CartItem;
      const hasCustomizations =
        Array.isArray(cartProduct.customizations) && cartProduct.customizations.length > 0;
      const hasFieldValues =
        Array.isArray(cartProduct.fieldValues) && cartProduct.fieldValues.length > 0;
      const hasEquipmentValues =
        Array.isArray(cartProduct.equipmentValues) && cartProduct.equipmentValues.length > 0;

      if (hasCustomizations || hasFieldValues || hasEquipmentValues) {
        const newItem: CartItem = { ...product, quantity };
        if (hasCustomizations) {
          newItem.customizations = cartProduct.customizations;
        }
        if (hasFieldValues) {
          newItem.fieldValues = cartProduct.fieldValues;
        }
        if (hasEquipmentValues) {
          newItem.equipmentValues = cartProduct.equipmentValues;
        }
        return [...items, newItem];
      }

      const existingItem = items.find(
        (item) =>
          item.id === product.id &&
          item.variantId === cartProduct.variantId &&
          !item.customizations?.length &&
          !item.fieldValues?.length &&
          !item.equipmentValues?.length
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        return items;
      } else {
        return [...items, { ...product, quantity }];
      }
    });

    // Log cart action
    logCartAction('add', product.id, product.name, quantity, product.price);

    // Show toast notification with link to cart
    const message = `${product.name} added to cart`;
    toastStore.success(message, 4000, {
      text: 'View Cart',
      href: '/cart'
    });
  },

  removeItem: (productId: string, variantId?: string): void => {
    const item = getItemByIdHelper(productId, variantId);
    cartItems.update((items: CartItem[]) =>
      items.filter((item) => !(item.id === productId && item.variantId === variantId))
    );

    // Log cart action
    if (item) {
      logCartAction('remove', item.id, item.name, item.quantity, item.price);
    }
  },

  updateQuantity: (productId: string, quantity: number, variantId?: string): void => {
    if (quantity <= 0) {
      cartStore.removeItem(productId, variantId);
      return;
    }

    const item = getItemByIdHelper(productId, variantId);
    cartItems.update((items: CartItem[]) => {
      const item = items.find((item) => item.id === productId && item.variantId === variantId);
      if (item) {
        item.quantity = quantity;
      }
      return items;
    });

    // Log cart action
    if (item) {
      logCartAction('update', item.id, item.name, quantity, item.price);
    }
  },

  clear: (): void => {
    const itemsCount = currentCartItems.length;
    cartItems.set([]);

    // Log cart action
    logCartAction('clear', undefined, undefined, undefined, undefined, {
      itemsCleared: itemsCount
    });
  },

  // Alias for clear() for better readability
  clearCart: (): void => {
    cartStore.clear();
  },

  getItemQuantity: (items: CartItem[], productId: string, variantId?: string): number => {
    const item = items.find((item) => item.id === productId && item.variantId === variantId);
    return item ? item.quantity : 0;
  },

  getTotalItems: (items: CartItem[]): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalPrice: (items: CartItem[]): number => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }
};
