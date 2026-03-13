<script lang="ts">
  import { toastStore } from '$lib/stores/toast';
  import { confirmStore } from '$lib/stores/confirm';
  import type { ProductCustomizationZone } from '$lib/types/customization';

  export let productId: string;
  export let productImage: string;

  let zones: ProductCustomizationZone[] = [];
  let loading = true;
  let saving = false;

  // Editing state
  let editingZone: ProductCustomizationZone | null = null;
  let formName = '';
  let formX = 10;
  let formY = 10;
  let formW = 30;
  let formH = 30;
  let formMaxFileSize = 10;
  let showForm = false;

  async function loadZones(): Promise<void> {
    try {
      const res = await fetch(
        `/api/admin/customization-zones?productId=${encodeURIComponent(productId)}`
      );
      if (res.ok) {
        zones = await res.json();
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      loading = false;
    }
  }

  function startAdd(): void {
    editingZone = null;
    formName = '';
    formX = 10;
    formY = 10;
    formW = 30;
    formH = 30;
    formMaxFileSize = 10;
    showForm = true;
  }

  function startEdit(zone: ProductCustomizationZone): void {
    editingZone = zone;
    formName = zone.name;
    formX = zone.xPercent;
    formY = zone.yPercent;
    formW = zone.widthPercent;
    formH = zone.heightPercent;
    formMaxFileSize = zone.maxFileSize / 1024 / 1024;
    showForm = true;
  }

  function cancelForm(): void {
    showForm = false;
    editingZone = null;
  }

  async function saveZone(): Promise<void> {
    if (!formName.trim()) {
      toastStore.error('Zone name is required');
      return;
    }

    saving = true;
    try {
      if (editingZone) {
        const res = await fetch('/api/admin/customization-zones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingZone.id,
            name: formName.trim(),
            xPercent: formX,
            yPercent: formY,
            widthPercent: formW,
            heightPercent: formH,
            maxFileSize: Math.round(formMaxFileSize * 1024 * 1024)
          })
        });
        if (!res.ok) throw new Error('Failed to update zone');
        toastStore.success('Zone updated');
      } else {
        const res = await fetch('/api/admin/customization-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            name: formName.trim(),
            xPercent: formX,
            yPercent: formY,
            widthPercent: formW,
            heightPercent: formH,
            maxFileSize: Math.round(formMaxFileSize * 1024 * 1024)
          })
        });
        if (!res.ok) throw new Error('Failed to create zone');
        toastStore.success('Zone added');
      }

      showForm = false;
      editingZone = null;
      await loadZones();
    } catch (err) {
      console.error('Failed to save zone:', err);
      toastStore.error('Failed to save zone');
    } finally {
      saving = false;
    }
  }

  async function deleteZone(zone: ProductCustomizationZone): Promise<void> {
    const confirmed = await confirmStore.show(`Delete customization zone "${zone.name}"?`, {
      title: 'Delete Zone',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/customization-zones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: zone.id })
      });
      if (!res.ok) throw new Error('Failed to delete zone');
      toastStore.success('Zone deleted');
      await loadZones();
    } catch (err) {
      console.error('Failed to delete zone:', err);
      toastStore.error('Failed to delete zone');
    }
  }

  // Load zones when component mounts
  loadZones();
</script>

<div class="zone-editor">
  <div class="zone-editor-header">
    <h4>Customization Zones</h4>
    <p class="helper-text">
      Define areas on the product image where customers can upload and preview their designs
    </p>
  </div>

  <!-- Preview with zone overlays -->
  <div class="zone-preview">
    <img src={productImage} alt="Product preview" class="preview-image" />
    {#each zones as zone (zone.id)}
      <button
        class="zone-overlay-admin"
        class:editing={editingZone?.id === zone.id}
        style="left: {zone.xPercent}%; top: {zone.yPercent}%; width: {zone.widthPercent}%; height: {zone.heightPercent}%;"
        on:click={() => startEdit(zone)}
        title="Click to edit: {zone.name}"
      >
        <span class="zone-label-admin">{zone.name}</span>
      </button>
    {/each}
    {#if showForm}
      <div
        class="zone-overlay-preview"
        style="left: {formX}%; top: {formY}%; width: {formW}%; height: {formH}%;"
      >
        <span class="zone-label-admin">{formName || 'New Zone'}</span>
      </div>
    {/if}
  </div>

  <!-- Zone List -->
  {#if loading}
    <p class="loading-text">Loading zones...</p>
  {:else if zones.length === 0 && !showForm}
    <p class="empty-text">
      No customization zones yet. Add one to let customers personalize this product.
    </p>
  {:else}
    <div class="zone-list">
      {#each zones as zone (zone.id)}
        <div class="zone-item">
          <div class="zone-info">
            <span class="zone-item-name">{zone.name}</span>
            <span class="zone-item-pos">
              ({zone.xPercent}%, {zone.yPercent}%) {zone.widthPercent}% x {zone.heightPercent}%
            </span>
          </div>
          <div class="zone-actions">
            <button class="edit-btn" on:click={() => startEdit(zone)} title="Edit zone">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="delete-btn" on:click={() => deleteZone(zone)} title="Delete zone">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Add/Edit Form -->
  {#if showForm}
    <div class="zone-form">
      <h5>{editingZone ? 'Edit Zone' : 'Add Zone'}</h5>
      <div class="form-row">
        <label for="zone-name">Name</label>
        <input
          id="zone-name"
          type="text"
          bind:value={formName}
          placeholder="e.g. Front Logo, Back Print"
        />
      </div>
      <div class="form-row-grid">
        <div class="form-field">
          <label for="zone-x">X Position (%)</label>
          <input id="zone-x" type="number" bind:value={formX} min="0" max="100" step="1" />
        </div>
        <div class="form-field">
          <label for="zone-y">Y Position (%)</label>
          <input id="zone-y" type="number" bind:value={formY} min="0" max="100" step="1" />
        </div>
        <div class="form-field">
          <label for="zone-w">Width (%)</label>
          <input id="zone-w" type="number" bind:value={formW} min="5" max="100" step="1" />
        </div>
        <div class="form-field">
          <label for="zone-h">Height (%)</label>
          <input id="zone-h" type="number" bind:value={formH} min="5" max="100" step="1" />
        </div>
      </div>
      <div class="form-row">
        <label for="zone-max-size">Max Upload Size (MB)</label>
        <input
          id="zone-max-size"
          type="number"
          bind:value={formMaxFileSize}
          min="1"
          max="50"
          step="1"
        />
      </div>
      <div class="form-buttons">
        <button class="cancel-form-btn" on:click={cancelForm}>Cancel</button>
        <button class="save-form-btn" on:click={saveZone} disabled={saving}>
          {saving ? 'Saving...' : editingZone ? 'Update Zone' : 'Add Zone'}
        </button>
      </div>
    </div>
  {:else}
    <button class="add-zone-btn" on:click={startAdd}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Customization Zone
    </button>
  {/if}
</div>

<style>
  .zone-editor {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .zone-editor-header h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text-primary);
  }

  .helper-text {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: var(--color-text-tertiary);
  }

  .zone-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-border-secondary);
  }

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .zone-overlay-admin {
    position: absolute;
    border: 2px dashed var(--color-primary, #6366f1);
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.1);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .zone-overlay-admin:hover {
    background: rgba(99, 102, 241, 0.2);
  }

  .zone-overlay-admin.editing {
    border-color: var(--color-success, #10b981);
    border-style: solid;
    background: rgba(16, 185, 129, 0.15);
  }

  .zone-overlay-preview {
    position: absolute;
    border: 2px solid var(--color-warning, #f59e0b);
    border-radius: 4px;
    background: rgba(245, 158, 11, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .zone-label-admin {
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90%;
  }

  .loading-text,
  .empty-text {
    font-size: 0.85rem;
    color: var(--color-text-tertiary);
    text-align: center;
    padding: 1rem;
  }

  .zone-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .zone-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-accent);
    border-radius: 6px;
    border: 1px solid var(--color-border-secondary);
  }

  .zone-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .zone-item-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text-primary);
  }

  .zone-item-pos {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    font-family: monospace;
  }

  .zone-actions {
    display: flex;
    gap: 0.25rem;
  }

  .edit-btn,
  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      color 0.2s,
      border-color 0.2s;
  }

  .edit-btn:hover {
    color: var(--color-primary, #6366f1);
    border-color: var(--color-primary, #6366f1);
  }

  .delete-btn:hover {
    color: var(--color-error, #ef4444);
    border-color: var(--color-error, #ef4444);
  }

  .zone-form {
    padding: 1rem;
    background: var(--color-bg-accent);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
  }

  .zone-form h5 {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    color: var(--color-text-primary);
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .form-row label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .form-row input {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 0.85rem;
  }

  .form-row-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-field label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .form-field input {
    padding: 0.35rem 0.4rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 0.8rem;
    width: 100%;
  }

  .form-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .cancel-form-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    cursor: pointer;
  }

  .save-form-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    background: var(--color-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .save-form-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .add-zone-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.6rem;
    border: 2px dashed var(--color-border-secondary);
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    transition:
      color 0.2s,
      border-color 0.2s;
  }

  .add-zone-btn:hover {
    color: var(--color-primary, #6366f1);
    border-color: var(--color-primary, #6366f1);
  }

  @media (max-width: 768px) {
    .form-row-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
