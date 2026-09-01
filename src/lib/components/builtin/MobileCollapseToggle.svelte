<script lang="ts">
  /**
   * MobileCollapseToggle - A hamburger icon toggle for collapsing container contents on mobile.
   *
   * This component renders a toggle button with a hamburger (☰) / close (✕) icon
   * that is only visible on mobile viewports (≤768px). When clicked, it toggles
   * the expanded/collapsed state and dispatches a 'toggle' event.
   *
   * Usage:
   *   <MobileCollapseToggle
   *     label="Menu"
   *     iconColor="#333"
   *     backgroundColor="transparent"
   *     bind:expanded
   *     on:toggle={handleToggle}
   *   />
   */
  import { createEventDispatcher } from 'svelte';

  /** Label text displayed next to the hamburger icon */
  export let label: string = 'Menu';
  /** Whether the collapsible content is currently expanded */
  export let expanded: boolean = false;
  /** Color of the hamburger/close icon */
  export let iconColor: string = 'currentColor';
  /** Background color of the toggle bar */
  export let backgroundColor: string = 'transparent';

  const dispatch = createEventDispatcher<{ toggle: { expanded: boolean } }>();

  function handleToggle(): void {
    expanded = !expanded;
    dispatch('toggle', { expanded });
  }
</script>

<button
  type="button"
  class="mobile-collapse-toggle"
  aria-label="Toggle {label}"
  aria-expanded={expanded}
  style="color: {iconColor}; background-color: {backgroundColor};"
  on:click={handleToggle}
>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    {#if expanded}
      <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
    {:else}
      <path d="M3 12h18M3 6h18M3 18h18" stroke-width="2" stroke-linecap="round" />
    {/if}
  </svg>
  {#if label}
    <span class="mobile-collapse-label">{label}</span>
  {/if}
</button>

<style>
  .mobile-collapse-toggle {
    display: none;
    align-items: center;
    gap: 8px;
    /* 44px minimum tap target: the icon is 24px, so 10px of vertical padding
       is the floor. min-height holds the target even with no label. */
    padding: 10px 12px;
    min-height: 44px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    width: 100%;
    justify-content: flex-start;
    transition: opacity 0.15s ease;
  }

  .mobile-collapse-toggle:hover {
    opacity: 0.8;
  }

  @media (prefers-reduced-motion: reduce) {
    .mobile-collapse-toggle {
      transition: none;
    }
  }

  .mobile-collapse-toggle:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .mobile-collapse-label {
    font-size: inherit;
    font-weight: inherit;
  }

  /* Only show on mobile */
  @media (max-width: 768px) {
    .mobile-collapse-toggle {
      display: flex;
    }
  }
</style>
