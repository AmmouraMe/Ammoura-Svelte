<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { money } from '$lib/i18n';
  import type {
    ProductCustomizationField,
    CartItemFieldValue,
    MediaRequirements
  } from '$lib/types/customization';

  export let fields: ProductCustomizationField[] = [];
  export let initialValues: CartItemFieldValue[] = [];

  const dispatch = createEventDispatcher<{ fieldValuesChange: CartItemFieldValue[] }>();

  // Initialize values from defaults or initial values
  let values: Record<string, string> = {};
  let mediaErrors: Record<string, string> = {};

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

  /**
   * Publish whenever the resolved values change — including the very first
   * time, when they come from each field's `defaultValue`.
   *
   * Previously values were only emitted from `handleChange`, so a required
   * field showing its default (e.g. Size "M") looked filled in but was never
   * reported to the parent. "Add to cart" then stayed disabled with nothing on
   * screen explaining why, and the only way through was to touch every field.
   */
  onMount(() => {
    emitValues();
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
    return val > 0 ? `+${$money(val)}` : '';
  }

  function getAcceptAttribute(field: ProductCustomizationField): string {
    const reqs = field.mediaRequirements;
    if (reqs?.allowedMimeTypes && reqs.allowedMimeTypes.length > 0) {
      return reqs.allowedMimeTypes.join(',');
    }
    if (field.fieldType === 'image') return 'image/*';
    if (field.fieldType === 'audio') return 'audio/*';
    if (field.fieldType === 'video') return 'video/*';
    return '';
  }

  function formatFileSize(bytes: number): string {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} bytes`;
  }

  function describeRequirements(reqs: MediaRequirements, fieldType: string): string[] {
    const desc: string[] = [];
    if (reqs.maxFileSize) desc.push(`Max file size: ${formatFileSize(reqs.maxFileSize)}`);
    if (reqs.allowedMimeTypes?.length) desc.push(`Types: ${reqs.allowedMimeTypes.join(', ')}`);
    if (fieldType === 'image') {
      if (reqs.minWidth || reqs.minHeight) {
        desc.push(`Min: ${reqs.minWidth ?? 'any'}×${reqs.minHeight ?? 'any'}px`);
      }
      if (reqs.maxWidth || reqs.maxHeight) {
        desc.push(`Max: ${reqs.maxWidth ?? 'any'}×${reqs.maxHeight ?? 'any'}px`);
      }
      if (reqs.minAspectRatio || reqs.maxAspectRatio) {
        const parts: string[] = [];
        if (reqs.minAspectRatio) parts.push(`min ${reqs.minAspectRatio}`);
        if (reqs.maxAspectRatio) parts.push(`max ${reqs.maxAspectRatio}`);
        desc.push(`Aspect ratio: ${parts.join(', ')}`);
      }
    }
    if (fieldType === 'audio' || fieldType === 'video') {
      if (reqs.minDuration || reqs.maxDuration) {
        const parts: string[] = [];
        if (reqs.minDuration) parts.push(`min ${reqs.minDuration}s`);
        if (reqs.maxDuration) parts.push(`max ${reqs.maxDuration}s`);
        desc.push(`Duration: ${parts.join(', ')}`);
      }
    }
    if (fieldType === 'audio' && reqs.minBitrate) {
      desc.push(`Min bitrate: ${reqs.minBitrate} kbps`);
    }
    if (fieldType === 'video') {
      if (reqs.minResolution) desc.push(`Min resolution: ${reqs.minResolution}p`);
      if (reqs.minFrameRate) desc.push(`Min frame rate: ${reqs.minFrameRate} fps`);
    }
    return desc;
  }

  async function validateMediaFile(
    file: File,
    field: ProductCustomizationField
  ): Promise<string | null> {
    const reqs = field.mediaRequirements;
    if (!reqs) return null;

    if (reqs.maxFileSize && file.size > reqs.maxFileSize) {
      return `File too large. Maximum: ${formatFileSize(reqs.maxFileSize)}`;
    }

    if (reqs.allowedMimeTypes?.length && !reqs.allowedMimeTypes.includes(file.type)) {
      return `File type ${file.type} not allowed. Accepted: ${reqs.allowedMimeTypes.join(', ')}`;
    }

    if (field.fieldType === 'image') {
      const error = await validateImage(file, reqs);
      if (error) return error;
    }

    if (field.fieldType === 'audio' || field.fieldType === 'video') {
      const error = await validateMediaDuration(file, field.fieldType, reqs);
      if (error) return error;
    }

    return null;
  }

  function validateImage(file: File, reqs: MediaRequirements): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = (): void => {
        URL.revokeObjectURL(img.src);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (reqs.minWidth && w < reqs.minWidth) {
          resolve(`Image width (${w}px) is below minimum (${reqs.minWidth}px)`);
          return;
        }
        if (reqs.minHeight && h < reqs.minHeight) {
          resolve(`Image height (${h}px) is below minimum (${reqs.minHeight}px)`);
          return;
        }
        if (reqs.maxWidth && w > reqs.maxWidth) {
          resolve(`Image width (${w}px) exceeds maximum (${reqs.maxWidth}px)`);
          return;
        }
        if (reqs.maxHeight && h > reqs.maxHeight) {
          resolve(`Image height (${h}px) exceeds maximum (${reqs.maxHeight}px)`);
          return;
        }
        const aspect = w / h;
        if (reqs.minAspectRatio && aspect < reqs.minAspectRatio) {
          resolve(`Aspect ratio (${aspect.toFixed(2)}) is below minimum (${reqs.minAspectRatio})`);
          return;
        }
        if (reqs.maxAspectRatio && aspect > reqs.maxAspectRatio) {
          resolve(`Aspect ratio (${aspect.toFixed(2)}) exceeds maximum (${reqs.maxAspectRatio})`);
          return;
        }
        resolve(null);
      };
      img.onerror = (): void => {
        URL.revokeObjectURL(img.src);
        resolve('Unable to read image file');
      };
      img.src = URL.createObjectURL(file);
    });
  }

  function validateMediaDuration(
    file: File,
    fieldType: string,
    reqs: MediaRequirements
  ): Promise<string | null> {
    if (!reqs.minDuration && !reqs.maxDuration) return Promise.resolve(null);
    return new Promise((resolve) => {
      const el = document.createElement(fieldType === 'video' ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = (): void => {
        URL.revokeObjectURL(el.src);
        const dur = el.duration;
        if (reqs.minDuration && dur < reqs.minDuration) {
          resolve(`Duration (${dur.toFixed(1)}s) is below minimum (${reqs.minDuration}s)`);
          return;
        }
        if (reqs.maxDuration && dur > reqs.maxDuration) {
          resolve(`Duration (${dur.toFixed(1)}s) exceeds maximum (${reqs.maxDuration}s)`);
          return;
        }
        resolve(null);
      };
      el.onerror = (): void => {
        URL.revokeObjectURL(el.src);
        resolve('Unable to read media file');
      };
      el.src = URL.createObjectURL(file);
    });
  }

  async function handleFileChange(fieldId: string, event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    const field = fields.find((f) => f.id === fieldId);
    if (!file || !field) {
      handleChange(fieldId, '');
      delete mediaErrors[fieldId];
      mediaErrors = { ...mediaErrors };
      return;
    }

    const error = await validateMediaFile(file, field);
    if (error) {
      mediaErrors[fieldId] = error;
      mediaErrors = { ...mediaErrors };
      input.value = '';
      handleChange(fieldId, '');
      return;
    }

    delete mediaErrors[fieldId];
    mediaErrors = { ...mediaErrors };
    handleChange(fieldId, file.name);
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
      {:else if field.fieldType === 'image' || field.fieldType === 'audio' || field.fieldType === 'video'}
        <input
          id="field-{field.id}"
          type="file"
          accept={getAcceptAttribute(field)}
          on:change={(e) => handleFileChange(field.id, e)}
          required={field.required}
          class="file-input"
        />
        {#if field.mediaRequirements}
          <div class="media-requirements">
            {#each describeRequirements(field.mediaRequirements, field.fieldType) as req}
              <span class="requirement-item">{req}</span>
            {/each}
          </div>
        {/if}
        {#if mediaErrors[field.id]}
          <span class="media-error">{mediaErrors[field.id]}</span>
        {/if}
        {#if values[field.id]}
          <span class="file-selected">Selected: {values[field.id]}</span>
        {/if}
      {/if}
    </div>
  {/each}

  {#if totalPriceModifier > 0}
    <div class="price-summary">
      Customization adds <strong>{$money(totalPriceModifier)}</strong> to the price
    </div>
  {/if}

  {#if !allRequiredFilled}
    <p class="required-notice">Please fill in all required fields before adding to cart</p>
  {/if}
</div>

<style>
  .customization-fields {
    padding: 1rem;
    background: var(--color-bg-secondary, #f8f9fa);
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
    color: var(--color-success, #28a745);
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
    color: var(--color-text-muted, #999);
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
    background: var(--color-bg-success-light, rgba(16, 185, 129, 0.12));
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--color-success, #155724);
    text-align: center;
    margin-top: 0.5rem;
  }

  .required-notice {
    font-size: 0.85rem;
    color: var(--color-warning, #856404);
    margin: 0.5rem 0 0;
    text-align: center;
  }

  .file-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px dashed var(--color-border-primary, #ddd);
    border-radius: 6px;
    font-size: 0.95rem;
    background: var(--color-bg-primary, #fff);
    color: var(--color-text-primary, #333);
    box-sizing: border-box;
    cursor: pointer;
  }

  .file-input:hover {
    border-color: var(--color-primary, #4a90d9);
  }

  .media-requirements {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.3rem;
  }

  .requirement-item {
    font-size: 0.75rem;
    color: var(--color-text-tertiary, #999);
    background: var(--color-bg-accent, #f0f0f0);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }

  .media-error {
    display: block;
    font-size: 0.8rem;
    color: var(--color-danger, #dc3545);
    margin-top: 0.3rem;
  }

  .file-selected {
    display: block;
    font-size: 0.8rem;
    color: var(--color-success-text, #28a745);
    margin-top: 0.3rem;
  }
</style>
