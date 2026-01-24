<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  // Form state
  let formData = {
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    status: data.user.status,
    expiration_date: data.user.expiration_date
      ? new Date(data.user.expiration_date * 1000).toISOString().split('T')[0]
      : '',
    grace_period_days: data.user.grace_period_days || 0,
    permissions: data.user.permissions as string[],
    new_password: '',
    confirm_password: ''
  };

  let isSubmitting = false;
  let passwordError = '';
  let permissionsJson = JSON.stringify(formData.permissions);

  // Update permissionsJson whenever permissions change
  $: permissionsJson = JSON.stringify(formData.permissions);

  // Helper to safely access form errors
  const getError = (field: string): string | undefined => {
    if (!form?.errors) return undefined;
    return (form.errors as Record<string, string>)[field];
  };

  // Available permissions
  const availablePermissions = [
    { id: 'orders:read', label: 'View Orders', category: 'Orders' },
    { id: 'orders:write', label: 'Create/Edit Orders', category: 'Orders' },
    { id: 'orders:delete', label: 'Delete Orders', category: 'Orders' },
    { id: 'orders:refund', label: 'Process Refunds', category: 'Orders' },
    { id: 'products:read', label: 'View Products', category: 'Products' },
    { id: 'products:write', label: 'Create/Edit Products', category: 'Products' },
    { id: 'products:delete', label: 'Delete Products', category: 'Products' },
    { id: 'reports:read', label: 'View Reports', category: 'Reports' },
    { id: 'reports:export', label: 'Export Reports', category: 'Reports' },
    { id: 'settings:read', label: 'View Settings', category: 'Settings' },
    { id: 'settings:write', label: 'Modify Settings', category: 'Settings' },
    { id: 'users:read', label: 'View Users', category: 'Users' },
    { id: 'users:write', label: 'Create/Edit Users', category: 'Users' },
    { id: 'users:delete', label: 'Delete Users', category: 'Users' },
    { id: 'users:roles', label: 'Manage User Roles', category: 'Users' },
    { id: 'pages:read', label: 'View Pages', category: 'Pages' },
    { id: 'pages:write', label: 'Create/Edit Pages', category: 'Pages' },
    { id: 'pages:publish', label: 'Publish Pages', category: 'Pages' },
    { id: 'logs:read', label: 'View Logs', category: 'Logs' }
  ];

  // Group permissions by category
  const permissionsByCategory = availablePermissions.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    },
    {} as Record<string, typeof availablePermissions>
  );

  function togglePermission(permissionId: string): void {
    if (formData.permissions.includes(permissionId)) {
      formData.permissions = formData.permissions.filter((p) => p !== permissionId);
    } else {
      formData.permissions = [...formData.permissions, permissionId];
    }
  }

  function validatePasswords(): boolean {
    passwordError = '';

    if (formData.new_password || formData.confirm_password) {
      if (formData.new_password !== formData.confirm_password) {
        passwordError = 'Passwords do not match';
        return false;
      }
      if (formData.new_password.length < 8) {
        passwordError = 'Password must be at least 8 characters';
        return false;
      }
    }

    return true;
  }

  function handleSubmit(event: Event): void {
    if (!validatePasswords()) {
      event.preventDefault();
    }
  }
</script>

<svelte:head>
  <title>Edit User - {data.user.name}</title>
</svelte:head>

<div class="user-edit-page">
  <div class="page-header">
    <h1>Edit User</h1>
    <div class="breadcrumb">
      <a href="/admin/dashboard">Dashboard</a>
      <span>/</span>
      <a href="/admin/users">Users</a>
      <span>/</span>
      <a href="/admin/users/{data.user.id}">{data.user.name}</a>
      <span>/</span>
      <span>Edit</span>
    </div>
  </div>

  <div class="form-container">
    <form
      method="POST"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          if (result.type === 'redirect') {
            // Let SvelteKit handle the redirect
            await update();
          } else if (result.type === 'failure') {
            // Handle validation errors
            await update();
            isSubmitting = false;
          } else {
            // Handle other cases
            await update();
            isSubmitting = false;
          }
        };
      }}
      on:submit={handleSubmit}
    >
      {#if getError('submit')}
        <div class="error-banner">
          {getError('submit')}
        </div>
      {/if}

      <!-- Basic Information -->
      <div class="form-section">
        <h2>Basic Information</h2>

        <div class="form-group">
          <label for="email">
            Email <span class="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            bind:value={formData.email}
            required
            class:error={getError('email')}
          />
          {#if getError('email')}
            <span class="error-message">{getError('email')}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="name">
            Name <span class="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            bind:value={formData.name}
            required
            class:error={getError('name')}
          />
          {#if getError('name')}
            <span class="error-message">{getError('name')}</span>
          {/if}
        </div>
      </div>

      <!-- Role and Status -->
      <div class="form-section">
        <h2>Role & Status</h2>

        <div class="form-row">
          <div class="form-group">
            <label for="role">
              Role <span class="required">*</span>
            </label>
            <select
              id="role"
              name={data.currentUser.canManageRoles ? 'role' : undefined}
              bind:value={formData.role}
              required
              disabled={!data.currentUser.canManageRoles}
              class:error={getError('role')}
            >
              <option value="customer">Customer</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="platform_engineer">Platform Engineer</option>
            </select>
            {#if !data.currentUser.canManageRoles}
              <input type="hidden" name="role" value={formData.role} />
            {/if}
            {#if getError('role')}
              <span class="error-message">{getError('role')}</span>
            {/if}
            {#if !data.currentUser.canManageRoles}
              <span class="help-text">You don't have permission to change roles</span>
            {/if}
          </div>

          <div class="form-group">
            <label for="status">
              Status <span class="required">*</span>
            </label>
            <select
              id="status"
              name="status"
              bind:value={formData.status}
              required
              class:error={getError('status')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            {#if getError('status')}
              <span class="error-message">{getError('status')}</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Account Expiration -->
      <div class="form-section">
        <h2>Account Expiration</h2>

        <div class="form-row">
          <div class="form-group">
            <label for="expiration_date">Expiration Date</label>
            <input
              type="date"
              id="expiration_date"
              name="expiration_date"
              bind:value={formData.expiration_date}
              class:error={getError('expiration_date')}
            />
            <span class="help-text">Leave empty for no expiration</span>
            {#if getError('expiration_date')}
              <span class="error-message">{getError('expiration_date')}</span>
            {/if}
          </div>

          <div class="form-group">
            <label for="grace_period_days">Grace Period (days)</label>
            <input
              type="number"
              id="grace_period_days"
              name="grace_period_days"
              bind:value={formData.grace_period_days}
              min="0"
              class:error={getError('grace_period_days')}
            />
            <span class="help-text">Days after expiration before account is locked</span>
            {#if getError('grace_period_days')}
              <span class="error-message">{getError('grace_period_days')}</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Password Change -->
      <div class="form-section">
        <h2>Change Password</h2>
        <p class="section-description">Leave empty to keep current password</p>

        <div class="form-row">
          <div class="form-group">
            <label for="new_password">New Password</label>
            <div class="password-input-wrapper">
              <input
                type="password"
                id="new_password"
                name="new_password"
                bind:value={formData.new_password}
                class:error={passwordError}
              />
            </div>
            <span class="help-text">Minimum 8 characters</span>
          </div>

          <div class="form-group">
            <label for="confirm_password">Confirm Password</label>
            <div class="password-input-wrapper">
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                bind:value={formData.confirm_password}
                class:error={passwordError}
              />
            </div>
          </div>
        </div>

        {#if passwordError}
          <span class="error-message">{passwordError}</span>
        {/if}
      </div>

      <!-- Permissions -->
      <div class="form-section">
        <h2>Permissions</h2>
        <p class="section-description">
          Select specific permissions for this user. Role-based permissions will also apply.
        </p>

        <input type="hidden" name="permissions" bind:value={permissionsJson} />

        <div class="permissions-grid">
          {#each Object.entries(permissionsByCategory) as [category, permissions]}
            <div class="permission-category">
              <h3>{category}</h3>
              <div class="permission-list">
                {#each permissions as permission}
                  <label class="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission.id)}
                      on:change={() => togglePermission(permission.id)}
                    />
                    <span>{permission.label}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <a href="/admin/users/{data.user.id}" class="button button-secondary"> Cancel </a>
        <button type="submit" class="button button-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .user-edit-page {
    width: 100%;
    padding: 2rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .breadcrumb a {
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .breadcrumb a:hover {
    text-decoration: underline;
    color: var(--color-primary-hover);
  }

  .form-container {
    background: var(--color-bg-secondary);
    border-radius: 8px;
    box-shadow: 0 1px 3px var(--color-shadow-light);
    padding: 2rem;
    border: 1px solid var(--color-border-primary);
  }

  .error-banner {
    background: var(--color-danger-bg, #fee);
    border: 1px solid var(--color-danger-border, #fcc);
    color: var(--color-danger);
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
  }

  .form-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .form-section:last-of-type {
    border-bottom: none;
  }

  .form-section h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
  }

  .section-description {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .required {
    color: var(--color-danger);
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border-primary);
    border-radius: 6px;
    font-size: 1rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    transition: border-color var(--transition-fast);
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .form-group input.error,
  .form-group select.error {
    border-color: var(--color-danger);
  }

  .form-group input:disabled,
  .form-group select:disabled {
    background: var(--color-bg-tertiary);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .password-input-wrapper {
    position: relative;
  }

  .help-text {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  .error-message {
    display: block;
    color: var(--color-danger);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .permissions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .permission-category h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: var(--color-text-primary);
  }

  .permission-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .permission-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .permission-checkbox input[type='checkbox'] {
    width: auto;
    margin: 0;
    cursor: pointer;
  }

  .permission-checkbox span {
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }

  .button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    text-decoration: none;
    cursor: pointer;
    border: none;
    display: inline-block;
    transition: all var(--transition-fast);
  }

  .button-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .button-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .button-primary:disabled {
    background: var(--color-bg-tertiary);
    cursor: not-allowed;
    opacity: 0.5;
  }

  .button-secondary {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-primary);
  }

  .button-secondary:hover {
    background: var(--color-bg-secondary);
  }

  @media (max-width: 768px) {
    .user-edit-page {
      padding: 1rem;
    }

    .form-container {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .permissions-grid {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .button {
      width: 100%;
      text-align: center;
    }
  }
</style>
