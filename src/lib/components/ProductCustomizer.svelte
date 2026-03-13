<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProductCustomizationZone, CartItemCustomization } from '$lib/types/customization';
  import type { ProductMedia } from '$lib/types/media';
  import { toastStore } from '$lib/stores/toast';

  export let productImage: string;
  export let productName: string;
  export let media: ProductMedia[];
  export let zones: ProductCustomizationZone[];
  export let initialCustomizations: CartItemCustomization[] = [];

  const dispatch = createEventDispatcher<{
    customizationsChange: CartItemCustomization[];
  }>();

  interface ZoneUpload {
    zoneId: string;
    zoneName: string;
    objectUrl: string;
    imageDataUrl: string;
    originalFilename: string;
    offsetXPercent: number;
    offsetYPercent: number;
    scale: number;
  }

  let uploads: Map<string, ZoneUpload> = new Map();
  let activeZoneId: string | null = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartOffsetX = 0;
  let dragStartOffsetY = 0;
  let containerEl: HTMLDivElement;

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
          originalFilename: c.originalFilename,
          offsetXPercent: c.offsetXPercent,
          offsetYPercent: c.offsetYPercent,
          scale: c.scale
        });
      }
      uploads = newUploads;
    }
  }

  function selectMedia(index: number): void {
    selectedMediaIndex = index;
  }

  function handleZoneClick(zone: ProductCustomizationZone): void {
    if (uploads.has(zone.id)) {
      activeZoneId = zone.id;
      return;
    }
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = zone.allowedTypes.join(',');
    input.onchange = (e: Event) => handleFileSelect(e, zone);
    input.click();
  }

  function handleFileSelect(e: Event, zone: ProductCustomizationZone): void {
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

    // Also create a data URL for persistence in cart
    const reader = new FileReader();
    reader.onload = (): void => {
      // Resize the image for cart storage (max 800px dimension)
      const img = new Image();
      img.onload = (): void => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h / w) * maxDim);
            w = maxDim;
          } else {
            w = Math.round((w / h) * maxDim);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png', 0.8);

          const upload: ZoneUpload = {
            zoneId: zone.id,
            zoneName: zone.name,
            objectUrl,
            imageDataUrl: dataUrl,
            originalFilename: file.name,
            offsetXPercent: 0,
            offsetYPercent: 0,
            scale: 1
          };

          uploads = new Map(uploads.set(zone.id, upload));
          activeZoneId = zone.id;
          emitChange();
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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
    emitChange();
  }

  function handleScaleChange(zoneId: string, newScale: number): void {
    const upload = uploads.get(zoneId);
    if (upload) {
      upload.scale = Math.max(0.1, Math.min(3, newScale));
      uploads = new Map(uploads);
      emitChange();
    }
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
        originalFilename: upload.originalFilename,
        offsetXPercent: upload.offsetXPercent,
        offsetYPercent: upload.offsetYPercent,
        scale: upload.scale
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
    <h3>Customize Your Product</h3>
    <p class="customizer-hint">Click a zone to upload your design</p>
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
      <button
        class="zone-overlay"
        class:active={activeZoneId === zone.id}
        class:has-upload={getZoneHasUpload(zone.id)}
        style="left: {zone.xPercent}%; top: {zone.yPercent}%; width: {zone.widthPercent}%; height: {zone.heightPercent}%;"
        on:click|stopPropagation={() => handleZoneClick(zone)}
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
            style="transform: translate({upload.offsetXPercent}%, {upload.offsetYPercent}%) scale({upload.scale});"
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
        <div class="zone-control" class:active={activeZoneId === zone.id}>
          <span class="zone-name">{zone.name}</span>
          {#if upload}
            <span class="file-name" title={upload.originalFilename}>
              {upload.originalFilename}
            </span>
            <div class="scale-control">
              <label for="scale-{zone.id}">Size:</label>
              <input
                id="scale-{zone.id}"
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={upload.scale}
                on:input={(e) => handleScaleChange(zone.id, parseFloat(e.currentTarget.value))}
              />
              <span class="scale-value">{Math.round(upload.scale * 100)}%</span>
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
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
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
