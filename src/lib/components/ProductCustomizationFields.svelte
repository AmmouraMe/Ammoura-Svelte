<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProductCustomizationField, CartItemFieldValue } from '$lib/types/customization';

  export let fields: ProductCustomizationField[] = [];
  export let initialValues: CartItemFieldValue[] = [];

  const dispatch = createEventDispatcher<{ fieldValuesChange: CartItemFieldValue[] }>();

  // Initialize values from defaults or initial values
  let values: Record<string, string> = {};

  $: {
    const newValues: Record<string, string> = {};
    for (const field of fields) {
      const initial = initialValues.find((v) => v.fieldId === field.id);
      newValues[field.id] = initial?.value ?? values[field.id] ?? field.defaultValue ?? '';
    }
    values = newValues;
  }

  $: totalPriceModifier = fields.reduce((sum, field) => {
    const val = values[field.id] || '';
    if (val && val.length > 0) {
      return sum + field.priceModifier;
    }
    return sum;
  }, 0);

  $: allRequiredFilled = fields
    .filter((f) => f.required)
    .every((f) => {
      const val = values[f.id] || '';
      return val.trim().length > 0;
    });

  function handleChange(fieldId: string, value: string): void {
    values[fieldId] = value;
    values = { ...values };
    emitValues();
  }

  function emitValues(): void {
    const fieldValues: CartItemFieldValue[] = fields
      .filter((field) => {
        const val = values[field.id] || '';
        return val.trim().length > 0;
      })
      .map((field) => ({
        fieldId: field.id,
        fieldName: field.name,
        fieldType: field.fieldType,
        value: values[field.id],
        priceModifier: field.priceModifier
      }));

    dispatch('fieldValuesChange', fieldValues);
  }

  function formatPrice(val: number): string {
    return val > 0 ? `+$${val.toFixed(2)}` : '';
  }
</script>

<div class="customization-fields">
  <h3 class="fields-heading">Personalize Your Product</h3>

  {#each fields as field (field.id)}
    <div class="field-group">
      <label for="field-{field.id}" class="field-label">
        {field.name}
        {#if field.required}
          <span class="required-marker">*</span>
        {/if}
        {#if field.priceModifier > 0}
          <span class="price-modifier">{formatPrice(field.priceModifier)}</span>
        {/if}
      </label>

      {#if field.fieldType === 'text'}
        <input
          id="field-{field.id}"
          type="text"
          value={values[field.id] || ''}
          on:input={(e) => handleChange(field.id, e.currentTarget.value)}
          placeholder={field.placeholder || ''}
          maxlength={field.maxLength || undefined}
          required={field.required}
        />
        {#if field.maxLength}
          <span class="char-count">
            {(values[field.id] || '').length}/{field.maxLength}
          </span>
        {/if}
      {:else if field.fieldType === 'textarea'}
        <textarea
          id="field-{field.id}"
          value={values[field.id] || ''}
          on:input={(e) => handleChange(field.id, e.currentTarget.value)}
          placeholder={field.placeholder || ''}
          maxlength={field.maxLength || undefined}
          required={field.required}
          rows="3"
        ></textarea>
        {#if field.maxLength}
          <span class="char-count">
            {(values[field.id] || '').length}/{field.maxLength}
          </span>
        {/if}
      {:else if field.fieldType === 'select'}
        <select
          id="field-{field.id}"
          value={values[field.id] || ''}
          on:change={(e) => handleChange(field.id, e.currentTarget.value)}
          required={field.required}
        >
          {#if !field.required}
            <option value="">— Select —</option>
          {/if}
          {#each field.options as option}
            <option value={option}>{option}</option>
          {/each}
        </select>
      {:else if field.fieldType === 'color'}
        <div class="color-input-wrapper">
          <input
            id="field-{field.id}"
            type="color"
            value={values[field.id] || '#000000'}
            on:input={(e) => handleChange(field.id, e.currentTarget.value)}
          />
          <span class="color-value">{values[field.id] || '#000000'}</span>
        </div>
      {:else if field.fieldType === 'number'}
        <input
          id="field-{field.id}"
          type="number"
          value={values[field.id] || ''}
          on:input={(e) => handleChange(field.id, e.currentTarget.value)}
          placeholder={field.placeholder || ''}
          min={field.minValue ?? undefined}
          max={field.maxValue ?? undefined}
          required={field.required}
        />
      {/if}
    </div>
  {/each}

  {#if totalPriceModifier > 0}
    <div class="price-summary">
      Customization adds <strong>${totalPriceModifier.toFixed(2)}</strong> to the price
    </div>
  {/if}

  {#if !allRequiredFilled}
    <p class="required-notice">Please fill in all required fields before adding to cart</p>
  {/if}
</div>

<style>
  .customization-fields {
    padding: 1rem;
    background: var(--color-bg-accent, #f8f9fa);
    border-radius: 8px;
    border: 1px solid var(--color-border-secondary, #eee);
  }

  .fields-heading {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: var(--color-text-primary, #333);
  }

  .field-group {
    margin-bottom: 1rem;
    position: relative;
  }

  .field-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
    color: var(--color-text-primary, #333);
  }

  .required-marker {
    color: var(--color-danger, #dc3545);
  }

  .price-modifier {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-success-text, #28a745);
    margin-left: 0.25rem;
  }

  input[type='text'],
  input[type='number'],
  textarea,
  select {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border-primary, #ddd);
    border-radius: 6px;
    font-size: 0.95rem;
    background: var(--color-bg-primary, #fff);
    color: var(--color-text-primary, #333);
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: var(--color-primary, #4a90d9);
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }

  textarea {
    resize: vertical;
  }

  .char-count {
    display: block;
    text-align: right;
    font-size: 0.75rem;
    color: var(--color-text-tertiary, #999);
    margin-top: 0.2rem;
  }

  .color-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .color-input-wrapper input[type='color'] {
    width: 48px;
    height: 36px;
    padding: 2px;
    border: 1px solid var(--color-border-primary, #ddd);
    border-radius: 6px;
    cursor: pointer;
  }

  .color-value {
    font-size: 0.85rem;
    color: var(--color-text-secondary, #666);
    font-family: monospace;
  }

  .price-summary {
    padding: 0.75rem;
    background: var(--color-success-bg, #d4edda);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--color-success-text, #155724);
    text-align: center;
    margin-top: 0.5rem;
  }

  .required-notice {
    font-size: 0.85rem;
    color: var(--color-warning-text, #856404);
    margin: 0.5rem 0 0;
    text-align: center;
  }
</style>
