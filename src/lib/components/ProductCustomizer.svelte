<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProductCustomizationZone, CartItemCustomization } from '$lib/types/customization';
  import type { ProductMedia } from '$lib/types/media';
  import { toastStore } from '$lib/stores/toast';
  import {
    assessPrintQuality,
    recommendedPixels,
    formatPhysicalSize,
    type PrintGeometry,
    type PrintQuality
  } from '$lib/utils/printQuality';
  import {
    DEFAULT_TRANSFORM,
    SCALE_MIN,
    SCALE_MAX,
    clampTransform,
    snapRotation,
    fitScale,
    nudge,
    zoomBy,
    rotateBy,
    createHistory,
    pushHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    type DesignTransform,
    type History
  } from '$lib/utils/designTransform';

  export let productImage: string;
  export let productName: string;
  /** Product id — the design-upload endpoint is scoped to it. */
  export let productId: string;
  export let media: ProductMedia[];
  export let zones: ProductCustomizationZone[];
  export let initialCustomizations: CartItemCustomization[] = [];
  /** Print-area geometry keyed by print area id, for zones linked to a template. */
  export let printAreas: Record<string, PrintGeometry & { name?: string }> = {};

  /** Physical geometry behind a zone, or null if it isn't linked to a print area. */
  function printGeometryFor(zoneId: string): PrintGeometry | null {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone?.printAreaId) return null;
    return printAreas[zone.printAreaId] ?? null;
  }

  /**
   * Live print-quality assessment.
   *
   * Deliberately pure over (upload, geometry) rather than looking the upload up
   * from `uploads` by id: a function that reads reactive state internally hides
   * that dependency from the template, so the badge would render once and then
   * never track the scale slider.
   */
  function qualityFor(
    upload: ZoneUpload | undefined,
    geometry: PrintGeometry | null
  ): PrintQuality | null {
    if (!upload || !geometry || !upload.naturalWidth) return null;
    return assessPrintQuality(upload.naturalWidth, upload.naturalHeight, geometry, upload.scale);
  }

  const dispatch = createEventDispatcher<{
    customizationsChange: CartItemCustomization[];
  }>();

  interface ZoneUpload {
    zoneId: string;
    zoneName: string;
    /** Local blob URL — instant preview, no round-trip to R2 to draw the canvas. */
    objectUrl: string;
    /** Full-resolution source stored server-side (R2 via the media library). */
    imageDataUrl: string;
    mediaId: string | null;
    naturalWidth: number;
    naturalHeight: number;
    originalFilename: string;
    offsetXPercent: number;
    offsetYPercent: number;
    scale: number;
    rotation: number;
  }

  /** Per-zone upload progress, so a large original doesn't look like a hang. */
  let uploadingZones: Set<string> = new Set();

  let uploads: Map<string, ZoneUpload> = new Map();
  let activeZoneId: string | null = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartOffsetX = 0;
  let dragStartOffsetY = 0;
  let containerEl: HTMLDivElement;

  /**
   * Undo/redo over the whole placement state. Snapshots are taken at gesture
   * boundaries (drag end, slider release, upload, remove) rather than on every
   * pointer move, so one drag is one undo step.
   */
  type DesignSnapshot = Record<string, DesignTransform>;

  let history: History<DesignSnapshot> = createHistory<DesignSnapshot>({});
  let suppressHistory = false;

  function currentSnapshot(): DesignSnapshot {
    const snapshot: DesignSnapshot = {};
    for (const [zoneId, upload] of uploads) {
      snapshot[zoneId] = {
        offsetXPercent: upload.offsetXPercent,
        offsetYPercent: upload.offsetYPercent,
        scale: upload.scale,
        rotation: upload.rotation
      };
    }
    return snapshot;
  }

  /** Record a history step, unless we're mid-restore. */
  function commit(): void {
    if (suppressHistory) return;
    history = pushHistory(history, currentSnapshot());
  }

  /** Apply a snapshot back onto the uploads map. */
  function restore(snapshot: DesignSnapshot): void {
    suppressHistory = true;
    for (const [zoneId, transform] of Object.entries(snapshot)) {
      const upload = uploads.get(zoneId);
      if (!upload) continue;
      upload.offsetXPercent = transform.offsetXPercent;
      upload.offsetYPercent = transform.offsetYPercent;
      upload.scale = transform.scale;
      upload.rotation = transform.rotation;
    }
    uploads = new Map(uploads);
    suppressHistory = false;
    emitChange();
  }

  function handleUndo(): void {
    if (!canUndo(history)) return;
    history = undo(history);
    restore(history.present);
  }

  function handleRedo(): void {
    if (!canRedo(history)) return;
    history = redo(history);
    restore(history.present);
  }

  /** Mutate the active upload through a transform helper, then re-render. */
  function applyTransform(
    zoneId: string,
    fn: (t: DesignTransform) => DesignTransform,
    record = true
  ): void {
    const upload = uploads.get(zoneId);
    if (!upload) return;
    const next = fn(
      clampTransform({
        offsetXPercent: upload.offsetXPercent,
        offsetYPercent: upload.offsetYPercent,
        scale: upload.scale,
        rotation: upload.rotation
      })
    );
    upload.offsetXPercent = next.offsetXPercent;
    upload.offsetYPercent = next.offsetYPercent;
    upload.scale = next.scale;
    upload.rotation = next.rotation;
    uploads = new Map(uploads);
    if (record) commit();
    emitChange();
  }

  function handleRotate(zoneId: string, degrees: number, record = true): void {
    applyTransform(
      zoneId,
      (t) => clampTransform({ ...t, rotation: snapRotation(degrees) }),
      record
    );
  }

  function handleFit(zoneId: string): void {
    const upload = uploads.get(zoneId);
    if (!upload) return;
    applyTransform(zoneId, (t) => ({
      ...t,
      scale: fitScale(upload.naturalWidth, upload.naturalHeight, t.rotation)
    }));
  }

  function handleCenter(zoneId: string): void {
    applyTransform(zoneId, (t) => ({ ...t, offsetXPercent: 0, offsetYPercent: 0 }));
  }

  function handleReset(zoneId: string): void {
    applyTransform(zoneId, () => ({ ...DEFAULT_TRANSFORM }));
  }

  /**
   * Keyboard placement. Arrow keys nudge (shift = coarse), +/- zoom, [/] rotate
   * — without this the design tools are mouse-only and unusable for anyone
   * relying on a keyboard.
   */
  function handleCanvasKeydown(e: KeyboardEvent, zoneId: string): void {
    if (!uploads.has(zoneId)) return;
    const step = e.shiftKey ? 5 : 1;
    const handlers: Record<string, () => void> = {
      ArrowLeft: () => applyTransform(zoneId, (t) => nudge(t, -step, 0)),
      ArrowRight: () => applyTransform(zoneId, (t) => nudge(t, step, 0)),
      ArrowUp: () => applyTransform(zoneId, (t) => nudge(t, 0, -step)),
      ArrowDown: () => applyTransform(zoneId, (t) => nudge(t, 0, step)),
      '+': () => applyTransform(zoneId, (t) => zoomBy(t, 1.1)),
      '=': () => applyTransform(zoneId, (t) => zoomBy(t, 1.1)),
      '-': () => applyTransform(zoneId, (t) => zoomBy(t, 1 / 1.1)),
      '[': () => applyTransform(zoneId, (t) => rotateBy(t, -15)),
      ']': () => applyTransform(zoneId, (t) => rotateBy(t, 15))
    };
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }

  // Track selected media for preview (default to first image or fallback)
  let selectedMediaIndex = 0;
  $: imageMedia = media.filter((m) => m.type === 'image');
  $: currentImage = imageMedia.length > 0 ? imageMedia[selectedMediaIndex]?.url : productImage;
  $: currentMediaId = imageMedia.length > 0 ? imageMedia[selectedMediaIndex]?.id : null;
  $: visibleZones = zones.filter((z) => z.mediaId === null || z.mediaId === currentMediaId);

  // Initialize from existing customizations
  $: {
    if (initialCustomizations.length > 0 && uploads.size === 0) {
      const newUploads = new Map<string, ZoneUpload>();
      for (const c of initialCustomizations) {
        newUploads.set(c.zoneId, {
          zoneId: c.zoneId,
          zoneName: c.zoneName,
          objectUrl: c.imageDataUrl,
          imageDataUrl: c.imageDataUrl,
          mediaId: c.mediaId ?? null,
          naturalWidth: c.naturalWidth ?? 0,
          naturalHeight: c.naturalHeight ?? 0,
          originalFilename: c.originalFilename,
          offsetXPercent: c.offsetXPercent,
          offsetYPercent: c.offsetYPercent,
          scale: c.scale,
          rotation: c.rotation ?? 0
        });
      }
      uploads = newUploads;
      history = createHistory(currentSnapshot());
    }
  }

  function selectMedia(index: number): void {
    selectedMediaIndex = index;
  }

  /**
   * One persistent input per zone, rather than a throwaway created on click.
   * A real element in the DOM can be labelled, reached by assistive tech, and
   * driven by tests; a detached one can be none of those.
   */
  let fileInputs: Record<string, HTMLInputElement> = {};

  function handleZoneClick(zone: ProductCustomizationZone): void {
    if (uploads.has(zone.id)) {
      activeZoneId = zone.id;
      return;
    }
    fileInputs[zone.id]?.click();
  }

  /** Read an image's intrinsic pixel size from a blob URL. */
  function measure(objectUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = (): void => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = (): void => reject(new Error('Could not read that image'));
      img.src = objectUrl;
    });
  }

  async function handleFileSelect(e: Event, zone: ProductCustomizationZone): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > zone.maxFileSize) {
      const maxMB = (zone.maxFileSize / 1024 / 1024).toFixed(0);
      toastStore.error(`File too large. Maximum size is ${maxMB}MB.`);
      return;
    }

    if (!zone.allowedTypes.includes(file.type)) {
      toastStore.error('File type not allowed for this zone.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    uploadingZones = new Set(uploadingZones.add(zone.id));

    try {
      const { width, height } = await measure(objectUrl);

      // Warn before uploading if the original can't hold up at print size —
      // cheaper for the customer to find out now than at the order stage.
      const geometry = printGeometryFor(zone.id);
      if (geometry) {
        const quality = assessPrintQuality(width, height, geometry, 1);
        if (!quality.meetsRequirement) {
          const need = recommendedPixels(geometry);
          toastStore.error(
            `That image is ${width}×${height}px. For a sharp ${formatPhysicalSize(geometry)} print you want about ${need.width}×${need.height}px. You can still use it — check the quality badge.`
          );
        }
      }

      // Upload the ORIGINAL at full resolution. The printed output is generated
      // from this file, so it must never be downsampled on the way in.
      const form = new FormData();
      form.append('file', file);
      form.append('zoneId', zone.id);
      form.append('dimensions', JSON.stringify({ width, height }));

      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/design-upload`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || 'Upload failed');
      }
      const uploaded = (await res.json()) as { id: string; url: string };

      const upload: ZoneUpload = {
        zoneId: zone.id,
        zoneName: zone.name,
        objectUrl,
        imageDataUrl: uploaded.url,
        mediaId: uploaded.id,
        naturalWidth: width,
        naturalHeight: height,
        originalFilename: file.name,
        offsetXPercent: 0,
        offsetYPercent: 0,
        scale: 1,
        rotation: 0
      };

      uploads = new Map(uploads.set(zone.id, upload));
      activeZoneId = zone.id;
      // Start the design centred and fully visible rather than cropped.
      applyTransform(zone.id, (t) => ({ ...t, scale: fitScale(width, height, 0) }), false);
      commit();
      emitChange();
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      toastStore.error(err instanceof Error ? err.message : 'Could not upload that design');
    } finally {
      uploadingZones.delete(zone.id);
      uploadingZones = new Set(uploadingZones);
    }
  }

  function removeUpload(zoneId: string): void {
    const upload = uploads.get(zoneId);
    if (upload) {
      URL.revokeObjectURL(upload.objectUrl);
    }
    uploads.delete(zoneId);
    uploads = new Map(uploads);
    if (activeZoneId === zoneId) {
      activeZoneId = null;
    }
    commit();
    emitChange();
  }

  /**
   * Live scale while dragging the slider — deliberately does NOT record
   * history, so a slider sweep collapses into one undo step on release.
   */
  function handleScaleChange(zoneId: string, newScale: number): void {
    applyTransform(zoneId, (t) => clampTransform({ ...t, scale: newScale }), false);
  }

  function handleDragStart(e: MouseEvent | TouchEvent, zoneId: string): void {
    e.preventDefault();
    isDragging = true;
    activeZoneId = zoneId;

    const point = 'touches' in e ? e.touches[0] : e;
    dragStartX = point.clientX;
    dragStartY = point.clientY;

    const upload = uploads.get(zoneId);
    if (upload) {
      dragStartOffsetX = upload.offsetXPercent;
      dragStartOffsetY = upload.offsetYPercent;
    }
  }

  function handleDragMove(e: MouseEvent | TouchEvent): void {
    if (!isDragging || !activeZoneId || !containerEl) return;
    e.preventDefault();

    const point = 'touches' in e ? e.touches[0] : e;
    const rect = containerEl.getBoundingClientRect();

    const deltaXPercent = ((point.clientX - dragStartX) / rect.width) * 100;
    const deltaYPercent = ((point.clientY - dragStartY) / rect.height) * 100;

    const upload = uploads.get(activeZoneId);
    if (upload) {
      upload.offsetXPercent = Math.max(-50, Math.min(50, dragStartOffsetX + deltaXPercent));
      upload.offsetYPercent = Math.max(-50, Math.min(50, dragStartOffsetY + deltaYPercent));
      uploads = new Map(uploads);
    }
  }

  function handleDragEnd(): void {
    if (isDragging) {
      isDragging = false;
      // One drag gesture = one undo step.
      commit();
      emitChange();
    }
  }

  function emitChange(): void {
    const customizations: CartItemCustomization[] = [];
    for (const upload of uploads.values()) {
      customizations.push({
        zoneId: upload.zoneId,
        zoneName: upload.zoneName,
        imageDataUrl: upload.imageDataUrl,
        mediaId: upload.mediaId,
        naturalWidth: upload.naturalWidth,
        naturalHeight: upload.naturalHeight,
        originalFilename: upload.originalFilename,
        offsetXPercent: upload.offsetXPercent,
        offsetYPercent: upload.offsetYPercent,
        scale: upload.scale,
        rotation: upload.rotation
      });
    }
    dispatch('customizationsChange', customizations);
  }

  function getZoneHasUpload(zoneId: string): boolean {
    return uploads.has(zoneId);
  }
</script>

<svelte:window
  on:mousemove={handleDragMove}
  on:mouseup={handleDragEnd}
  on:touchmove={handleDragMove}
  on:touchend={handleDragEnd}
/>

<div class="product-customizer">
  <div class="customizer-header">
    <div>
      <h3>Customize Your Product</h3>
      <p class="customizer-hint">
        Click a print area to upload your design, then drag to position. With a design selected:
        arrow keys nudge, <kbd>+</kbd>/<kbd>−</kbd> resize, <kbd>[</kbd>/<kbd>]</kbd>
        rotate.
      </p>
    </div>
    <div class="history-actions">
      <button
        class="ghost-btn"
        on:click={handleUndo}
        disabled={!canUndo(history)}
        title="Undo (last placement change)"
      >
        Undo
      </button>
      <button class="ghost-btn" on:click={handleRedo} disabled={!canRedo(history)} title="Redo">
        Redo
      </button>
    </div>
  </div>

  <div
    class="preview-container"
    bind:this={containerEl}
    role="img"
    aria-label="Product customization preview"
  >
    <!-- Product Image -->
    <img class="product-image" src={currentImage} alt={productName} />

    <!-- Customization Zones Overlay -->
    {#each visibleZones as zone (zone.id)}
      {@const upload = uploads.get(zone.id)}
      <input
        class="visually-hidden-input"
        type="file"
        accept={zone.allowedTypes.join(',')}
        bind:this={fileInputs[zone.id]}
        on:change={(e) => handleFileSelect(e, zone)}
        aria-label="Upload a design for {zone.name}"
        data-zone-input={zone.id}
      />
      <button
        class="zone-overlay"
        class:active={activeZoneId === zone.id}
        class:has-upload={getZoneHasUpload(zone.id)}
        style="left: {zone.xPercent}%; top: {zone.yPercent}%; width: {zone.widthPercent}%; height: {zone.heightPercent}%;"
        on:click|stopPropagation={() => handleZoneClick(zone)}
        on:keydown={(e) => handleCanvasKeydown(e, zone.id)}
        aria-label="Customization zone: {zone.name}"
        title={upload
          ? `${zone.name} - Click to change, drag to reposition`
          : `Click to add design: ${zone.name}`}
      >
        {#if upload}
          <!-- eslint-disable-next-line svelte/valid-compile -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img
            class="upload-preview"
            src={upload.objectUrl}
            alt="Your design for {zone.name}"
            style="transform: translate({upload.offsetXPercent}%, {upload.offsetYPercent}%) rotate({upload.rotation}deg) scale({upload.scale});"
            on:mousedown|stopPropagation={(e) => handleDragStart(e, zone.id)}
            on:touchstart|stopPropagation={(e) => handleDragStart(e, zone.id)}
            draggable="false"
          />
        {:else}
          <div class="zone-placeholder">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span class="zone-label">{zone.name}</span>
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Media Thumbnails -->
  {#if imageMedia.length > 1}
    <div class="media-thumbnails" role="tablist">
      {#each imageMedia as item, index (item.id)}
        <button
          class="thumb"
          class:active={index === selectedMediaIndex}
          on:click={() => selectMedia(index)}
          role="tab"
          aria-label="View image {index + 1}"
          aria-selected={index === selectedMediaIndex}
        >
          <img src={item.url} alt="Thumbnail {index + 1}" />
        </button>
      {/each}
    </div>
  {/if}

  <!-- Zone Controls -->
  {#if visibleZones.length > 0}
    <div class="zone-controls">
      {#each visibleZones as zone (zone.id)}
        {@const upload = uploads.get(zone.id)}
        {@const geometry = printGeometryFor(zone.id)}
        {@const quality = qualityFor(upload, geometry)}
        <div class="zone-control" class:active={activeZoneId === zone.id}>
          <span class="zone-name">
            {zone.name}
            {#if geometry}
              <span class="zone-spec"
                >{formatPhysicalSize(geometry)} · {geometry.requiredDpi} DPI</span
              >
            {/if}
          </span>
          {#if uploadingZones.has(zone.id)}
            <span class="upload-status">Uploading full-resolution original…</span>
          {/if}
          {#if upload}
            <span class="file-name" title={upload.originalFilename}>
              {upload.originalFilename}
              {#if upload.naturalWidth}
                <span class="file-dims">{upload.naturalWidth}×{upload.naturalHeight}px</span>
              {/if}
            </span>
            {#if quality}
              <span
                class="quality-badge {quality.rating}"
                title="{quality.message}. Effective resolution at the current size."
              >
                {quality.dpi} DPI · {quality.message}
              </span>
            {/if}
            <div class="scale-control">
              <label for="scale-{zone.id}">Size</label>
              <input
                id="scale-{zone.id}"
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step="0.01"
                value={upload.scale}
                on:input={(e) => handleScaleChange(zone.id, parseFloat(e.currentTarget.value))}
                on:change={commit}
              />
              <span class="scale-value">{Math.round(upload.scale * 100)}%</span>
            </div>

            <div class="scale-control">
              <label for="rotation-{zone.id}">Rotate</label>
              <input
                id="rotation-{zone.id}"
                type="range"
                min="0"
                max="359"
                step="1"
                value={upload.rotation}
                on:input={(e) => handleRotate(zone.id, parseFloat(e.currentTarget.value), false)}
                on:change={commit}
              />
              <span class="scale-value">{Math.round(upload.rotation)}°</span>
            </div>

            <div class="placement-actions">
              <button
                class="ghost-btn"
                on:click={() => handleFit(zone.id)}
                title="Fit the design inside the print area"
              >
                Fit
              </button>
              <button
                class="ghost-btn"
                on:click={() => handleCenter(zone.id)}
                title="Centre the design"
              >
                Centre
              </button>
              <button
                class="ghost-btn"
                on:click={() => handleReset(zone.id)}
                title="Reset size, position and rotation"
              >
                Reset
              </button>
            </div>
            <button
              class="remove-btn"
              on:click={() => removeUpload(zone.id)}
              aria-label="Remove design from {zone.name}"
              title="Remove"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          {:else}
            <button class="upload-btn" on:click={() => handleZoneClick(zone)}>
              Upload Design
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .product-customizer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .customizer-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-text-primary);
  }

  .customizer-hint {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--color-text-tertiary);
  }

  .preview-container {
    position: relative;
    width: 100%;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    overflow: hidden;
    aspect-ratio: 1;
    user-select: none;
  }

  .product-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .zone-overlay {
    position: absolute;
    border: 2px dashed var(--color-primary, #6366f1);
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.08);
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    transition:
      border-color 0.2s,
      background-color 0.2s,
      box-shadow 0.2s;
  }

  .zone-overlay:hover {
    border-color: var(--color-primary, #6366f1);
    background: rgba(99, 102, 241, 0.15);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  .zone-overlay.active {
    border-color: var(--color-primary, #6366f1);
    border-style: solid;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
  }

  .zone-overlay.has-upload {
    border-color: var(--color-success, #10b981);
    background: transparent;
  }

  .zone-overlay.has-upload:hover {
    border-color: var(--color-success, #10b981);
    background: rgba(16, 185, 129, 0.05);
  }

  .zone-overlay.has-upload.active {
    border-color: var(--color-success, #10b981);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
  }

  .zone-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    gap: 0.25rem;
    color: var(--color-primary, #6366f1);
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .zone-overlay:hover .zone-placeholder {
    opacity: 1;
  }

  .zone-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    padding: 0 0.25rem;
  }

  .upload-preview {
    width: 100%;
    height: 100%;
    object-fit: contain;
    cursor: grab;
    pointer-events: auto;
    transform-origin: center center;
  }

  .upload-preview:active {
    cursor: grabbing;
  }

  .media-thumbnails {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.25rem 0;
  }

  .thumb {
    width: 56px;
    height: 56px;
    border: 2px solid var(--color-border-secondary);
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    background: var(--color-bg-secondary);
    flex-shrink: 0;
    transition: border-color 0.2s;
  }

  .thumb.active {
    border-color: var(--color-primary, #6366f1);
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .zone-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .zone-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-accent);
    border-radius: 6px;
    border: 1px solid var(--color-border-secondary);
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .zone-control.active {
    border-color: var(--color-primary, #6366f1);
    background: var(--color-bg-primary);
  }

  .zone-name {
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  /* Physical size + required DPI of the underlying print area. */
  .zone-spec {
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .file-dims {
    margin-left: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .upload-status {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .customizer-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .history-actions,
  .placement-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .ghost-btn {
    /* 44px min target — same rule the rest of the frontend overhaul applies. */
    min-height: var(--touch-target, 44px);
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: inherit;
    background: transparent;
    border: 1px solid var(--color-border, currentColor);
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .ghost-btn:hover:not(:disabled) {
    background-color: var(--color-bg-tertiary, rgba(127, 127, 127, 0.15));
  }

  .ghost-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Kept in the DOM (not display:none) so it stays focusable and scriptable. */
  .visually-hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  kbd {
    font-family: inherit;
    font-size: 0.75rem;
    padding: 0.0625rem 0.25rem;
    border: 1px solid var(--color-border, currentColor);
    border-radius: 3px;
  }

  /* Live print-quality readout. Colours are semantic tokens so both themes and
     every tenant palette stay legible. */
  .quality-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm, 4px);
    border: 1px solid currentColor;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .quality-badge.excellent,
  .quality-badge.good {
    color: var(--color-success, #16a34a);
  }

  .quality-badge.low {
    color: var(--color-warning, #d97706);
  }

  .quality-badge.unusable {
    color: var(--color-error, #dc2626);
  }

  .file-name {
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .scale-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .scale-control label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .scale-control input[type='range'] {
    width: 80px;
    accent-color: var(--color-primary, #6366f1);
  }

  .scale-value {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    min-width: 2.5rem;
    text-align: right;
  }

  .upload-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    background: var(--color-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s;
  }

  .upload-btn:hover {
    opacity: 0.9;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: transparent;
    /* `inherit`, not `--color-text-secondary`: the storefront applies the
       site's colour theme to a subtree, so `--color-*` here can still hold
       light-mode values while the page is in dark mode — which rendered this
       icon at 2:1 and made the button look empty. Inheriting follows whatever
       the surrounding panel actually is, in both modes. */
    color: inherit;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      color 0.2s,
      border-color 0.2s;
  }

  .remove-btn:hover {
    color: var(--color-error, #ef4444);
    border-color: var(--color-error, #ef4444);
  }

  @media (max-width: 768px) {
    .scale-control input[type='range'] {
      width: 60px;
    }

    .zone-control {
      flex-wrap: wrap;
    }

    .scale-control {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
