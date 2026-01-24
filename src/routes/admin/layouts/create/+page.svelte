<script lang="ts">
  import { enhance } from '$app/forms';

  let name = '';
  let description = '';
  let slug = '';
  let isDefault = false;
  let isSubmitting = false;

  function generateSlug(): void {
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
</script>

<svelte:head>
  <title>Create Layout - Admin</title>
</svelte:head>

<div class="create-layout-page">
  <div class="page-header">
    <div>
      <h1>Create Layout</h1>
      <p class="page-description">Create a new layout for your pages</p>
    </div>
  </div>

  <form
    method="POST"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
  >
    <div class="form-section">
      <div class="form-group">
        <label for="name">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          bind:value={name}
          on:blur={generateSlug}
          required
          placeholder="e.g., Default Layout"
        />
      </div>

      <div class="form-group">
        <label for="slug">Slug *</label>
        <input
          type="text"
          id="slug"
          name="slug"
          bind:value={slug}
          required
          placeholder="e.g., default"
          pattern="[a-z0-9-]+"
          title="Only lowercase letters, numbers, and hyphens"
        />
        <p class="form-help">URL-friendly identifier (lowercase, numbers, hyphens only)</p>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          name="description"
          bind:value={description}
          rows="3"
          placeholder="Optional description"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="is_default" bind:checked={isDefault} />
          <span>Set as default layout</span>
        </label>
        <p class="form-help">New pages will use this layout by default</p>
      </div>
    </div>

    <div class="form-actions">
      <a href="/admin/layouts" class="btn btn-secondary">Cancel</a>
      <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Layout'}
      </button>
    </div>
  </form>
</div>

<style>
  .create-layout-page {
    padding: 2rem;
    width: 100%;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: var(--color-text-primary);
  }

  .page-description {
    margin: 0;
    color: var(--color-text-secondary);
  }

  form {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 2rem;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .form-group input[type='text'],
  .form-group textarea {
    padding: 0.625rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: 1rem;
  }

  .form-group input[type='text']:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .form-help {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--color-border-secondary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  @media (max-width: 768px) {
    .create-layout-page {
      padding: 1rem;
    }

    form {
      padding: 1.5rem;
    }

    .form-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
