<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { Notification } from '$lib/types/notifications';

  export let notifications: Notification[] = [];
  export let unreadCount: number = 0;

  let showPanel = false;
  let loading = false;

  // Sort notifications: unread first, then by created_at
  $: sortedNotifications = [...notifications].sort((a, b) => {
    if (a.is_read !== b.is_read) {
      return a.is_read - b.is_read; // unread (0) before read (1)
    }
    return b.created_at - a.created_at; // newest first
  });

  function togglePanel() {
    showPanel = !showPanel;
  }

  function closePanel() {
    showPanel = false;
  }

  function getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  function getNotificationIcon(type: string): string {
    switch (type) {
      case 'account_expiring':
        return '⏰';
      case 'account_expired':
        return '🚫';
      case 'account_deactivated':
        return '⛔';
      case 'permission_changed':
        return '🔑';
      case 'role_updated':
        return '👤';
      case 'password_reset':
        return '🔒';
      case 'system_announcement':
        return '📢';
      default:
        return '📩';
    }
  }

  function formatRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) {
      return 'Just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}m ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h ago`;
    } else if (diff < 604800) {
      const days = Math.floor(diff / 86400);
      return `${days}d ago`;
    } else {
      return new Date(timestamp * 1000).toLocaleDateString();
    }
  }

  async function markAsRead(notificationId: string) {
    loading = true;
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_id: notificationId
        })
      });

      if (response.ok) {
        // Update the notification in the list
        notifications = notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: 1, read_at: Math.floor(Date.now() / 1000) } : n
        );
        unreadCount = Math.max(0, unreadCount - 1);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      loading = false;
    }
  }

  async function markAllAsRead() {
    loading = true;
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mark_all: true
        })
      });

      if (response.ok) {
        // Update all notifications
        notifications = notifications.map((n) => ({
          ...n,
          is_read: 1,
          read_at: Math.floor(Date.now() / 1000)
        }));
        unreadCount = 0;
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      loading = false;
    }
  }

  function handleNotificationClick(notification: Notification): void {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      closePanel();
      goto(notification.action_url);
    }
  }

  // Close panel when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-center')) {
      closePanel();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="notification-center">
  <button class="notification-button" on:click={togglePanel} aria-label="Notifications">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
    {#if unreadCount > 0}
      <span class="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
    {/if}
  </button>

  {#if showPanel}
    <div class="notification-panel">
      <div class="panel-header">
        <h3>Notifications</h3>
        {#if unreadCount > 0}
          <button class="btn-mark-all" on:click={markAllAsRead} disabled={loading}>
            Mark all read
          </button>
        {/if}
      </div>

      <div class="panel-body">
        {#if notifications.length === 0}
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke-width="2" stroke-linecap="round"></path>
            </svg>
            <p>No notifications</p>
          </div>
        {:else}
          {#each sortedNotifications as notification (notification.id)}
            <button
              class="notification-item {getPriorityClass(notification.priority)}"
              class:unread={!notification.is_read}
              on:click={() => handleNotificationClick(notification)}
              disabled={loading}
            >
              <div class="notification-icon">{getNotificationIcon(notification.type)}</div>
              <div class="notification-content">
                <div class="notification-header">
                  <span class="notification-title">{notification.title}</span>
                  <span class="notification-time"
                    >{formatRelativeTime(notification.created_at)}</span
                  >
                </div>
                <p class="notification-message">{notification.message}</p>
                {#if !notification.is_read}
                  <span class="unread-indicator">●</span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notification-center {
    position: relative;
  }

  .notification-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--color-text);
  }

  .notification-button:hover {
    background: var(--color-background-hover);
  }

  .notification-badge {
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.25rem;
    background: var(--color-danger);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification-panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    width: min(400px, 90vw);
    max-height: 80vh;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    box-shadow: 0 4px 12px var(--color-shadow-medium);
    display: flex;
    flex-direction: column;
    z-index: 1000;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .btn-mark-all {
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-mark-all:hover:not(:disabled) {
    background: var(--color-background-hover);
  }

  .btn-mark-all:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .panel-body {
    overflow-y: auto;
    max-height: calc(80vh - 4rem);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary);
  }

  .empty-state svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .notification-item {
    width: 100%;
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: transparent;
    /* Inherit, or the global filled-button colour makes this unreadable. */
    color: inherit;
    border: none;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .notification-item:hover:not(:disabled) {
    background: var(--color-background-hover);
  }

  .notification-item:disabled {
    cursor: not-allowed;
  }

  .notification-item.unread {
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }

  .notification-item.priority-urgent {
    border-left: 3px solid var(--color-danger);
  }

  .notification-item.priority-high {
    border-left: 3px solid var(--color-warning);
  }

  .notification-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .notification-content {
    flex: 1;
    min-width: 0;
    position: relative;
  }

  .notification-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .notification-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-text);
    flex: 1;
  }

  .notification-time {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .notification-message {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .unread-indicator {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-primary);
    font-size: 0.5rem;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .notification-panel {
      right: -1rem;
      width: calc(100vw - 2rem);
    }
  }
</style>
