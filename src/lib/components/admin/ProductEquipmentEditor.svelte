<script lang="ts">
  import { onMount } from 'svelte';
  import { toastStore } from '$lib/stores/toast';
  import { confirmStore } from '$lib/stores/confirm';
  import type { EquipmentWithFields } from '$lib/types/equipment';

  export let productId: string;

  interface EquipmentSummary {
    id: string;
    name: string;
    description: string | null;
  }

  let allEquipment: EquipmentSummary[] = [];
  let productEquipment: EquipmentWithFields[] = [];
  let loading = true;

  $: assignedIds = new Set(productEquipment.map((eq) => eq.id));
  $: availableEquipment = allEquipment.filter((eq) => !assignedIds.has(eq.id));

  async function loadData(): Promise<void> {
    try {
      const [allRes, prodRes] = await Promise.all([
        fetch('/api/admin/equipment'),
        fetch(`/api/admin/product-equipment?productId=${encodeURIComponent(productId)}`)
      ]);

      if (allRes.ok) {
        allEquipment = await allRes.json();
      }
      if (prodRes.ok) {
        productEquipment = await prodRes.json();
      }
    } catch (err) {
      console.error('Failed to load equipment data:', err);
    } finally {
      loading = false;
    }
  }

  onMount(loadData);

  async function addEquipment(equipmentId: string): Promise<void> {
    try {
      const res = await fetch('/api/admin/product-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, equipmentId })
      });

      if (res.ok) {
        toastStore.success('Equipment added to product');
        await loadData();
      } else {
        const data = (await res.json()) as { error?: string };
        toastStore.error(data.error || 'Failed to add equipment');
      }
    } catch (err) {
      console.error('Failed to add equipment:', err);
      toastStore.error('Failed to add equipment');
    }
  }

  async function removeEquipment(equipmentId: string, equipmentName: string): Promise<void> {
    const confirmed = await confirmStore.show(`Remove "${equipmentName}" from this product?`, {
      title: 'Remove Equipment',
      confirmText: 'Remove',
      cancelText: 'Keep',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/product-equipment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, equipmentId })
      });

      if (res.ok) {
        toastStore.success('Equipment removed from product');
        await loadData();
      } else {
        const data = (await res.json()) as { error?: string };
        toastStore.error(data.error || 'Failed to remove equipment');
      }
    } catch (err) {
      console.error('Failed to remove equipment:', err);
      toastStore.error('Failed to remove equipment');
    }
  }
</script>

<div class="equipment-editor">
  <h3>Equipment Requirements</h3>
  <p class="section-description">
    Assign equipment that customers need for this product. Customers will fill in the required
    information at checkout.
  </p>

  {#if loading}
    <p class="loading">Loading equipment...</p>
  {:else}
    <!-- Currently assigned equipment -->
    {#if productEquipment.length > 0}
      <div class="assigned-equipment">
        <h4>Assigned Equipment</h4>
        {#each productEquipment as eq (eq.id)}
          <div class="equipment-card">
            <div class="equipment-card-info">
              <strong>{eq.name}</strong>
              {#if eq.description}
                <span class="equipment-desc">{eq.description}</span>
              {/if}
              <span class="field-count">
                {eq.fields.length} field{eq.fields.length !== 1 ? 's' : ''}
                ({eq.fields.filter((f) => f.required).length} required)
              </span>
            </div>
            <button
              type="button"
              class="remove-btn"
              on:click={() => removeEquipment(eq.id, eq.name)}
              title="Remove equipment"
            >
              ✕
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="no-equipment">No equipment assigned to this product.</p>
    {/if}

    <!-- Available equipment to add -->
    {#if availableEquipment.length > 0}
      <div class="available-equipment">
        <h4>Available Equipment</h4>
        {#each availableEquipment as eq (eq.id)}
          <div class="equipment-card available">
            <div class="equipment-card-info">
              <strong>{eq.name}</strong>
              {#if eq.description}
                <span class="equipment-desc">{eq.description}</span>
              {/if}
            </div>
            <button type="button" class="add-btn" on:click={() => addEquipment(eq.id)}>
              + Add
            </button>
          </div>
        {/each}
      </div>
    {:else if allEquipment.length === 0}
      <p class="no-equipment">
        No equipment defined yet.
        <a href="/admin/equipment">Create equipment</a> first.
      </p>
    {/if}
  {/if}
</div>

<style>
  .equipment-editor {
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.25rem;
    background: var(--color-bg-tertiary);
  }

  .equipment-editor h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
  }

  .section-description {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin: 0 0 1rem;
  }

  .loading {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .assigned-equipment,
  .available-equipment {
    margin-bottom: 1rem;
  }

  .assigned-equipment h4,
  .available-equipment h4 {
    font-size: 0.9rem;
    margin: 0 0 0.5rem;
    color: var(--color-text-secondary);
  }

  .equipment-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    background: var(--color-bg-secondary);
  }

  .equipment-card.available {
    border-style: dashed;
  }

  .equipment-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .equipment-card-info strong {
    font-size: 0.9rem;
  }

  .equipment-desc {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }

  .field-count {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }

  .remove-btn {
    background: var(--color-danger);
    color: #fff;
    border: none;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-btn:hover {
    opacity: 0.9;
  }

  .add-btn {
    background: var(--color-primary);
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .add-btn:hover {
    opacity: 0.9;
  }

  .no-equipment {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    font-style: italic;
  }

  .no-equipment a {
    color: var(--color-primary);
  }
</style>
