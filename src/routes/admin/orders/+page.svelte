<script lang="ts">
  import { goto } from '$app/navigation';

  interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }

  interface Order {
    id: string;
    status: string;
    subtotal: number;
    shipping_cost: number;
    tax: number;
    total: number;
    created_at: string;
    updated_at: string;
    shipping_address: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    billing_address: Record<string, unknown>;
    payment_method: Record<string, unknown>;
    items: OrderItem[];
  }

  export let data: { orders: Order[] };

  $: orders = data.orders || [];

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'processing':
        return '#3B82F6';
      case 'shipped':
        return '#8B5CF6';
      case 'delivered':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }

  function viewOrderDetails(orderId: string): void {
    goto(`/admin/orders/${orderId}`);
  }
</script>

<svelte:head>
  <title>Orders - Admin Dashboard</title>
</svelte:head>

<div class="orders-container">
  <div class="orders-header">
    <h1>Orders</h1>
    <div class="header-stats">
      <div class="stat">
        <span class="stat-label">Total Orders</span>
        <span class="stat-value">{orders.length}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Pending</span>
        <span class="stat-value">{orders.filter((o) => o.status === 'pending').length}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Delivered</span>
        <span class="stat-value">{orders.filter((o) => o.status === 'delivered').length}</span>
      </div>
    </div>
  </div>

  {#if orders.length === 0}
    <div class="empty-state">
      <h2>No orders yet</h2>
      <p>Orders will appear here once customers complete their purchases.</p>
    </div>
  {:else}
    <div class="orders-table-container">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each orders as order}
            <tr>
              <td>
                <span class="order-id">{order.id.substring(0, 8)}...</span>
              </td>
              <td>{formatDate(order.created_at)}</td>
              <td>
                <div class="customer-info">
                  <div class="customer-name">
                    {order.shipping_address.firstName}
                    {order.shipping_address.lastName}
                  </div>
                  <div class="customer-email">{order.shipping_address.email}</div>
                </div>
              </td>
              <td>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
              <td>
                <span class="order-total">${order.total.toFixed(2)}</span>
              </td>
              <td>
                <span class="status-badge" style="background-color: {getStatusColor(order.status)}">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </td>
              <td>
                <button class="btn-view" on:click={() => viewOrderDetails(order.id)}>
                  View Details
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .orders-container {
    padding: 2rem;
    width: 100%;
  }

  .orders-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .orders-header h1 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 2rem;
  }

  .header-stats {
    display: flex;
    gap: 2rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--color-bg-primary);
    border-radius: 8px;
    box-shadow: 0 2px 10px var(--color-shadow-light);
  }

  .empty-state h2 {
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: var(--color-text-tertiary);
  }

  .orders-table-container {
    background: var(--color-bg-primary);
    border-radius: 8px;
    box-shadow: 0 2px 10px var(--color-shadow-light);
    overflow-x: auto;
  }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
  }

  .orders-table thead {
    background: var(--color-bg-secondary);
    border-bottom: 2px solid var(--color-border-primary);
  }

  .orders-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .orders-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-primary);
    color: var(--color-text-secondary);
  }

  .orders-table tbody tr:hover {
    background: var(--color-bg-secondary);
  }

  .order-id {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--color-text-primary);
  }

  .customer-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .customer-name {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .customer-email {
    font-size: 0.875rem;
    color: var(--color-text-tertiary);
  }

  .order-total {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-view {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-view:hover {
    background: var(--color-primary-hover);
  }

  @media (max-width: 1024px) {
    .orders-container {
      padding: 1rem;
    }

    .orders-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .header-stats {
      width: 100%;
      justify-content: space-around;
    }

    .orders-table-container {
      overflow-x: scroll;
    }

    .orders-table {
      min-width: 800px;
    }
  }

  @media (max-width: 768px) {
    .orders-header h1 {
      font-size: 1.5rem;
    }

    .header-stats {
      gap: 1rem;
    }

    .stat-label {
      font-size: 0.75rem;
    }

    .stat-value {
      font-size: 1.25rem;
    }

    .orders-table th,
    .orders-table td {
      padding: 0.75rem 0.5rem;
      font-size: 0.875rem;
    }
  }
</style>
