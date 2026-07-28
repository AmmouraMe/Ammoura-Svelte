<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AvailableShippingOption } from '$lib/types/shipping';
  import { money } from '$lib/i18n';

  export let shippingOptions: AvailableShippingOption[];
  export let selectedOptionId: string | null = null;
  export let error: string | null = null;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher<{ selectionChange: AvailableShippingOption }>();

  // Auto-select default option when options load if no selection
  $: if (!selectedOptionId && shippingOptions.length > 0) {
    const defaultOption = shippingOptions.find((opt) => opt.isDefault);
    if (defaultOption) {
      selectedOptionId = defaultOption.id;
      dispatch('selectionChange', defaultOption);
    }
  }

  function handleSelection(option: AvailableShippingOption): void {
    selectedOptionId = option.id;
    dispatch('selectionChange', option);
  }

  function formatEstimatedDelivery(option: AvailableShippingOption): string {
    if (option.estimatedDaysMin && option.estimatedDaysMax) {
      return `${option.estimatedDaysMin}-${option.estimatedDaysMax} business days`;
    }
    return '';
  }
</script>

<div class="shipping-options-selector">
  <h3>Shipping Method</h3>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading shipping options...</p>
    </div>
  {:else if shippingOptions.length === 0}
    <div class="empty-state">
      <p>No shipping options available</p>
    </div>
  {:else}
    <div class="options-list">
      {#each shippingOptions as option (option.id)}
        <label class="shipping-option" class:selected={selectedOptionId === option.id}>
          <input
            type="radio"
            name="shipping-option"
            value={option.id}
            checked={selectedOptionId === option.id}
            on:change={() => handleSelection(option)}
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
  {/if}

  {#if error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}
</div>

<style>
  .shipping-options-selector {
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
    background: var(--color-bg-accent);
  }

  .shipping-option.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-alpha);
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
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .option-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 1.05rem;
  }

  .carrier-badge {
    padding: 0.25rem 0.5rem;
    background: var(--color-bg-accent);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .option-price {
    flex-shrink: 0;
  }

  .price {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
  }

  .free-badge {
    padding: 0.25rem 0.75rem;
    background: var(--color-success, #10b981);
    color: white;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.875rem;
    text-transform: uppercase;
  }

  .option-description {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .estimated-delivery {
    margin: 0;
    color: var(--color-text-tertiary);
    font-size: 0.85rem;
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: var(--color-error-bg, #fee);
    color: var(--color-error, #dc2626);
    border-radius: 6px;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .option-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .option-price {
      align-self: flex-start;
    }
  }
</style>
