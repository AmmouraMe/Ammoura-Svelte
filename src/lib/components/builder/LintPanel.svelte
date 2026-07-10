<script lang="ts">
  /**
   * LintPanel — accessibility warnings for the current page (F2).
   *
   * Non-blocking: it surfaces contrast / touch-target / missing-alt issues found
   * by lintComponents() and lets the user jump to the offending component. It
   * never prevents saving or publishing.
   */
  import { createEventDispatcher } from 'svelte';
  import { X, Contrast, ImageOff, Hand, CheckCircle2 } from 'lucide-svelte';
  import type { LintWarning, LintRule } from '$lib/utils/lint/lintPage';

  export let warnings: LintWarning[] = [];

  const dispatch = createEventDispatcher<{ close: void; select: string }>();

  const RULE_META: Record<LintRule, { label: string; icon: typeof Contrast }> = {
    contrast: { label: 'Contrast', icon: Contrast },
    'missing-alt': { label: 'Missing alt text', icon: ImageOff },
    'touch-target': { label: 'Tap target', icon: Hand }
  };
</script>

<div class="lint-panel" role="dialog" aria-label="Accessibility warnings">
  <header class="lint-head">
    <h3>
      Accessibility
      {#if warnings.length}<span class="count">{warnings.length}</span>{/if}
    </h3>
    <button class="lint-close" on:click={() => dispatch('close')} aria-label="Close" title="Close">
      <X size={18} />
    </button>
  </header>

  {#if warnings.length === 0}
    <div class="lint-empty">
      <CheckCircle2 size={28} />
      <p>No accessibility issues found on this page.</p>
    </div>
  {:else}
    <ul class="lint-list">
      {#each warnings as w, i (w.componentId + w.rule + i)}
        <li>
          <button class="lint-item" on:click={() => dispatch('select', w.componentId)}>
            <span class="lint-icon" class:contrast={w.rule === 'contrast'}>
              <svelte:component this={RULE_META[w.rule].icon} size={16} />
            </span>
            <span class="lint-body">
              <span class="lint-rule">{RULE_META[w.rule].label}</span>
              <span class="lint-msg">{w.message}</span>
              <span class="lint-where">on &lt;{w.componentType}&gt;</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="lint-note">Warnings only — they never block saving or publishing.</p>
  {/if}
</div>

<style>
  .lint-panel {
    position: fixed;
    top: 60px;
    right: 16px;
    z-index: 2500;
    width: 340px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-3, 0 12px 32px rgba(0, 0, 0, 0.18));
    overflow: hidden;
  }

  .lint-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border-primary);
  }

  .lint-head h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-primary);
  }

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--color-warning, #f59e0b);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .lint-close {
    display: flex;
    padding: 4px;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .lint-close:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .lint-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px 16px;
    text-align: center;
    color: var(--color-success, #10b981);
  }

  .lint-empty p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .lint-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
  }

  .lint-item {
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 10px;
    background: none;
    border: none;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s;
  }

  .lint-item:hover {
    background: var(--color-bg-secondary);
  }

  .lint-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--color-bg-warning-light, rgba(245, 158, 11, 0.12));
    color: var(--color-warning, #f59e0b);
  }

  .lint-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .lint-rule {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--color-text-secondary);
  }

  .lint-msg {
    font-size: 0.82rem;
    color: var(--color-text-primary);
    line-height: 1.35;
  }

  .lint-where {
    font-size: 0.72rem;
    color: var(--color-text-muted, #94a3b8);
    font-family: var(--font-mono);
  }

  .lint-note {
    margin: 0;
    padding: 8px 14px 12px;
    font-size: 0.72rem;
    color: var(--color-text-muted, #94a3b8);
    border-top: 1px solid var(--color-border-primary);
  }
</style>
