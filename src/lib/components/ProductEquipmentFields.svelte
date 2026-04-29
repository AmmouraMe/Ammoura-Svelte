<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    EquipmentWithFields,
    EquipmentField,
    CartItemEquipmentValue
  } from '$lib/types/equipment';
  import type { MediaRequirements } from '$lib/types/customization';

  export let equipmentList: EquipmentWithFields[] = [];

  const dispatch = createEventDispatcher<{
    equipmentValuesChange: CartItemEquipmentValue[];
  }>();

  // Track values per equipment field
  let values: Record<string, string> = {};
  let errors: Record<string, string> = {};

  // Initialize default values
  $: {
    for (const eq of equipmentList) {
      for (const field of eq.fields) {
        const key = `${eq.id}:${field.id}`;
        if (values[key] === undefined && field.defaultValue) {
          values[key] = field.defaultValue;
        }
      }
    }
  }

  function getAcceptAttribute(field: EquipmentField): string {
    if (field.mediaRequirements?.allowedMimeTypes?.length) {
      return field.mediaRequirements.allowedMimeTypes.join(',');
    }
    if (field.fieldType === 'image') return 'image/*';
    if (field.fieldType === 'audio') return 'audio/*';
    if (field.fieldType === 'video') return 'video/*';
    return '';
  }

  function getRequirementDescriptions(reqs: MediaRequirements, fieldType: string): string[] {
    const descs: string[] = [];
    if (reqs.maxFileSize) {
      const mb = (reqs.maxFileSize / (1024 * 1024)).toFixed(1);
      descs.push(`Max ${mb} MB`);
    }
    if (reqs.allowedMimeTypes?.length) {
      descs.push(`Types: ${reqs.allowedMimeTypes.join(', ')}`);
    }
    if (fieldType === 'image') {
      if (reqs.minWidth || reqs.minHeight) {
        descs.push(`Min ${reqs.minWidth ?? '?'}×${reqs.minHeight ?? '?'}px`);
      }
      if (reqs.maxWidth || reqs.maxHeight) {
        descs.push(`Max ${reqs.maxWidth ?? '?'}×${reqs.maxHeight ?? '?'}px`);
      }
    }
    if (fieldType === 'audio' || fieldType === 'video') {
      if (reqs.minDuration) descs.push(`Min ${reqs.minDuration}s`);
      if (reqs.maxDuration) descs.push(`Max ${reqs.maxDuration}s`);
    }
    if (fieldType === 'audio' && reqs.minBitrate) {
      descs.push(`Min ${reqs.minBitrate} kbps`);
    }
    if (fieldType === 'video') {
      if (reqs.minResolution) descs.push(`Min ${reqs.minResolution}p`);
      if (reqs.minFrameRate) descs.push(`Min ${reqs.minFrameRate} fps`);
    }
    return descs;
  }

  function validateMediaFile(
    file: File,
    reqs: MediaRequirements | null,
    fieldType: string
  ): string | null {
    if (!reqs) return null;
    if (reqs.maxFileSize && file.size > reqs.maxFileSize) {
      const mb = (reqs.maxFileSize / (1024 * 1024)).toFixed(1);
      return `File too large. Maximum size is ${mb} MB.`;
    }
    if (reqs.allowedMimeTypes?.length && !reqs.allowedMimeTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed.`;
    }
    return null;
  }

  function handleChange(equipmentId: string, field: EquipmentField, value: string): void {
    const key = `${equipmentId}:${field.id}`;
    values[key] = value;
    errors[key] = '';
    values = values;
    errors = errors;
    emitValues();
  }

  function handleFileChange(equipmentId: string, field: EquipmentField, event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    const key = `${equipmentId}:${field.id}`;

    if (!file) {
      values[key] = '';
      errors[key] = '';
      values = values;
      errors = errors;
      emitValues();
      return;
    }

    const error = validateMediaFile(file, field.mediaRequirements, field.fieldType);
    if (error) {
      errors[key] = error;
      errors = errors;
      input.value = '';
      return;
    }

    values[key] = file.name;
    errors[key] = '';
    values = values;
    errors = errors;
    emitValues();
  }

  function emitValues(): void {
    const result: CartItemEquipmentValue[] = [];
    for (const eq of equipmentList) {
      for (const field of eq.fields) {
        const key = `${eq.id}:${field.id}`;
        const val = values[key] || '';
        if (val.trim().length > 0) {
          result.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            fieldId: field.id,
            fieldName: field.name,
            fieldType: field.fieldType,
            value: val
          });
        }
      }
    }
    dispatch('equipmentValuesChange', result);
  }

  function getValue(equipmentId: string, fieldId: string): string {
    return values[`${equipmentId}:${fieldId}`] || '';
  }
</script>

{#if equipmentList.length > 0}
  <div class="equipment-fields-section">
    <h3>Equipment Information</h3>
    <p class="section-note">
      This product requires the following information for fulfillment. Fields marked with * are
      required.
    </p>

    {#each equipmentList as eq (eq.id)}
      <div class="equipment-group">
        <h4 class="equipment-name">{eq.name}</h4>
        {#if eq.description}
          <p class="equipment-desc">{eq.description}</p>
        {/if}

        <div class="fields-grid">
          {#each eq.fields as field (field.id)}
            <div class="field-group">
              <label for="eq-field-{field.id}">
                {field.name}
                {#if field.required}<span class="required">*</span>{/if}
              </label>

              {#if field.fieldType === 'text'}
                <input
                  id="eq-field-{field.id}"
                  type="text"
                  value={getValue(eq.id, field.id)}
                  placeholder={field.placeholder || ''}
                  maxlength={field.maxLength || undefined}
                  required={field.required}
                  on:input={(e) => handleChange(eq.id, field, e.currentTarget.value)}
                />
              {:else if field.fieldType === 'textarea'}
                <textarea
                  id="eq-field-{field.id}"
                  value={getValue(eq.id, field.id)}
                  placeholder={field.placeholder || ''}
                  maxlength={field.maxLength || undefined}
                  required={field.required}
                  rows="3"
                  on:input={(e) => handleChange(eq.id, field, e.currentTarget.value)}
                />
              {:else if field.fieldType === 'select'}
                <select
                  id="eq-field-{field.id}"
                  value={getValue(eq.id, field.id)}
                  required={field.required}
                  on:change={(e) => handleChange(eq.id, field, e.currentTarget.value)}
                >
                  <option value="">{field.placeholder || 'Select an option'}</option>
                  {#each field.options as option}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
              {:else if field.fieldType === 'color'}
                <input
                  id="eq-field-{field.id}"
                  type="color"
                  value={getValue(eq.id, field.id) || '#000000'}
                  on:input={(e) => handleChange(eq.id, field, e.currentTarget.value)}
                />
              {:else if field.fieldType === 'number'}
                <input
                  id="eq-field-{field.id}"
                  type="number"
                  value={getValue(eq.id, field.id)}
                  placeholder={field.placeholder || ''}
                  min={field.minValue ?? undefined}
                  max={field.maxValue ?? undefined}
                  required={field.required}
                  on:input={(e) => handleChange(eq.id, field, e.currentTarget.value)}
                />
              {:else if field.fieldType === 'date'}
                <input
                  id="eq-field-{field.id}"
                  type="date"
                  value={getValue(eq.id, field.id)}
                  required={field.required}
                  on:input={(e) => handleChange(eq.id, field, e.currentTarget.value)}
                />
              {:else if field.fieldType === 'image' || field.fieldType === 'audio' || field.fieldType === 'video'}
                <input
                  id="eq-field-{field.id}"
                  type="file"
                  accept={getAcceptAttribute(field)}
                  required={field.required}
                  on:change={(e) => handleFileChange(eq.id, field, e)}
                />
                {#if field.mediaRequirements}
                  <div class="media-requirements-info">
                    {#each getRequirementDescriptions(field.mediaRequirements, field.fieldType) as desc}
                      <span class="requirement-tag">{desc}</span>
                    {/each}
                  </div>
                {/if}
                {#if errors[`${eq.id}:${field.id}`]}
                  <p class="field-error">{errors[`${eq.id}:${field.id}`]}</p>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .equipment-fields-section {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid var(--color-border-secondary, #e0e0e0);
    border-radius: 8px;
    background: var(--color-bg-tertiary, #fafafa);
  }

  .equipment-fields-section h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
  }

  .section-note {
    color: var(--color-text-secondary, #666);
    font-size: 0.85rem;
    margin: 0 0 1rem;
  }

  .equipment-group {
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border-secondary, #eee);
  }

  .equipment-group:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .equipment-name {
    margin: 0 0 0.25rem;
    font-size: 0.95rem;
    color: var(--color-text-primary, #333);
  }

  .equipment-desc {
    color: var(--color-text-secondary, #666);
    font-size: 0.85rem;
    margin: 0 0 0.75rem;
  }

  .fields-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-group label {
    font-weight: 500;
    font-size: 0.85rem;
  }

  .required {
    color: var(--color-danger, #dc3545);
  }

  .field-group input[type='text'],
  .field-group input[type='number'],
  .field-group input[type='date'],
  .field-group textarea,
  .field-group select {
    padding: 0.5rem;
    border: 1px solid var(--color-border-secondary, #ddd);
    border-radius: 6px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
  }

  .field-group input[type='color'] {
    width: 50px;
    height: 36px;
    border: 1px solid var(--color-border-secondary, #ddd);
    border-radius: 6px;
    padding: 2px;
    cursor: pointer;
  }

  .field-group input[type='file'] {
    font-size: 0.875rem;
  }

  .media-requirements-info {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.25rem;
  }

  .requirement-tag {
    background: var(--color-bg-accent, #e8f0fe);
    color: var(--color-text-secondary, #555);
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }

  .field-error {
    color: var(--color-danger, #dc3545);
    font-size: 0.8rem;
    margin: 0.25rem 0 0;
  }
</style>
