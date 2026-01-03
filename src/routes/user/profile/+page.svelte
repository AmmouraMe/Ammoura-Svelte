<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { toastStore } from '$lib/stores/toast';
  import Button from '$lib/components/Button.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import type { PageData, ActionData } from './$types';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;
  export let form: ActionData;

  let isUpdatingProfile = false;
  let isChangingPassword = false;

  // Form values (initialized from user data)
  let name = data.user.name;
  let email = data.user.email;

  // Password fields
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';

  // Helper to safely access error fields
  function getError(errors: Record<string, string> | undefined, key: string): string | undefined {
    return errors?.[key];
  }

  // Reset password fields on successful change
  $: if (form?.passwordSuccess) {
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    toastStore.success('Password changed successfully');
  }

  // Show success toast for profile update
  $: if (form?.success) {
    toastStore.success('Profile updated successfully');
  }

  // Update form values when data changes
  $: {
    name = data.user.name;
    email = data.user.email;
  }

  function formatDate(timestamp: number | null): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'badge-admin';
      case 'platform_engineer':
        return 'badge-engineer';
      case 'user':
        return 'badge-user';
      case 'customer':
        return 'badge-customer';
      default:
        return 'badge-default';
    }
  }

  function formatRole(role: string): string {
    switch (role) {
      case 'platform_engineer':
        return 'Platform Engineer';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }
</script>

<svelte:head>
  <title>My Profile - {$page.data.storeName || 'Hermes eCommerce'}</title>
</svelte:head>

<div class="profile-container">
  <div class="profile-header">
    <Avatar name={data.user.name} size="large" variant="primary" />
    <div class="header-info">
      <h1>{data.user.name}</h1>
      <p class="email">{data.user.email}</p>
      <span class="role-badge {getRoleBadgeClass(data.user.role)}">
        {formatRole(data.user.role)}
      </span>
    </div>
  </div>

  <div class="profile-content">
    <!-- Profile Information Section -->
    <section class="profile-section">
      <h2>Profile Information</h2>
      <form
        method="POST"
        action="?/updateProfile"
        use:enhance={() => {
          isUpdatingProfile = true;
          return async ({ update }) => {
            await update();
            await invalidateAll();
            isUpdatingProfile = false;
          };
        }}
      >
        {#if getError(form?.errors, 'general')}
          <div class="error-message">{getError(form?.errors, 'general')}</div>
        {/if}

        <div class="form-group">
          <label for="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            bind:value={name}
            placeholder="Your full name"
            required
          />
          {#if getError(form?.errors, 'name')}
            <span class="field-error">{getError(form?.errors, 'name')}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            bind:value={email}
            placeholder="your@email.com"
            required
          />
          {#if getError(form?.errors, 'email')}
            <span class="field-error">{getError(form?.errors, 'email')}</span>
          {/if}
        </div>

        <div class="form-actions">
          <Button type="submit" variant="primary" disabled={isUpdatingProfile}>
            {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </section>

    <!-- Account Details Section -->
    <section class="profile-section">
      <h2>Account Details</h2>
      <div class="details-grid">
        <div class="detail-item">
          <span class="label">Account ID</span>
          <span class="value">{data.user.id}</span>
        </div>
        <div class="detail-item">
          <span class="label">Status</span>
          <span class="value status-{data.user.status}">{data.user.status}</span>
        </div>
        <div class="detail-item">
          <span class="label">Member Since</span>
          <span class="value">{formatDate(data.user.created_at)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Last Login</span>
          <span class="value">{formatDate(data.user.last_login_at)}</span>
        </div>
        {#if data.user.expiration_date}
          <div class="detail-item">
            <span class="label">Account Expires</span>
            <span class="value">{formatDate(data.user.expiration_date)}</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Change Password Section -->
    <section class="profile-section">
      <h2>Change Password</h2>
      <form
        method="POST"
        action="?/changePassword"
        use:enhance={() => {
          isChangingPassword = true;
          return async ({ update }) => {
            await update();
            isChangingPassword = false;
          };
        }}
      >
        {#if getError(form?.passwordErrors, 'general')}
          <div class="error-message">{getError(form?.passwordErrors, 'general')}</div>
        {/if}

        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            bind:value={currentPassword}
            placeholder="Enter your current password"
            autocomplete="current-password"
            required
          />
          {#if getError(form?.passwordErrors, 'currentPassword')}
            <span class="field-error">{getError(form?.passwordErrors, 'currentPassword')}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            bind:value={newPassword}
            placeholder="Enter your new password (min 12 characters)"
            autocomplete="new-password"
            required
            minlength="12"
          />
          {#if getError(form?.passwordErrors, 'newPassword')}
            <span class="field-error">{getError(form?.passwordErrors, 'newPassword')}</span>
          {/if}
          <span class="field-hint">Password must be at least 12 characters long</span>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            bind:value={confirmPassword}
            placeholder="Confirm your new password"
            autocomplete="new-password"
            required
          />
          {#if getError(form?.passwordErrors, 'confirmPassword')}
            <span class="field-error">{getError(form?.passwordErrors, 'confirmPassword')}</span>
          {/if}
        </div>

        <div class="form-actions">
          <Button type="submit" variant="primary" disabled={isChangingPassword}>
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </section>
  </div>
</div>

<style>
  .profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 12px;
    margin-bottom: 2rem;
  }

  .header-info h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
    color: var(--text-primary, #1a1a1a);
  }

  .header-info .email {
    margin: 0 0 0.5rem 0;
    color: var(--text-secondary, #666);
  }

  .role-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-admin {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-engineer {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-user {
    background: #dcfce7;
    color: #166534;
  }

  .badge-customer {
    background: #f3e8ff;
    color: #6b21a8;
  }

  .badge-default {
    background: #f3f4f6;
    color: #374151;
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-section {
    background: var(--bg-primary, #fff);
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .profile-section h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    color: var(--text-primary, #1a1a1a);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-primary, #e5e7eb);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary, #1a1a1a);
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-primary, #d1d5db);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #1a1a1a);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .field-error {
    display: block;
    margin-top: 0.25rem;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .field-hint {
    display: block;
    margin-top: 0.25rem;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .form-actions {
    margin-top: 1.5rem;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-item .label {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .detail-item .value {
    font-weight: 500;
    color: var(--text-primary, #1a1a1a);
  }

  .status-active {
    color: #059669;
  }

  .status-inactive,
  .status-expired,
  .status-suspended {
    color: #dc2626;
  }

  @media (max-width: 640px) {
    .profile-container {
      padding: 1rem;
    }

    .profile-header {
      flex-direction: column;
      text-align: center;
      padding: 1.5rem;
    }

    .details-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
