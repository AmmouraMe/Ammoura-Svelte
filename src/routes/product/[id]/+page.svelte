<script lang="ts">
  import Button from '../../../lib/components/Button.svelte';
  import ProductMediaGallery from '../../../lib/components/ProductMediaGallery.svelte';
  import ProductCustomizer from '../../../lib/components/ProductCustomizer.svelte';
  import ProductCustomizationFields from '../../../lib/components/ProductCustomizationFields.svelte';
  import { cartStore, cartItems } from '../../../lib/stores/cart.ts';
  import { calculateTotalStock } from '$lib/utils/stock';
  import type { CartItemCustomization, CartItemFieldValue } from '$lib/types/customization';
  import type { Product } from '$lib/types';

  interface ShippingOptionDisplay {
    shippingOptionId: string;
    optionName: string;
    isDefault: boolean;
    priceOverride: number | null;
    thresholdOverride: number | null;
    estimatedDaysMin: number | null | undefined;
    estimatedDaysMax: number | null | undefined;
    carrier: string | null | undefined;
  }

  export let data;

  const { product, media } = data;
  const customizationZones = data.customizationZones || [];
  const customizationFields = data.customizationFields || [];

  let customizations: CartItemCustomization[] = [];
  let fieldValues: CartItemFieldValue[] = [];

  $: hasCustomizationZones = customizationZones.length > 0;
  $: hasCustomizationFields = customizationFields.length > 0;
  $: isCustomizable = hasCustomizationZones || hasCustomizationFields;
  $: fieldPriceModifier = fieldValues.reduce(
    (sum: number, fv: CartItemFieldValue) => sum + fv.priceModifier,
    0
  );
  $: displayPrice = product.price + fieldPriceModifier;
  $: cartQuantity = cartStore.getItemQuantity($cartItems, product.id);
  $: totalStock = calculateTotalStock(product.fulfillmentOptions);
  $: hasShippingOptions =
    product.type === 'physical' && product.shippingOptions && product.shippingOptions.length > 0;

  // Check all required fields are filled
  $: allRequiredFieldsFilled = customizationFields
    .filter((f: { required: boolean }) => f.required)
    .every((f: { id: string }) => {
      const val = fieldValues.find((v) => v.fieldId === f.id);
      return val && val.value.trim().length > 0;
    });

  $: canAddToCart = totalStock > 0 && (!hasCustomizationFields || allRequiredFieldsFilled);

  function addToCart(): void {
    const hasZoneCustomizations = hasCustomizationZones && customizations.length > 0;
    const hasFieldCustomizations = fieldValues.length > 0;

    const productToAdd = { ...product } as Product & {
      customizations?: CartItemCustomization[];
      fieldValues?: CartItemFieldValue[];
    };

    if (hasZoneCustomizations) {
      productToAdd.customizations = customizations;
    }
    if (hasFieldCustomizations) {
      productToAdd.fieldValues = fieldValues;
    }

    cartStore.addItem(productToAdd, 1);
  }

  function handleCustomizationsChange(e: CustomEvent<CartItemCustomization[]>): void {
    customizations = e.detail;
  }

  function handleFieldValuesChange(e: CustomEvent<CartItemFieldValue[]>): void {
    fieldValues = e.detail;
  }

  function incrementCartQuantity(): void {
    cartStore.updateQuantity(product.id, cartQuantity + 1);
  }

  function decrementCartQuantity(): void {
    cartStore.updateQuantity(product.id, cartQuantity - 1);
  }

  function formatEstimatedDelivery(option: ShippingOptionDisplay): string {
    if (option.estimatedDaysMin && option.estimatedDaysMax) {
      return `${option.estimatedDaysMin}-${option.estimatedDaysMax} business days`;
    }
    return '';
  }

  function getShippingPrice(option: ShippingOptionDisplay): number {
    return option.priceOverride !== null ? option.priceOverride : 0;
  }
</script>

<svelte:head>
  <title>{product.name} - {data.storeName || 'Hermes eCommerce'}</title>
  <meta name="description" content={product.description} />
</svelte:head>

<div class="product-detail">
  <div class="product-media-section">
    {#if hasCustomizationZones}
      <ProductCustomizer
        productImage={product.image}
        productName={product.name}
        {media}
        zones={customizationZones}
        on:customizationsChange={handleCustomizationsChange}
      />
    {:else}
      <ProductMediaGallery {media} productName={product.name} fallbackImage={product.image} />
    {/if}
  </div>

  <div class="product-info">
    <span class="category">{product.category}</span>
    <h1>{product.name}</h1>
    <p class="description">{product.description}</p>

    <div class="price-section">
      <div class="price-display">
        <span class="price">${displayPrice.toFixed(2)}</span>
        {#if fieldPriceModifier > 0}
          <span class="base-price">(Base: ${product.price.toFixed(2)})</span>
        {/if}
      </div>
      <span class="stock">{totalStock} in stock</span>
    </div>

    {#if hasCustomizationFields}
      <ProductCustomizationFields
        fields={customizationFields}
        on:fieldValuesChange={handleFieldValuesChange}
      />
    {/if}

    {#if hasShippingOptions}
      <div class="shipping-info">
        <h3>Available Shipping Options</h3>
        <div class="shipping-options-list">
          {#each product.shippingOptions as option}
            <div class="shipping-option-item">
              <div class="shipping-option-header">
                <span class="shipping-option-name">{option.optionName}</span>
                {#if option.carrier}
                  <span class="shipping-carrier">{option.carrier}</span>
                {/if}
              </div>
              <div class="shipping-option-details">
                {#if formatEstimatedDelivery(option)}
                  <span class="delivery-time">{formatEstimatedDelivery(option)}</span>
                {/if}
                {#if getShippingPrice(option) > 0}
                  <span class="shipping-price">+${getShippingPrice(option).toFixed(2)}</span>
                {:else}
                  <span class="shipping-free">FREE</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <p class="shipping-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2" />
            <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round" />
          </svg>
          You'll choose your preferred shipping method at checkout
        </p>
      </div>
    {/if}

    <div class="purchase-section">
      {#if cartQuantity === 0 || isCustomizable}
        <Button variant="primary" disabled={!canAddToCart} on:click={addToCart}>
          {totalStock === 0
            ? 'Out of Stock'
            : isCustomizable
              ? 'Add Customized Item to Cart'
              : 'Add to Cart'}
        </Button>
      {:else}
        <div class="quantity-controls">
          <button
            class="quantity-btn"
            on:click={decrementCartQuantity}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span class="quantity-display" aria-live="polite">{cartQuantity}</span>
          <button
            class="quantity-btn"
            on:click={incrementCartQuantity}
            disabled={cartQuantity >= totalStock}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .product-detail {
    background: var(--color-bg-primary);
    border-radius: 8px;
    box-shadow: 0 2px 10px var(--color-shadow-light);
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 2rem;
    transition:
      background-color var(--transition-normal),
      box-shadow var(--transition-normal);
  }

  .product-media-section {
    display: flex;
    flex-direction: column;
  }

  .product-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .category {
    color: var(--color-text-tertiary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color var(--transition-normal);
  }

  h1 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 2rem;
    transition: color var(--transition-normal);
  }

  .description {
    color: var(--color-text-secondary);
    line-height: 1.6;
    font-size: 1.1rem;
    transition: color var(--transition-normal);
  }

  .price-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-top: 1px solid var(--color-border-primary);
    border-bottom: 1px solid var(--color-border-primary);
    transition: border-color var(--transition-normal);
  }

  .price {
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-primary);
    transition: color var(--transition-normal);
  }

  .price-display {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .base-price {
    font-size: 0.9rem;
    color: var(--color-text-tertiary);
  }

  .stock {
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .shipping-info {
    padding: 1.5rem;
    background: var(--color-bg-accent);
    border-radius: 8px;
    border: 1px solid var(--color-border-secondary);
    transition: all var(--transition-normal);
  }

  .shipping-info h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--color-text-primary);
  }

  .shipping-options-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .shipping-option-item {
    padding: 0.75rem;
    background: var(--color-bg-primary);
    border-radius: 6px;
    border: 1px solid var(--color-border-secondary);
    transition: all var(--transition-normal);
  }

  .shipping-option-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .shipping-option-name {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .shipping-carrier {
    padding: 0.25rem 0.5rem;
    background: var(--color-bg-accent);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .shipping-option-details {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .delivery-time {
    color: var(--color-text-secondary);
  }

  .shipping-price {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .shipping-free {
    padding: 0.25rem 0.5rem;
    background: var(--color-success, #10b981);
    color: white;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .shipping-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.75rem;
    background: var(--color-bg-primary);
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .shipping-note svg {
    flex-shrink: 0;
  }

  .purchase-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: auto;
  }

  .quantity-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: var(--color-bg-accent);
    border-radius: 0.25rem;
    transition: background-color var(--transition-normal);
  }

  .quantity-btn {
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border-secondary);
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      transform var(--transition-fast);
  }

  .quantity-btn:hover:not(:disabled) {
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
    transform: scale(1.1);
  }

  .quantity-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .quantity-display {
    min-width: 32px;
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  @media (max-width: 768px) {
    .product-detail {
      grid-template-columns: 1fr;
      padding: 1rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .price {
      font-size: 1.5rem;
    }
  }
</style>
