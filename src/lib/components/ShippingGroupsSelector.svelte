<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ShippingGroup } from '$lib/utils/shippingGroups';
  import type { AvailableShippingOption } from '$lib/types/shipping';
  import { money } from '$lib/i18n';

  export let shippingGroups: ShippingGroup[] = [];
  export let selectedOptions: Record<string, string> = {};
  export let errors: Record<string, string> = {};
  export let loading: boolean = false;

  const dispatch = createEventDispatcher<{
    groupSelectionChange: { groupId: string; option: AvailableShippingOption };
  }>();

  // Auto-select default options for each group when they load
  $: if (shippingGroups.length > 0) {
    shippingGroups.forEach((group) => {
      if (!group.isFree && !selectedOptions[group.id] && group.shippingOptions.length > 0) {
        const defaultOption = group.shippingOptions.find((opt) => opt.isDefault);
        if (defaultOption) {
          handleSelection(group.id, defaultOption);
        }
      }
    });
  }

  function handleSelection(groupId: string, option: AvailableShippingOption): void {
    dispatch('groupSelectionChange', { groupId, option });
  }

  function formatEstimatedDelivery(option: AvailableShippingOption): string {
    if (option.estimatedDaysMin && option.estimatedDaysMax) {
      return `${option.estimatedDaysMin}-${option.estimatedDaysMax} business days`;
    }
    return '';
  }

  function getGroupTitle(group: ShippingGroup, index: number): string {
    if (group.products.length === 1) {
      return group.products[0].name;
    }
    return `Shipping Group ${index + 1}`;
  }
</script>

<div class="shipping-groups-selector">
  <h3>Shipping Methods</h3>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading shipping options...</p>
    </div>
  {:else if shippingGroups.length === 0}
    <div class="empty-state">
      <p>No shipping required</p>
    </div>
  {:else}
    <div class="groups-container">
      {#each shippingGroups as group, groupIndex (group.id)}
        <div class="shipping-group">
          <div class="group-header">
            <h4>{getGroupTitle(group, groupIndex)}</h4>
            {#if group.products.length > 1}
              <span class="product-count">{group.products.length} items</span>
            {/if}
          </div>

          <div class="group-products">
            {#each group.products as product}
              <div class="product-item">
                {#if product.image}
                  <img src={product.image} alt={product.name} class="product-thumbnail" />
                {/if}
                <div class="product-info">
                  <span class="product-name">{product.name}</span>
                  <span class="product-quantity">Qty: {product.quantity}</span>
                </div>
              </div>
            {/each}
          </div>

          {#if group.isFree}
            <div class="free-shipping-notice">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Free Shipping</span>
            </div>
          {:else}
            <div class="options-list">
              {#each group.shippingOptions as option (option.id)}
                <label
                  class="shipping-option"
                  class:selected={selectedOptions[group.id] === option.id}
                >
                  <input
                    type="radio"
                    name="shipping-option-{group.id}"
                    value={option.id}
                    checked={selectedOptions[group.id] === option.id}
                    on:change={() => handleSelection(group.id, option)}
                    aria-label={option.name}
                  />
                  <div class="option-content">
                    <div class="option-header">
                      <div class="option-title">
                        <span class="option-name">{option.name}</span>
                        {#if option.carrier}
                          <span class="carrier-badge">{option.carrier}</span>
                        {/if}
                      </div>
                      <div class="option-price">
                        {#if option.isFreeShipping || option.price === 0}
                          <span class="free-badge">FREE</span>
                        {:else}
                          <span class="price">{$money(option.price)}</span>
                        {/if}
                      </div>
                    </div>
                    {#if option.description}
                      <p class="option-description">{option.description}</p>
                    {/if}
                    {#if option.estimatedDaysMin && option.estimatedDaysMax}
                      <p class="estimated-delivery">{formatEstimatedDelivery(option)}</p>
                    {/if}
                  </div>
                </label>
              {/each}
            </div>

            {#if errors[group.id]}
              <div class="error-message" role="alert">
                {errors[group.id]}
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .shipping-groups-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.25rem;
    transition: color var(--transition-normal);
  }

  .loading-state,
  .empty-state {
    padding: 2rem;
    text-align: center;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    color: var(--color-text-secondary);
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  .spinner {
    border: 3px solid var(--color-border-secondary);
    border-top: 3px solid var(--color-primary);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .groups-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .shipping-group {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border-primary);
    transition: border-color var(--transition-normal);
  }

  .group-header h4 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.125rem;
    font-weight: 600;
    transition: color var(--transition-normal);
  }

  .product-count {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    transition:
      color var(--transition-normal),
      background-color var(--transition-normal);
  }

  .group-products {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .product-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: var(--color-bg-primary);
    border-radius: 4px;
    transition: background-color var(--transition-normal);
  }

  .product-thumbnail {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--color-border-secondary);
    transition: border-color var(--transition-normal);
  }

  .product-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .product-name {
    font-size: 0.875rem;
    color: var(--color-text-primary);
    font-weight: 500;
    transition: color var(--transition-normal);
  }

  .product-quantity {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    transition: color var(--transition-normal);
  }

  .free-shipping-notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--color-success-bg);
    color: var(--color-success);
    border-radius: 6px;
    font-weight: 500;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  .free-shipping-notice svg {
    flex-shrink: 0;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .shipping-option {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-primary);
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .shipping-option:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px var(--color-shadow-light);
  }

  .shipping-option.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
  }

  .shipping-option input[type='radio'] {
    margin-top: 0.25rem;
    cursor: pointer;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .option-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .option-title {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option-name {
    font-weight: 600;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .carrier-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    border-radius: 4px;
    font-weight: 500;
    width: fit-content;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  .option-price {
    text-align: right;
  }

  .price {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .free-badge {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-success);
    background: var(--color-success-bg);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    transition:
      color var(--transition-normal),
      background-color var(--transition-normal);
  }

  .option-description {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .estimated-delivery {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    transition: color var(--transition-normal);
  }

  .error-message {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-radius: 4px;
    font-size: 0.875rem;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .shipping-groups-selector {
      gap: 0.75rem;
    }

    h3 {
      font-size: 1.125rem;
    }

    .shipping-group {
      padding: 1rem;
    }

    .group-header h4 {
      font-size: 1rem;
    }

    .option-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .option-price {
      text-align: left;
    }

    .product-item {
      padding: 0.375rem;
    }

    .product-thumbnail {
      width: 32px;
      height: 32px;
    }
  }
</style>
