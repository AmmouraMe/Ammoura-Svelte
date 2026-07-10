<script lang="ts">
  /**
   * BreakpointFieldBadge — inheritance indicator for a responsive field (F2).
   *
   * Shows, for the breakpoint currently being edited, whether a field is the
   * base (desktop), an explicit override, or inherited from a wider breakpoint —
   * and offers a one-click reset that clears an override so it inherits again.
   */
  import { createEventDispatcher } from 'svelte';
  import { RotateCcw } from 'lucide-svelte';
  import type { ResponsiveValue } from '$lib/types/pages';
  import {
    type Breakpoint,
    effectiveSource,
    isOverridden,
    isInherited
  } from '$lib/utils/responsiveField';

  // The responsive value backing the field (or undefined/scalar if unset).
  export let value: ResponsiveValue<unknown> | unknown | undefined = undefined;
  export let breakpoint: Breakpoint;

  const dispatch = createEventDispatcher<{ reset: void }>();

  $: rv = value as ResponsiveValue<unknown> | undefined;
  $: overridden = isOverridden(rv, breakpoint);
  $: inherited = isInherited(rv, breakpoint);
  $: source = effectiveSource(rv, breakpoint);
</script>

{#if breakpoint === 'desktop'}
  <span
    class="bp-badge base"
    title="Desktop is the base — these values apply to every screen unless overridden."
  >
    Base
  </span>
{:else if overridden}
  <span class="bp-badge override">
    <span class="dot" aria-hidden="true"></span>
    Overriding {breakpoint}
    <button
      type="button"
      class="reset"
      title="Reset — inherit from a wider breakpoint again"
      on:click={() => dispatch('reset')}
    >
      <RotateCcw size={12} />
    </button>
  </span>
{:else if inherited}
  <span
    class="bp-badge inherited"
    title="Inherited from {source}. Edit to override it just on {breakpoint}."
  >
    ↳ from {source}
  </span>
{/if}

<style>
  .bp-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    line-height: 1.6;
    white-space: nowrap;
  }

  .bp-badge.base {
    background: var(--color-bg-tertiary, #e2e8f0);
    color: var(--color-text-secondary, #64748b);
  }

  .bp-badge.override {
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);
  }

  .bp-badge.inherited {
    background: transparent;
    color: var(--color-text-muted, #94a3b8);
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
  }

  .reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px;
    margin-left: 2px;
    background: none;
    border: none;
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
    opacity: 0.8;
  }

  .reset:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--color-primary) 22%, transparent);
  }
</style>
