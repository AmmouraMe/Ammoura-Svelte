<script lang="ts">
  /**
   * TokenScalePicker — design-token quick-pick for a numeric (px) field (F2).
   *
   * Presents the design scale (spacing or radius) as the default, prominent way
   * to set a value; the raw number input next to it stays available for custom
   * values. The step matching the current value is highlighted so you can see
   * when a value is on the scale vs. off it.
   */
  import type { ScaleStep } from '$lib/utils/designScales';

  export let scale: ScaleStep[];
  export let value: number;
  export let onPick: (value: number) => void;
  /** Optional caption shown before the buttons (e.g. "All sides"). */
  export let label: string = '';
</script>

<div class="token-scale">
  {#if label}<span class="token-scale-label">{label}</span>{/if}
  <div class="token-scale-steps">
    {#each scale as step}
      <button
        type="button"
        class="token-step"
        class:active={value === step.value}
        title={step.token === '0' ? '0' : `${step.token} (${step.value}px)`}
        on:click={() => onPick(step.value)}
      >
        {step.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .token-scale {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .token-scale-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-secondary, #64748b);
  }

  .token-scale-steps {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .token-step {
    min-width: 28px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    background: var(--color-bg-secondary, #f8fafc);
    border: 1px solid var(--color-border-primary, #cbd5e1);
    border-radius: 4px;
    color: var(--color-text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.12s;
  }

  .token-step:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-text-primary, #1e293b);
  }

  .token-step.active {
    background: var(--color-primary, #3b82f6);
    border-color: var(--color-primary, #3b82f6);
    color: #fff;
  }
</style>
