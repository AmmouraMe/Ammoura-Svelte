<script lang="ts">
  import type { Page } from '$lib/types/pages';

  export let row: Page;

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const date = new Date(timestamp * 1000);
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    } else if (diffWeek < 4) {
      return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
    } else if (diffMonth < 12) {
      return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
    } else {
      return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
    }
  }

  function formatFullDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
</script>

<span class="date" title={formatFullDate(row.updated_at)}>{formatRelativeTime(row.updated_at)}</span
>

<style>
  .date {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
</style>
