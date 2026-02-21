<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { confirmStore } from '$lib/stores/confirm';
  import { toastStore } from '$lib/stores/toast';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageData } from './$types';
  import type { ContentFieldDefinition, ContentFieldType } from '$lib/types/contentTypes';

  export let data: PageData;

  $: contentType = data.contentType;
  $: entryCount = data.entryCount;

  // Details form — initialize from data directly to avoid reactive ordering issue
  let name = data.contentType.name;
  let description = data.contentType.description || '';
  let basePath = data.contentType.basePath || '';
  let icon = data.contentType.icon || '📄';
  let status = data.contentType.status;

  // Fields editor
  let fields: ContentFieldDefinition[] = [...data.contentType.fieldsSchema];
  let editingFieldIndex: number | null = null;

  // Selection options editor helpers
  type SelectionOption = { label: string; value: string };

  function getSelectionOptions(field: ContentFieldDefinition): SelectionOption[] {
    if (field.config && 'options' in field.config && Array.isArray(field.config.options)) {
      return field.config.options as SelectionOption[];
    }
    return [];
  }

  function setSelectionOptions(index: number, options: SelectionOption[]): void {
    const allowCustom =
      fields[index].config && 'allowCustom' in fields[index].config
        ? (fields[index].config as { allowCustom?: boolean }).allowCustom
        : false;
    fields[index] = { ...fields[index], config: { options, allowCustom } };
    fields = fields;
  }

  function addSelectionOption(index: number): void {
    const options = getSelectionOptions(fields[index]);
    setSelectionOptions(index, [...options, { label: '', value: '' }]);
  }

  function removeSelectionOption(fieldIndex: number, optIndex: number): void {
    const options = getSelectionOptions(fields[fieldIndex]);
    setSelectionOptions(
      fieldIndex,
      options.filter((_, i) => i !== optIndex)
    );
  }

  function updateSelectionOption(
    fieldIndex: number,
    optIndex: number,
    key: 'label' | 'value',
    val: string
  ): void {
    const options = [...getSelectionOptions(fields[fieldIndex])];
    options[optIndex] = { ...options[optIndex], [key]: val };
    // Auto-generate value from label if value is empty or was previously auto-generated
    if (key === 'label') {
      const oldAutoVal = options[optIndex].value;
      const newAutoVal = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      if (!oldAutoVal || oldAutoVal === newAutoVal || !options[optIndex].value) {
        options[optIndex] = { ...options[optIndex], value: newAutoVal };
      }
    }
    setSelectionOptions(fieldIndex, options);
  }

  function setFieldConfig(index: number, key: string, value: unknown): void {
    const currentConfig = fields[index].config || {};
    fields[index] = { ...fields[index], config: { ...currentConfig, [key]: value } };
    fields = fields;
  }

  function getFieldConfigValue(field: ContentFieldDefinition, key: string): unknown {
    if (!field.config) return undefined;
    return (field.config as Record<string, unknown>)[key];
  }

  function getAllowedMediaTypes(field: ContentFieldDefinition): string[] {
    const val = getFieldConfigValue(field, 'allowedTypes');
    if (Array.isArray(val)) return val as string[];
    return ['image', 'video', 'audio', 'document'];
  }

  function isMediaTypeAllowed(field: ContentFieldDefinition, mediaType: string): boolean {
    return getAllowedMediaTypes(field).includes(mediaType);
  }

  function toggleMediaType(fieldIndex: number, mediaType: string, checked: boolean): void {
    const current = [...getAllowedMediaTypes(fields[fieldIndex])];
    if (checked) {
      if (!current.includes(mediaType)) current.push(mediaType);
    } else {
      const idx = current.indexOf(mediaType);
      if (idx >= 0) current.splice(idx, 1);
    }
    setFieldConfig(fieldIndex, 'allowedTypes', current.length === 4 ? undefined : current);
  }

  /**
   * Prepare fields for serialization: strip empty configs and undefined values
   */
  function serializeFields(): string {
    const cleaned = fields.map((field) => {
      const f: Record<string, unknown> = {
        slug: field.slug,
        name: field.name,
        type: field.type,
        required: field.required,
        position: field.position
      };
      if (field.helpText) f.helpText = field.helpText;
      if (field.placeholder) f.placeholder = field.placeholder;
      if (
        field.defaultValue !== undefined &&
        field.defaultValue !== '' &&
        field.defaultValue !== null
      ) {
        f.defaultValue = field.defaultValue;
      }
      if (field.config) {
        // Strip undefined values from config
        const config: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(field.config as Record<string, unknown>)) {
          if (v !== undefined && v !== null && v !== '') {
            config[k] = v;
          }
        }
        // Only include config if it has meaningful keys
        if (Object.keys(config).length > 0) {
          f.config = config;
        }
      }
      return f;
    });
    return JSON.stringify(cleaned);
  }

  const FIELD_TYPES: { value: ContentFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'rich_text', label: 'Rich Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'tel', label: 'Phone' },
    { value: 'media', label: 'Media' },
    { value: 'selection', label: 'Selection' },
    { value: 'multi_selection', label: 'Multi-Selection' },
    { value: 'reference', label: 'Reference' },
    { value: 'json', label: 'JSON' }
  ];

  const handleFormResult: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        const msg =
          (result.data as Record<string, unknown> | undefined)?.message ?? 'Saved successfully';
        toastStore.success(msg as string);
      } else if (result.type === 'failure') {
        const err =
          (result.data as Record<string, unknown> | undefined)?.error ?? 'An error occurred';
        toastStore.error(err as string);
      }
      await update();
    };
  };

  function addField(): void {
    const position = fields.length + 1;
    fields = [
      ...fields,
      {
        slug: '',
        name: '',
        type: 'text' as ContentFieldType,
        required: false,
        position,
        helpText: ''
      }
    ];
    editingFieldIndex = fields.length - 1;
  }

  function removeField(index: number): void {
    fields = fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, position: i + 1 }));
    editingFieldIndex = null;
  }

  function moveFieldUp(index: number): void {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    fields = newFields.map((f, i) => ({ ...f, position: i + 1 }));
  }

  function moveFieldDown(index: number): void {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    fields = newFields.map((f, i) => ({ ...f, position: i + 1 }));
  }

  function generateFieldSlug(fieldName: string): string {
    return fieldName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function handleFieldNameChange(index: number, newName: string): void {
    const field = fields[index];
    // Auto-generate slug if slug is empty or matches previous auto-generation
    if (!field.slug || field.slug === generateFieldSlug(field.name)) {
      fields[index] = { ...field, name: newName, slug: generateFieldSlug(newName) };
    } else {
      fields[index] = { ...field, name: newName };
    }
    fields = fields;
  }

  async function handleDelete(): Promise<void> {
    const confirmed = await confirmStore.show(
      `Delete "${contentType.name}" and all its ${entryCount} entries permanently? This cannot be undone.`,
      {
        title: 'Delete Content Type',
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    );
    if (confirmed) {
      deleteRequested = true;
    }
  }

  let deleteRequested = false;
</script>

<svelte:head>
  <title>Edit {contentType.name} - Admin</title>
</svelte:head>

<div class="edit-page">
  <div class="page-header">
    <button class="btn btn-ghost" on:click={() => goto('/admin/content')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline
          points="15 18 9 12 15 6"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Back
    </button>
    <div class="header-info">
      <h1>
        <span class="type-icon">{contentType.icon || '📄'}</span>
        {contentType.name}
      </h1>
      <span
        class="badge"
        class:active={contentType.status === 'active'}
        class:archived={contentType.status === 'archived'}
      >
        {contentType.status}
      </span>
    </div>
    <div class="header-actions">
      <button
        class="btn btn-secondary"
        on:click={() => goto(`/admin/content/${contentType.id}/entries`)}
      >
        View Entries ({entryCount})
      </button>
    </div>
  </div>

  <!-- Details form -->
  <section class="settings-section">
    <h2>Details</h2>
    <form method="POST" action="?/updateDetails" use:enhance={handleFormResult}>
      <div class="form-row">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" bind:value={name} required />
        </div>
        <div class="form-group">
          <label for="icon">Icon</label>
          <input type="text" id="icon" name="icon" bind:value={icon} maxlength="4" />
        </div>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" bind:value={description} rows="2"></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="basePath">Base Path</label>
          <input type="text" id="basePath" name="basePath" bind:value={basePath} required />
          <span class="form-hint">URL prefix: {basePath}/entry-slug</span>
        </div>
        <div class="form-group">
          <label for="status">Status</label>
          <select id="status" name="status" bind:value={status}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="contentTypeSlug">Slug</label>
        <input id="contentTypeSlug" type="text" value={contentType.slug} disabled />
        <span class="form-hint">Cannot be changed after creation</span>
      </div>

      <div class="form-actions-inline">
        <button type="submit" class="btn btn-primary">Save Details</button>
      </div>
    </form>
  </section>

  <!-- Fields schema editor -->
  <section class="settings-section">
    <div class="section-header">
      <h2>Fields ({fields.length})</h2>
      <button class="btn btn-sm btn-primary" on:click={addField}> + Add Field </button>
    </div>

    {#if fields.length === 0}
      <div class="empty-fields">
        <svg
          class="empty-icon"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" stroke-linecap="round" />
          <line x1="8" y1="12" x2="16" y2="12" stroke-linecap="round" />
        </svg>
        <p>No fields defined yet.</p>
        <p class="empty-hint">Add fields to define the structure of your content entries.</p>
        <button class="btn btn-primary" on:click={addField}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" />
          </svg>
          Add First Field
        </button>
      </div>
    {:else}
      <div class="fields-list">
        {#each fields as field, index (index)}
          <div class="field-item" class:editing={editingFieldIndex === index}>
            <div
              class="field-header"
              on:click={() => (editingFieldIndex = editingFieldIndex === index ? null : index)}
              role="button"
              tabindex="0"
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  editingFieldIndex = editingFieldIndex === index ? null : index;
                }
              }}
              aria-expanded={editingFieldIndex === index}
            >
              <div class="field-reorder">
                <button
                  class="btn-reorder"
                  on:click|stopPropagation={() => moveFieldUp(index)}
                  disabled={index === 0}
                  title="Move up"
                  aria-label="Move field up"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <span class="field-position">{index + 1}</span>
                <button
                  class="btn-reorder"
                  on:click|stopPropagation={() => moveFieldDown(index)}
                  disabled={index === fields.length - 1}
                  title="Move down"
                  aria-label="Move field down"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
              <div class="field-summary">
                <div class="field-summary-top">
                  <span class="field-name">{field.name || 'Untitled Field'}</span>
                  <div class="field-badges">
                    <span class="field-type-badge">{field.type.replace('_', ' ')}</span>
                    {#if field.required}
                      <span class="field-required-badge">Required</span>
                    {/if}
                  </div>
                </div>
                <span class="field-slug">{field.slug || '—'}</span>
              </div>
              <div class="field-actions">
                <button
                  class="btn-field-action btn-field-delete"
                  on:click|stopPropagation={() => removeField(index)}
                  title="Remove field"
                  aria-label="Remove field"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
                <span class="field-expand-icon" class:expanded={editingFieldIndex === index}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            {#if editingFieldIndex === index}
              <div class="field-details">
                <!-- Basic properties -->
                <div class="form-row">
                  <div class="form-group">
                    <label for="field-{index}-name">Field Name</label>
                    <input
                      id="field-{index}-name"
                      type="text"
                      value={field.name}
                      on:input={(e) => handleFieldNameChange(index, e.currentTarget.value)}
                      placeholder="e.g., Featured Image"
                    />
                  </div>
                  <div class="form-group">
                    <label for="field-{index}-slug">Slug</label>
                    <input
                      id="field-{index}-slug"
                      type="text"
                      bind:value={fields[index].slug}
                      placeholder="e.g., featured_image"
                      pattern="[a-z0-9_]+"
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="field-{index}-type">Type</label>
                    <select id="field-{index}-type" bind:value={fields[index].type}>
                      {#each FIELD_TYPES as ft}
                        <option value={ft.value}>{ft.label}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" bind:checked={fields[index].required} />
                      Required
                    </label>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="field-{index}-helpText">Help Text</label>
                    <input
                      id="field-{index}-helpText"
                      type="text"
                      bind:value={fields[index].helpText}
                      placeholder="Help text for content editors"
                    />
                  </div>
                  <div class="form-group">
                    <label for="field-{index}-placeholder">Placeholder</label>
                    <input
                      id="field-{index}-placeholder"
                      type="text"
                      bind:value={fields[index].placeholder}
                      placeholder="Placeholder text shown in empty input"
                    />
                  </div>
                </div>

                <!-- Default Value — per type -->
                {#if field.type === 'text' || field.type === 'textarea' || field.type === 'email' || field.type === 'url' || field.type === 'tel'}
                  <div class="form-group">
                    <label for="field-{index}-defaultValue-text">Default Value</label>
                    <input
                      id="field-{index}-defaultValue-text"
                      type="text"
                      bind:value={fields[index].defaultValue}
                      placeholder="Default text"
                    />
                  </div>
                {:else if field.type === 'number'}
                  <div class="form-group">
                    <label for="field-{index}-defaultValue-number">Default Value</label>
                    <input
                      id="field-{index}-defaultValue-number"
                      type="number"
                      value={fields[index].defaultValue ?? ''}
                      on:change={(e) => {
                        const val = e.currentTarget.value;
                        fields[index] = {
                          ...fields[index],
                          defaultValue: val ? Number(val) : undefined
                        };
                        fields = fields;
                      }}
                      placeholder="Default number"
                    />
                  </div>
                {:else if field.type === 'boolean'}
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        checked={fields[index].defaultValue === true}
                        on:change={(e) => {
                          fields[index] = {
                            ...fields[index],
                            defaultValue: e.currentTarget.checked
                          };
                          fields = fields;
                        }}
                      />
                      Default checked
                    </label>
                  </div>
                {:else if field.type === 'date'}
                  <div class="form-group">
                    <label for="field-{index}-defaultValue-date">Default Value</label>
                    <input
                      id="field-{index}-defaultValue-date"
                      type="date"
                      bind:value={fields[index].defaultValue}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                {:else if field.type === 'datetime'}
                  <div class="form-group">
                    <label for="field-{index}-defaultValue-datetime">Default Value</label>
                    <input
                      id="field-{index}-defaultValue-datetime"
                      type="datetime-local"
                      bind:value={fields[index].defaultValue}
                      placeholder="YYYY-MM-DDTHH:MM"
                    />
                  </div>
                {:else if field.type === 'rich_text'}
                  <div class="form-group">
                    <label for="field-{index}-defaultValue-richtext">Default Value</label>
                    <textarea
                      id="field-{index}-defaultValue-richtext"
                      rows="2"
                      bind:value={fields[index].defaultValue}
                      placeholder="Default content (HTML)"
                    ></textarea>
                  </div>
                {/if}

                <!-- Type-specific config panels -->
                {#if field.type === 'text' || field.type === 'textarea'}
                  <fieldset class="config-fieldset">
                    <legend>Text Settings</legend>
                    <div class="form-row form-row-3">
                      <div class="form-group">
                        <label for="field-{index}-minLength">Min Length</label>
                        <input
                          id="field-{index}-minLength"
                          type="number"
                          min="0"
                          value={getFieldConfigValue(field, 'minLength') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'minLength', val ? Number(val) : undefined);
                          }}
                          placeholder="None"
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-maxLength">Max Length</label>
                        <input
                          id="field-{index}-maxLength"
                          type="number"
                          min="1"
                          value={getFieldConfigValue(field, 'maxLength') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'maxLength', val ? Number(val) : undefined);
                          }}
                          placeholder="None"
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-pattern">Regex Pattern</label>
                        <input
                          id="field-{index}-pattern"
                          type="text"
                          value={getFieldConfigValue(field, 'pattern') ?? ''}
                          on:input={(e) =>
                            setFieldConfig(index, 'pattern', e.currentTarget.value || undefined)}
                          placeholder="e.g., ^[A-Z]"
                        />
                      </div>
                    </div>
                  </fieldset>
                {:else if field.type === 'number'}
                  <fieldset class="config-fieldset">
                    <legend>Number Settings</legend>
                    <div class="form-row form-row-4">
                      <div class="form-group">
                        <label for="field-{index}-min">Minimum</label>
                        <input
                          id="field-{index}-min"
                          type="number"
                          value={getFieldConfigValue(field, 'min') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'min', val ? Number(val) : undefined);
                          }}
                          placeholder="None"
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-max">Maximum</label>
                        <input
                          id="field-{index}-max"
                          type="number"
                          value={getFieldConfigValue(field, 'max') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'max', val ? Number(val) : undefined);
                          }}
                          placeholder="None"
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-step">Step</label>
                        <input
                          id="field-{index}-step"
                          type="number"
                          min="0"
                          step="any"
                          value={getFieldConfigValue(field, 'step') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'step', val ? Number(val) : undefined);
                          }}
                          placeholder="1"
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-decimalPlaces">Decimal Places</label>
                        <input
                          id="field-{index}-decimalPlaces"
                          type="number"
                          min="0"
                          value={getFieldConfigValue(field, 'decimalPlaces') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'decimalPlaces', val ? Number(val) : undefined);
                          }}
                          placeholder="Auto"
                        />
                      </div>
                    </div>
                  </fieldset>
                {:else if field.type === 'selection' || field.type === 'multi_selection'}
                  <fieldset class="config-fieldset">
                    <legend>Options</legend>
                    <div class="options-editor">
                      {#each getSelectionOptions(field) as opt, optIndex}
                        <div class="option-row">
                          <input
                            type="text"
                            value={opt.label}
                            on:input={(e) =>
                              updateSelectionOption(
                                index,
                                optIndex,
                                'label',
                                e.currentTarget.value
                              )}
                            placeholder="Label"
                            class="option-input"
                          />
                          <input
                            type="text"
                            value={opt.value}
                            on:input={(e) =>
                              updateSelectionOption(
                                index,
                                optIndex,
                                'value',
                                e.currentTarget.value
                              )}
                            placeholder="Value"
                            class="option-input"
                          />
                          <button
                            class="btn-field-action btn-field-delete"
                            on:click={() => removeSelectionOption(index, optIndex)}
                            title="Remove option"
                            aria-label="Remove option"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      {/each}
                      <button
                        class="btn btn-sm btn-secondary"
                        on:click={() => addSelectionOption(index)}
                      >
                        + Add Option
                      </button>
                    </div>
                    <div class="form-group" style="margin-top: 0.75rem;">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          checked={getFieldConfigValue(field, 'allowCustom') === true}
                          on:change={(e) =>
                            setFieldConfig(index, 'allowCustom', e.currentTarget.checked)}
                        />
                        Allow custom values
                      </label>
                    </div>
                  </fieldset>
                {:else if field.type === 'media'}
                  <fieldset class="config-fieldset">
                    <legend>Media Settings</legend>
                    <div class="form-group">
                      <span id="field-{index}-allowedTypes-label" class="group-label"
                        >Allowed Types</span
                      >
                      <div
                        class="checkbox-group"
                        role="group"
                        aria-labelledby="field-{index}-allowedTypes-label"
                      >
                        {#each ['image', 'video', 'audio', 'document'] as mediaType}
                          <label class="checkbox-label inline">
                            <input
                              type="checkbox"
                              checked={isMediaTypeAllowed(field, mediaType)}
                              on:change={(e) =>
                                toggleMediaType(index, mediaType, e.currentTarget.checked)}
                            />
                            {mediaType}
                          </label>
                        {/each}
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label for="field-{index}-maxFileSize">Max File Size (bytes)</label>
                        <input
                          id="field-{index}-maxFileSize"
                          type="number"
                          min="0"
                          value={getFieldConfigValue(field, 'maxFileSize') ?? ''}
                          on:change={(e) => {
                            const val = e.currentTarget.value;
                            setFieldConfig(index, 'maxFileSize', val ? Number(val) : undefined);
                          }}
                          placeholder="No limit"
                        />
                      </div>
                      <div class="form-group">
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            checked={getFieldConfigValue(field, 'multiple') === true}
                            on:change={(e) =>
                              setFieldConfig(index, 'multiple', e.currentTarget.checked)}
                          />
                          Allow multiple files
                        </label>
                      </div>
                    </div>
                  </fieldset>
                {:else if field.type === 'reference'}
                  <fieldset class="config-fieldset">
                    <legend>Reference Settings</legend>
                    <div class="form-row">
                      <div class="form-group">
                        <label for="field-{index}-targetType">Target Type</label>
                        <select
                          id="field-{index}-targetType"
                          value={getFieldConfigValue(field, 'targetType') ?? ''}
                          on:change={(e) =>
                            setFieldConfig(index, 'targetType', e.currentTarget.value || undefined)}
                        >
                          <option value="">Select target...</option>
                          <option value="content_entry">Content Entry</option>
                          <option value="product">Product</option>
                          <option value="page">Page</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            checked={getFieldConfigValue(field, 'multiple') === true}
                            on:change={(e) =>
                              setFieldConfig(index, 'multiple', e.currentTarget.checked)}
                          />
                          Allow multiple references
                        </label>
                      </div>
                    </div>
                    {#if getFieldConfigValue(field, 'targetType') === 'content_entry'}
                      <div class="form-group">
                        <label for="field-{index}-targetContentTypeId">Target Content Type ID</label
                        >
                        <input
                          id="field-{index}-targetContentTypeId"
                          type="text"
                          value={getFieldConfigValue(field, 'targetContentTypeId') ?? ''}
                          on:input={(e) =>
                            setFieldConfig(
                              index,
                              'targetContentTypeId',
                              e.currentTarget.value || undefined
                            )}
                          placeholder="Leave empty for any content type"
                        />
                      </div>
                    {/if}
                  </fieldset>
                {:else if field.type === 'date'}
                  <fieldset class="config-fieldset">
                    <legend>Date Settings</legend>
                    <div class="form-row">
                      <div class="form-group">
                        <label for="field-{index}-minDate">Min Date</label>
                        <input
                          id="field-{index}-minDate"
                          type="date"
                          value={getFieldConfigValue(field, 'minDate') ?? ''}
                          on:change={(e) =>
                            setFieldConfig(index, 'minDate', e.currentTarget.value || undefined)}
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-maxDate-date">Max Date</label>
                        <input
                          id="field-{index}-maxDate-date"
                          type="date"
                          value={getFieldConfigValue(field, 'maxDate') ?? ''}
                          on:change={(e) =>
                            setFieldConfig(index, 'maxDate', e.currentTarget.value || undefined)}
                        />
                      </div>
                    </div>
                  </fieldset>
                {:else if field.type === 'datetime'}
                  <fieldset class="config-fieldset">
                    <legend>Date & Time Settings</legend>
                    <div class="form-row">
                      <div class="form-group">
                        <label for="field-{index}-minDatetime">Min Date</label>
                        <input
                          id="field-{index}-minDatetime"
                          type="datetime-local"
                          value={getFieldConfigValue(field, 'minDate') ?? ''}
                          on:change={(e) =>
                            setFieldConfig(index, 'minDate', e.currentTarget.value || undefined)}
                        />
                      </div>
                      <div class="form-group">
                        <label for="field-{index}-maxDatetime">Max Date</label>
                        <input
                          id="field-{index}-maxDatetime"
                          type="datetime-local"
                          value={getFieldConfigValue(field, 'maxDate') ?? ''}
                          on:change={(e) =>
                            setFieldConfig(index, 'maxDate', e.currentTarget.value || undefined)}
                        />
                      </div>
                    </div>
                  </fieldset>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <form method="POST" action="?/updateSchema" use:enhance={handleFormResult}>
        <input type="hidden" name="fieldsSchema" value={serializeFields()} />
        <div class="form-actions-inline">
          <button type="submit" class="btn btn-primary">Save Fields</button>
        </div>
      </form>
    {/if}
  </section>

  <!-- Danger zone -->
  <section class="settings-section danger-zone">
    <h2>Danger Zone</h2>
    <div class="danger-content">
      <div class="danger-info">
        <strong>Delete this content type</strong>
        <p>
          This will permanently delete this content type and all {entryCount} entries. This action cannot
          be undone.
        </p>
      </div>
      <button class="btn btn-danger" on:click={handleDelete}>Delete Content Type</button>
    </div>
    {#if deleteRequested}
      <form method="POST" action="?/delete" use:enhance style="display:none">
        <button type="submit" class="auto-submit-delete">Submit</button>
      </form>
      <script>
        document.querySelector('.auto-submit-delete')?.click?.();
      </script>
    {/if}
  </section>
</div>

<style>
  /* === Mobile-first base styles === */
  .edit-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .header-info h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .type-icon {
    font-size: 1.25rem;
  }

  .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .badge.active {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .badge.archived {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .settings-section {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  .settings-section h2 {
    margin: 0 0 1.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .section-header h2 {
    margin-bottom: 0;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border-primary);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    box-sizing: border-box;
    appearance: none;
    -webkit-appearance: none;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: var(--color-text-muted);
  }

  .form-hint {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    transition: color var(--transition-normal);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .form-actions-inline {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding-top: 1.5rem;
  }

  .checkbox-label input[type='checkbox'] {
    width: auto;
    min-width: 1.125rem;
    min-height: 1.125rem;
  }

  /* ========================================
     Fields List — Mobile-first responsive
     ======================================== */
  .fields-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-bottom: 1rem;
  }

  .field-item {
    border: 1px solid var(--color-border-primary);
    border-radius: 10px;
    overflow: hidden;
    transition:
      border-color var(--transition-normal),
      box-shadow var(--transition-normal);
  }

  .field-item.editing {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  .field-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem;
    cursor: pointer;
    background: var(--color-bg-secondary);
    transition: background-color var(--transition-normal);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .field-header:hover {
    background: var(--color-bg-tertiary);
  }

  .field-header:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }

  /* Reorder controls */
  .field-reorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }

  .btn-reorder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 1.5rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-muted);
    border-radius: 4px;
    padding: 0;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
  }

  .btn-reorder:hover:not(:disabled) {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .btn-reorder:active:not(:disabled) {
    background: var(--color-bg-primary);
  }

  .btn-reorder:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  .field-position {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-muted);
    line-height: 1;
    min-width: 1rem;
    text-align: center;
    transition: color var(--transition-normal);
  }

  /* Field summary — name, badges, slug */
  .field-summary {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-summary-top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .field-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-badges {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
  }

  .field-type-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 6px;
    font-size: 0.6875rem;
    font-weight: 500;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    color: var(--color-primary);
    text-transform: capitalize;
    white-space: nowrap;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal);
  }

  .field-required-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 6px;
    font-size: 0.6875rem;
    font-weight: 500;
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
    color: var(--color-danger);
    white-space: nowrap;
  }

  .field-slug {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--transition-normal);
  }

  /* Field actions (delete + expand chevron) */
  .field-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-field-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-muted);
    border-radius: 8px;
    padding: 0;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
  }

  .btn-field-delete:hover {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  }

  .field-expand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    color: var(--color-text-muted);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .field-expand-icon.expanded {
    transform: rotate(180deg);
  }

  /* Field details (expanded editor) */
  .field-details {
    padding: 1rem;
    border-top: 1px solid var(--color-border-primary);
    background: var(--color-bg-primary);
    transition:
      border-color var(--transition-normal),
      background-color var(--transition-normal);
  }

  /* Empty state */
  .empty-fields {
    text-align: center;
    padding: 2.5rem 1.5rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  .empty-icon {
    color: var(--color-text-muted);
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-fields p {
    margin: 0 0 0.375rem 0;
    font-size: 0.9375rem;
  }

  .empty-fields .empty-hint {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin-bottom: 1.25rem;
  }

  /* Config fieldsets */
  .config-fieldset {
    border: 1px solid var(--color-border-primary);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 0.75rem;
    transition: border-color var(--transition-normal);
  }

  .config-fieldset legend {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    padding: 0 0.375rem;
    transition: color var(--transition-normal);
  }

  .form-row-3 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .form-row-4 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 1rem;
  }

  /* Selection options editor */
  .options-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .option-input {
    flex: 1;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--color-border-primary);
    border-radius: 6px;
    font-size: 0.875rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    box-sizing: border-box;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .option-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .option-input::placeholder {
    color: var(--color-text-muted);
  }

  /* Checkbox group (inline checkboxes) */
  .checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .checkbox-label.inline {
    padding-top: 0;
    font-size: 0.8125rem;
  }

  /* Danger zone */
  .danger-zone {
    border-color: var(--color-danger);
    border-style: dashed;
  }

  .danger-zone h2 {
    color: var(--color-danger);
  }

  .danger-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .danger-info strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .danger-info p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    transition: color var(--transition-normal);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    min-height: 2.75rem;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal),
      border-color var(--transition-normal),
      transform var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border-color: var(--color-border-primary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    border: none;
    padding: 0.5rem;
  }

  .btn-ghost:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-secondary);
  }

  .btn-danger {
    background: var(--color-danger);
    color: var(--color-text-inverse);
    flex-shrink: 0;
  }

  .btn-danger:hover {
    background: var(--color-danger-hover);
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    min-height: 2.25rem;
  }

  /* === Tablet (768px+) === */
  @media (min-width: 768px) {
    .edit-page {
      padding: 1.5rem;
    }

    .page-header {
      flex-direction: row;
      align-items: center;
    }

    .header-info h1 {
      font-size: 1.5rem;
    }

    .settings-section {
      padding: 1.5rem;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      font-size: 0.875rem;
    }

    .form-row {
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-3 {
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    .form-row-4 {
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 1rem;
    }

    .field-header {
      gap: 0.75rem;
      padding: 0.75rem 1rem;
    }

    .field-summary-top {
      flex-wrap: nowrap;
    }

    .field-details {
      padding: 1.25rem;
    }

    .danger-content {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  /* === Desktop (1024px+) === */
  @media (min-width: 1024px) {
    .edit-page {
      padding: 2rem;
    }

    .btn-reorder {
      width: 1.75rem;
      height: 1.25rem;
    }

    .btn-field-action {
      width: 2rem;
      height: 2rem;
    }
  }
</style>
