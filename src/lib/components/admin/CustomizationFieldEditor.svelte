<script lang="ts">
  import { onMount } from 'svelte';
  import { toastStore } from '$lib/stores/toast';
  import { confirmStore } from '$lib/stores/confirm';
  import type { ProductCustomizationField, CustomizationFieldType } from '$lib/types/customization';

  export let productId: string;

  let fields: ProductCustomizationField[] = [];
  let loading = true;
  let saving = false;

  // Editing state
  let editingField: ProductCustomizationField | null = null;
  let showForm = false;

  // Form fields
  let formName = '';
  let formFieldType: CustomizationFieldType = 'text';
  let formOptions = '';
  let formPlaceholder = '';
  let formRequired = false;
  let formMaxLength: number | null = null;
  let formMinValue: number | null = null;
  let formMaxValue: number | null = null;
  let formDefaultValue = '';
  let formPriceModifier = 0;

  const FIELD_TYPE_LABELS: Record<CustomizationFieldType, string> = {
    text: 'Text Input',
    textarea: 'Multi-line Text',
    select: 'Dropdown Select',
    color: 'Color Picker',
    number: 'Number Input'
  };

  async function loadFields(): Promise<void> {
    try {
      const res = await fetch(
        `/api/admin/customization-fields?productId=${encodeURIComponent(productId)}`
      );
      if (res.ok) {
        fields = await res.json();
      }
    } catch (err) {
      console.error('Failed to load fields:', err);
    } finally {
      loading = false;
    }
  }

  onMount(loadFields);

  function startAdd(): void {
    editingField = null;
    formName = '';
    formFieldType = 'text';
    formOptions = '';
    formPlaceholder = '';
    formRequired = false;
    formMaxLength = null;
    formMinValue = null;
    formMaxValue = null;
    formDefaultValue = '';
    formPriceModifier = 0;
    showForm = true;
  }

  function startEdit(field: ProductCustomizationField): void {
    editingField = field;
    formName = field.name;
    formFieldType = field.fieldType;
    formOptions = field.options.join(', ');
    formPlaceholder = field.placeholder || '';
    formRequired = field.required;
    formMaxLength = field.maxLength;
    formMinValue = field.minValue;
    formMaxValue = field.maxValue;
    formDefaultValue = field.defaultValue || '';
    formPriceModifier = field.priceModifier;
    showForm = true;
  }

  function cancelForm(): void {
    showForm = false;
    editingField = null;
  }

  function parseOptions(raw: string): string[] {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  async function saveField(): Promise<void> {
    if (!formName.trim()) {
      toastStore.error('Field name is required');
      return;
    }
    if (formFieldType === 'select' && parseOptions(formOptions).length === 0) {
      toastStore.error('Select fields require at least one option');
      return;
    }

    saving = true;
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        fieldType: formFieldType,
        placeholder: formPlaceholder || null,
        required: formRequired,
        defaultValue: formDefaultValue || null,
        priceModifier: formPriceModifier
      };

      if (formFieldType === 'select') {
        body.options = parseOptions(formOptions);
      }
      if (formFieldType === 'text' || formFieldType === 'textarea') {
        body.maxLength = formMaxLength;
      }
      if (formFieldType === 'number') {
        body.minValue = formMinValue;
        body.maxValue = formMaxValue;
      }

      if (editingField) {
        const res = await fetch('/api/admin/customization-fields', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingField.id, ...body })
        });
        if (!res.ok) throw new Error('Failed to update field');
        toastStore.success('Field updated');
      } else {
        body.productId = productId;
        body.sortOrder = fields.length;
        const res = await fetch('/api/admin/customization-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to create field');
        toastStore.success('Field created');
      }

      showForm = false;
      editingField = null;
      await loadFields();
    } catch (err) {
      console.error('Failed to save field:', err);
      toastStore.error('Failed to save field');
    } finally {
      saving = false;
    }
  }

  async function deleteField(field: ProductCustomizationField): Promise<void> {
    const confirmed = await confirmStore.show(`Delete the "${field.name}" customization field?`, {
      title: 'Delete Field',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/customization-fields', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: field.id })
      });
      if (!res.ok) throw new Error('Failed to delete field');
      toastStore.success('Field deleted');
      await loadFields();
    } catch (err) {
      console.error('Failed to delete field:', err);
      toastStore.error('Failed to delete field');
    }
  }

  function formatPrice(val: number): string {
    return val > 0 ? `+$${val.toFixed(2)}` : '';
  }
</script>

<div class="field-editor">
  <div class="editor-header">
    <h3>Customer Input Fields</h3>
    <p class="helper-text">
      Define fields that customers fill in when ordering (e.g., text to engrave, color choice)
    </p>
  </div>

  {#if loading}
    <p class="loading">Loading fields...</p>
  {:else}
    {#if fields.length > 0}
      <div class="field-list">
        {#each fields as field (field.id)}
          <div class="field-item">
            <div class="field-info">
              <span class="field-name">
                {field.name}
                {#if field.required}
                  <span class="required-badge">Required</span>
                {/if}
                {#if field.priceModifier > 0}
                  <span class="price-badge">{formatPrice(field.priceModifier)}</span>
                {/if}
              </span>
              <span class="field-type">{FIELD_TYPE_LABELS[field.fieldType]}</span>
              {#if field.fieldType === 'select'}
                <span class="field-options">{field.options.join(', ')}</span>
              {/if}
            </div>
            <div class="field-actions">
              <button type="button" class="edit-btn" on:click={() => startEdit(field)}>
                Edit
              </button>
              <button type="button" class="delete-btn" on:click={() => deleteField(field)}>
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else if !showForm}
      <p class="empty-state">
        No customer input fields yet. Add one to let customers personalize this product.
      </p>
    {/if}

    {#if showForm}
      <div class="field-form">
        <h4>{editingField ? 'Edit Field' : 'Add Field'}</h4>

        <div class="form-row">
          <label for="cf-name">Field Name *</label>
          <input
            id="cf-name"
            type="text"
            bind:value={formName}
            placeholder="e.g., Name to Engrave"
          />
        </div>

        <div class="form-row">
          <label for="cf-type">Field Type</label>
          <select id="cf-type" bind:value={formFieldType}>
            {#each Object.entries(FIELD_TYPE_LABELS) as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </div>

        {#if formFieldType === 'select'}
          <div class="form-row">
            <label for="cf-options">Options (comma-separated) *</label>
            <input
              id="cf-options"
              type="text"
              bind:value={formOptions}
              placeholder="e.g., Arial, Times New Roman, Helvetica"
            />
          </div>
        {/if}

        {#if formFieldType === 'text' || formFieldType === 'textarea'}
          <div class="form-row-group">
            <div class="form-row">
              <label for="cf-placeholder">Placeholder Text</label>
              <input
                id="cf-placeholder"
                type="text"
                bind:value={formPlaceholder}
                placeholder="Hint text shown in empty field"
              />
            </div>
            <div class="form-row">
              <label for="cf-maxlength">Max Length</label>
              <input
                id="cf-maxlength"
                type="number"
                bind:value={formMaxLength}
                min="1"
                placeholder="No limit"
              />
            </div>
          </div>
        {/if}

        {#if formFieldType === 'number'}
          <div class="form-row-group">
            <div class="form-row">
              <label for="cf-placeholder-num">Placeholder Text</label>
              <input
                id="cf-placeholder-num"
                type="text"
                bind:value={formPlaceholder}
                placeholder="Hint text"
              />
            </div>
            <div class="form-row">
              <label for="cf-min">Min Value</label>
              <input id="cf-min" type="number" bind:value={formMinValue} placeholder="No min" />
            </div>
            <div class="form-row">
              <label for="cf-max">Max Value</label>
              <input id="cf-max" type="number" bind:value={formMaxValue} placeholder="No max" />
            </div>
          </div>
        {/if}

        <div class="form-row">
          <label for="cf-default">Default Value</label>
          {#if formFieldType === 'color'}
            <input id="cf-default" type="color" bind:value={formDefaultValue} />
          {:else}
            <input
              id="cf-default"
              type="text"
              bind:value={formDefaultValue}
              placeholder="Optional default"
            />
          {/if}
        </div>

        <div class="form-row-group">
          <div class="form-row">
            <label for="cf-price">Price Modifier ($)</label>
            <input
              id="cf-price"
              type="number"
              bind:value={formPriceModifier}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div class="form-row checkbox-row">
            <label>
              <input type="checkbox" bind:checked={formRequired} />
              Required field
            </label>
          </div>
        </div>

        <div class="form-buttons">
          <button type="button" class="cancel-btn" on:click={cancelForm} disabled={saving}>
            Cancel
          </button>
          <button type="button" class="save-btn" on:click={saveField} disabled={saving}>
            {saving ? 'Saving...' : editingField ? 'Update Field' : 'Add Field'}
          </button>
        </div>
      </div>
    {:else}
      <button type="button" class="add-btn" on:click={startAdd}>
        + Add Customer Input Field
      </button>
    {/if}
  {/if}
</div>

<style>
  .field-editor {
    border: 1px solid var(--color-border-primary, #e0e0e0);
    border-radius: 8px;
    padding: 1.25rem;
    background: var(--color-bg-secondary, #fafafa);
  }

  .editor-header h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    color: var(--color-text-primary, #333);
  }

  .helper-text {
    font-size: 0.85rem;
    color: var(--color-text-secondary, #666);
    margin: 0 0 1rem;
  }

  .loading {
    color: var(--color-text-secondary, #666);
    font-style: italic;
  }

  .empty-state {
    color: var(--color-text-tertiary, #999);
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .field-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .field-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg-primary, #fff);
    border: 1px solid var(--color-border-secondary, #eee);
    border-radius: 6px;
  }

  .field-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .field-name {
    font-weight: 600;
    color: var(--color-text-primary, #333);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .required-badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    background: var(--color-warning-bg, #fff3cd);
    color: var(--color-warning-text, #856404);
    border-radius: 3px;
    font-weight: 500;
  }

  .price-badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    background: var(--color-success-bg, #d4edda);
    color: var(--color-success-text, #155724);
    border-radius: 3px;
    font-weight: 500;
  }

  .field-type {
    font-size: 0.8rem;
    color: var(--color-text-secondary, #666);
  }

  .field-options {
    font-size: 0.75rem;
    color: var(--color-text-tertiary, #999);
    font-style: italic;
  }

  .field-actions {
    display: flex;
    gap: 0.5rem;
  }

  .edit-btn,
  .delete-btn {
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--color-border-primary, #ddd);
    border-radius: 4px;
    background: var(--color-bg-primary, #fff);
    cursor: pointer;
    font-size: 0.8rem;
  }

  .edit-btn:hover {
    background: var(--color-bg-accent, #f0f0f0);
  }

  .delete-btn {
    color: var(--color-danger, #dc3545);
    border-color: var(--color-danger, #dc3545);
  }

  .delete-btn:hover {
    background: var(--color-danger, #dc3545);
    color: white;
  }

  .field-form {
    border: 1px solid var(--color-border-primary, #ddd);
    border-radius: 6px;
    padding: 1rem;
    background: var(--color-bg-primary, #fff);
    margin-bottom: 1rem;
  }

  .field-form h4 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
  }

  .form-row {
    margin-bottom: 0.75rem;
  }

  .form-row label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: var(--color-text-primary, #333);
  }

  .form-row input[type='text'],
  .form-row input[type='number'],
  .form-row select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border-primary, #ddd);
    border-radius: 4px;
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .form-row-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .form-row-group .form-row {
    margin-bottom: 0;
  }

  .checkbox-row label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    height: 100%;
    padding-top: 1.5rem;
  }

  .form-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .cancel-btn,
  .save-btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    border: 1px solid var(--color-border-primary, #ddd);
  }

  .cancel-btn {
    background: var(--color-bg-primary, #fff);
  }

  .save-btn {
    background: var(--color-primary, #4a90d9);
    color: white;
    border-color: var(--color-primary, #4a90d9);
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    border: 1px dashed var(--color-border-primary, #ccc);
    border-radius: 6px;
    background: transparent;
    color: var(--color-primary, #4a90d9);
    cursor: pointer;
    font-size: 0.9rem;
    width: 100%;
  }

  .add-btn:hover {
    background: var(--color-bg-accent, #f0f7ff);
    border-color: var(--color-primary, #4a90d9);
  }
</style>
