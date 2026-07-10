<script lang="ts">
  /**
   * PreviewOverlay — true-fidelity device preview for the builder (F2).
   *
   * Renders the page's real storefront URL (with ?preview so admins see the
   * latest draft) inside an <iframe> sized to a device width. Because an iframe
   * has its own viewport, the frontend's real `responsive.css` @media queries
   * (and clamp() fluid type) fire exactly as they do on a device — this is the
   * "WYSIWYG including on a phone" guarantee. The inline edit canvas is a JS
   * approximation; this is the source of truth.
   */
  import { createEventDispatcher } from 'svelte';
  import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, X } from 'lucide-svelte';
  import { BREAKPOINTS } from '$lib/styles/breakpoints';

  /** Page path to preview, e.g. '/' or '/about'. */
  export let path: string = '/';

  const dispatch = createEventDispatcher();

  type Device = 'mobile' | 'tablet' | 'desktop';
  let device: Device = 'mobile';

  // Cache-buster: bumping this reloads the iframe to pick up a fresh draft save.
  export let reloadNonce: number = 0;

  // Device widths. Mobile/tablet mirror the canonical BREAKPOINTS (390 is the
  // common phone width, just under BREAKPOINTS.md); desktop fills the area.
  const DEVICE_WIDTH: Record<Device, string> = {
    mobile: '390px',
    tablet: `${BREAKPOINTS.md}px`,
    desktop: '100%'
  };

  const DEVICES: { id: Device; label: string; icon: typeof Smartphone }[] = [
    { id: 'mobile', label: 'Mobile · 390', icon: Smartphone },
    { id: 'tablet', label: `Tablet · ${BREAKPOINTS.md}`, icon: Tablet },
    { id: 'desktop', label: 'Desktop', icon: Monitor }
  ];

  // Normalize to a leading-slash path, then add the admin preview flag + nonce.
  $: normalizedPath = path.startsWith('/') ? path : `/${path}`;
  $: previewSrc = `${normalizedPath}?preview&_pv=${reloadNonce}`;

  function reload(): void {
    dispatch('reload');
  }
</script>

<div class="preview-overlay" role="dialog" aria-modal="true" aria-label="Device preview">
  <header class="preview-bar">
    <div class="preview-devices">
      {#each DEVICES as d}
        <button
          class="preview-device"
          class:active={device === d.id}
          on:click={() => (device = d.id)}
          aria-pressed={device === d.id}
          title={d.label}
        >
          <svelte:component this={d.icon} size={16} />
          <span class="preview-device-label">{d.label}</span>
        </button>
      {/each}
    </div>

    <div class="preview-path" title={previewSrc}>{normalizedPath}</div>

    <div class="preview-actions">
      <button class="preview-icon-btn" on:click={reload} title="Reload preview">
        <RefreshCw size={16} />
      </button>
      <a
        class="preview-icon-btn"
        href={previewSrc}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
      >
        <ExternalLink size={16} />
      </a>
      <button
        class="preview-icon-btn preview-close"
        on:click={() => dispatch('close')}
        title="Close preview (Esc)"
      >
        <X size={18} />
      </button>
    </div>
  </header>

  <div class="preview-stage">
    <div
      class="preview-frame"
      class:is-desktop={device === 'desktop'}
      style="width: {DEVICE_WIDTH[device]};"
    >
      {#key reloadNonce}
        <iframe src={previewSrc} title="Page preview" loading="eager"></iframe>
      {/key}
    </div>
  </div>
</div>

<svelte:window on:keydown={(e) => e.key === 'Escape' && dispatch('close')} />

<style>
  .preview-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-secondary);
  }

  .preview-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-primary);
    flex-shrink: 0;
  }

  .preview-devices {
    display: flex;
    gap: 0.25rem;
    background: var(--color-bg-secondary);
    border-radius: 6px;
    padding: 0.25rem;
  }

  .preview-device {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-device:hover {
    color: var(--color-text-primary);
  }

  .preview-device.active {
    background: var(--color-primary);
    color: #fff;
  }

  .preview-path {
    flex: 1;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-actions {
    display: flex;
    gap: 0.25rem;
  }

  .preview-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--touch-target);
    height: var(--touch-target);
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-icon-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .preview-close:hover {
    color: var(--color-danger);
  }

  .preview-stage {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: stretch;
    padding: 1.5rem;
    overflow: auto;
  }

  .preview-frame {
    max-width: 100%;
    height: 100%;
    background: #fff;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-3);
    overflow: hidden;
    transition: width 0.2s ease;
  }

  /* Desktop fills the stage with no device chrome. */
  .preview-frame.is-desktop {
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-1);
  }

  .preview-frame iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
</style>
