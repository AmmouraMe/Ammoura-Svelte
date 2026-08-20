<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ProductCustomizationZone, CartItemCustomization } from '$lib/types/customization';
  import type { ProductMedia } from '$lib/types/media';
  import { toastStore } from '$lib/stores/toast';
  import {
    assessPlacedImage,
    recommendedPixels,
    formatPhysicalSize,
    type PrintGeometry
  } from '$lib/utils/printQuality';
  import {
    MIN_ELEMENT_WIDTH_IN,
    areaFromGeometry,
    cascade,
    centerIn,
    duplicateElement,
    fitToArea,
    flipElement,
    legacyToPlacement,
    moveBy,
    nextId,
    nudgeBy,
    placeNewImage,
    placeNewText,
    placementBox,
    placementToLegacy,
    pointerDeltaToInches,
    removeElement,
    reorder,
    resizeToWidth,
    clampToArea,
    textHeightIn,
    type DesignArea,
    type DesignElement,
    type Direction,
    type ImageElement,
    type TextElement
  } from '$lib/utils/designElements';
  import {
    DEFAULT_FONT,
    DEFAULT_INK,
    FONTS,
    FONT_CATEGORIES,
    INK_COLORS,
    contrastAdvice,
    filterFonts,
    fontFor,
    inkNameFor,
    loadFont,
    normaliseHex
  } from '$lib/utils/designText';
  import {
    clearDraft,
    draftHasWork,
    loadDraft,
    newDesignId,
    pack,
    saveDraft
  } from '$lib/utils/designDraft';
  import {
    createHistory,
    pushHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    snapRotation,
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

  const dispatch = createEventDispatcher<{
    customizationsChange: CartItemCustomization[];
  }>();

  /**
   * A design is a stack of elements per zone, each measured in inches on the
   * product. Screen pixels appear in exactly two places — the pointer maths and
   * the preview's own layout — and never in what is stored.
   */
  type ZoneDesign = Record<string, DesignElement[]>;

  let design: ZoneDesign = {};
  let activeZoneId: string | null = null;
  let selectedId: string | null = null;
  let designId = '';
  let designRevision = 0;
  let restoredDraft = false;

  /** Per-zone upload progress, so a large original doesn't look like a hang. */
  let uploadingZones: Set<string> = new Set();

  let containerEl: HTMLDivElement;
  let productImgEl: HTMLImageElement;
  let containerW = 0;
  let containerH = 0;

  /** Physical geometry behind a zone, or null if it isn't linked to a print area. */
  function printGeometryFor(zoneId: string): PrintGeometry | null {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone?.printAreaId) return null;
    return printAreas[zone.printAreaId] ?? null;
  }

  /**
   * The design area behind a zone.
   *
   * The preview container is square, so an unlinked zone's on-screen shape is
   * exactly the ratio of its own percentages — stable whatever the viewport
   * does, which matters because every placement is stored relative to this.
   */
  function areaFor(zone: ProductCustomizationZone): DesignArea {
    const aspect = zone.heightPercent > 0 ? zone.widthPercent / zone.heightPercent : 1;
    return areaFromGeometry(printGeometryFor(zone.id), aspect);
  }

  function areaForId(zoneId: string): DesignArea {
    const zone = zones.find((z) => z.id === zoneId);
    return zone ? areaFor(zone) : areaFromGeometry(null, 1);
  }

  function elementsFor(zoneId: string): DesignElement[] {
    return design[zoneId] ?? [];
  }

  // --- history -------------------------------------------------------------
  //
  // Every mutation below replaces the objects it touches rather than editing
  // them, so a snapshot is just the current `design` reference. Snapshots are
  // taken at gesture boundaries — drag end, slider release, add, remove — so
  // one drag is one undo step.

  let history: History<ZoneDesign> = createHistory<ZoneDesign>({});
  let suppressHistory = false;

  function commit(): void {
    if (suppressHistory) return;
    history = pushHistory(history, design);
    persistDraft();
  }

  function restore(snapshot: ZoneDesign): void {
    suppressHistory = true;
    design = snapshot;
    if (activeZoneId && selectedId && !elementsFor(activeZoneId).some((e) => e.id === selectedId)) {
      selectedId = null;
    }
    suppressHistory = false;
    emitChange();
    persistDraft();
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

  // --- mutation ------------------------------------------------------------

  function setElements(zoneId: string, els: DesignElement[], record = true): void {
    design = { ...design, [zoneId]: els };
    if (record) commit();
    emitChange();
  }

  function updateElement(
    zoneId: string,
    id: string,
    fn: (el: DesignElement) => DesignElement,
    record = true
  ): void {
    setElements(
      zoneId,
      elementsFor(zoneId).map((el) => (el.id === id ? fn(el) : el)),
      record
    );
  }

  function place(
    zoneId: string,
    id: string,
    fn: (place: DesignElement['place'], area: DesignArea) => DesignElement['place'],
    record = true
  ): void {
    const area = areaForId(zoneId);
    updateElement(zoneId, id, (el) => ({ ...el, place: fn(el.place, area) }), record);
  }

  function addElement(zoneId: string, el: DesignElement): void {
    const existing = elementsFor(zoneId);
    const area = areaForId(zoneId);
    const placed: DesignElement = {
      ...el,
      id: nextId(existing),
      place: cascade(el.place, existing.length, area)
    };
    setElements(zoneId, [...existing, placed]);
    activeZoneId = zoneId;
    selectedId = placed.id;
  }

  // --- geometry ------------------------------------------------------------
  //
  // These are reactive assignments rather than plain functions on purpose: the
  // markup calls them, and Svelte tracks the names an expression mentions, not
  // what a function reads inside itself. As plain functions they would be
  // computed once at whatever size the preview first happened to be, and never
  // again — so a resize, or a switch to another product photo, would leave every
  // design at the old scale.

  interface PixelBox {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  /**
   * The print area drawn inside the zone, letterboxed to its true proportions.
   *
   * A store owner draws the zone box on a photograph by eye; the print area
   * behind it has real measurements. Fitting one inside the other means an inch
   * across reads the same as an inch down, so a circle stays a circle.
   */
  $: printBoxPx = (zone: ProductCustomizationZone, area: DesignArea): PixelBox => {
    const w = (containerW * zone.widthPercent) / 100;
    const h = (containerH * zone.heightPercent) / 100;
    const aspect = area.heightIn > 0 ? area.widthIn / area.heightIn : 1;
    let boxW = w;
    let boxH = aspect > 0 ? w / aspect : h;
    if (boxH > h) {
      boxH = h;
      boxW = h * aspect;
    }
    return { left: (w - boxW) / 2, top: (h - boxH) / 2, width: boxW, height: boxH };
  };

  /** An element's box, as percentages of the print box it lives in. */
  function elementStyle(el: DesignElement, area: DesignArea): string {
    const box = placementBox(el.place, area);
    return [
      `left:${box.leftPercent}%`,
      `top:${box.topPercent}%`,
      `width:${box.widthPercent}%`,
      `height:${box.heightPercent}%`,
      `transform:rotate(${el.place.rotation}deg)${el.flipped ? ' scaleX(-1)' : ''}`
    ].join(';');
  }

  /**
   * Text is drawn as SVG rather than as a styled `<span>`.
   *
   * The element's box *is* the ink box, so the letters have to fill it exactly.
   * HTML gives no way to put a baseline at a known place — the gap between a
   * line box and the ink in it depends on the face — whereas an SVG whose
   * viewBox is the measured ink lines the two up by construction, at any size,
   * and is the same description a server-side renderer will work from when
   * print files land.
   */
  $: textViewBox = (el: TextElement): string => {
    const ink = measureInk(el.text, el.font);
    return ink ? `0 0 ${ink.width} ${ink.height}` : '0 0 100 100';
  };

  $: textOrigin = (el: TextElement): { x: number; y: number } => {
    const ink = measureInk(el.text, el.font);
    return ink ? { x: ink.left, y: ink.ascent } : { x: 0, y: 80 };
  };

  onMount(() => {
    if (typeof ResizeObserver === 'undefined' || !containerEl) return;
    const ro = new ResizeObserver(() => {
      containerW = containerEl.clientWidth;
      containerH = containerEl.clientHeight;
    });
    ro.observe(containerEl);
    containerW = containerEl.clientWidth;
    containerH = containerEl.clientHeight;
    return () => ro.disconnect();
  });

  // --- text measuring ------------------------------------------------------

  let measureCtx: CanvasRenderingContext2D | null = null;

  /**
   * The ink a string lays down at a 100px em, in the face it will be printed in.
   *
   * Deliberately the *ink* box rather than the em square: the em box is taller
   * than the letters and narrower than an overhanging one, so a box measured
   * from it either wastes room or lets a descender out past the edge of the
   * print area. What is stored is the rectangle the printer will actually put
   * ink in.
   *
   * `left` and `ascent` are how far the ink sits from the text origin, which is
   * what the preview needs to line the two up.
   */
  interface InkBox {
    width: number;
    height: number;
    left: number;
    ascent: number;
  }

  const inkCache = new Map<string, InkBox | null>();

  function measureInk(text: string, font: string): InkBox | null {
    const key = `${font}|${text}`;
    const cached = inkCache.get(key);
    if (cached !== undefined) return cached;

    let ink: InkBox | null = null;
    if (typeof document !== 'undefined') {
      if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
      if (measureCtx?.measureText) {
        measureCtx.font = `100px ${font}`;
        const m = measureCtx.measureText(text || ' ');
        const left = m.actualBoundingBoxLeft ?? 0;
        const right = m.actualBoundingBoxRight ?? m.width;
        const ascent = m.actualBoundingBoxAscent ?? 80;
        const descent = m.actualBoundingBoxDescent ?? 20;
        const width = left + right;
        const height = ascent + descent;
        if (width > 0 && height > 0) ink = { width, height, left, ascent };
      }
    }
    inkCache.set(key, ink);
    return ink;
  }

  /**
   * Re-measure every line of text so its box hugs the letters.
   *
   * Without this the size control and the visible words drift apart, and the
   * placement sent to the printer would describe a box bigger than the artwork
   * in it. Called after any edit and again when a face finishes downloading —
   * text placed before its font arrived was measured against the fallback.
   */
  function fitTextBoxes(record = false): void {
    let changed = false;
    const next: ZoneDesign = { ...design };
    for (const [zoneId, els] of Object.entries(design)) {
      const area = areaForId(zoneId);
      const updated = els.map((el) => {
        if (el.kind !== 'text') return el;
        const ink = measureInk(el.text, el.font);
        // No canvas, or a string that measures to nothing: leave the box as it
        // is rather than inventing proportions for letters we cannot see.
        if (!ink) return el;
        const heightIn = textHeightIn(el.place.widthIn, ink.width, ink.height);
        if (Math.abs(heightIn - el.place.heightIn) < 0.005) return el;
        changed = true;
        // Grow and shrink about the middle. Re-measuring after an edit — or
        // after a face finally downloads — should not walk the words up the
        // product away from where they were put.
        const yIn = el.place.yIn + (el.place.heightIn - heightIn) / 2;
        return { ...el, place: clampToArea({ ...el.place, heightIn, yIn }, area) };
      });
      next[zoneId] = updated;
    }
    if (!changed) return;
    design = next;
    if (record) commit();
    emitChange();
  }

  onMount(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    const refit = (): void => fitTextBoxes();
    document.fonts.addEventListener('loadingdone', refit);
    return () => document.fonts.removeEventListener('loadingdone', refit);
  });

  // --- surface colour, for contrast advice ---------------------------------
  //
  // A storefront's catalogue is whatever the owner uploaded, not a garment
  // table we control, so the colour a design will sit on is read from the
  // photograph itself rather than declared.

  let surfaceByZone: Record<string, string> = {};

  function sampleSurface(img: HTMLImageElement): void {
    if (typeof document === 'undefined' || !img.naturalWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    try {
      ctx.drawImage(img, 0, 0);
      const next: Record<string, string> = {};
      // The photo is drawn `contain` inside a square container: work out where
      // it actually sits so a zone's percentages land on the right pixels.
      const ar = img.naturalWidth / img.naturalHeight;
      const drawW = ar >= 1 ? 1 : ar;
      const drawH = ar >= 1 ? 1 / ar : 1;
      const drawX = (1 - drawW) / 2;
      const drawY = (1 - drawH) / 2;
      for (const zone of zones) {
        const u = ((zone.xPercent + zone.widthPercent / 2) / 100 - drawX) / drawW;
        const v = ((zone.yPercent + zone.heightPercent / 2) / 100 - drawY) / drawH;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const size = Math.max(2, Math.round(Math.min(img.naturalWidth, img.naturalHeight) * 0.04));
        const x = Math.min(
          Math.max(0, Math.round(u * img.naturalWidth - size / 2)),
          img.naturalWidth - size
        );
        const y = Math.min(
          Math.max(0, Math.round(v * img.naturalHeight - size / 2)),
          img.naturalHeight - size
        );
        const { data } = ctx.getImageData(x, y, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue; // ignore a cut-out background
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n += 1;
        }
        if (!n) continue;
        const hex = (v2: number): string =>
          Math.round(v2 / n)
            .toString(16)
            .padStart(2, '0');
        next[zone.id] = `#${hex(r)}${hex(g)}${hex(b)}`;
      }
      surfaceByZone = next;
    } catch {
      // A photo served from another origin taints the canvas. Contrast advice
      // is a nicety; losing it is not worth breaking the customizer over.
      surfaceByZone = {};
    }
  }

  // --- drafts --------------------------------------------------------------

  function storage(): Storage | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }

  function persistDraft(): void {
    if (!designId) return;
    saveDraft(storage(), pack(productId, design, designId, designRevision));
  }

  function startOver(): void {
    design = {};
    selectedId = null;
    restoredDraft = false;
    clearDraft(storage(), productId);
    history = createHistory<ZoneDesign>({});
    emitChange();
  }

  // --- setup ---------------------------------------------------------------

  /** Read an older single-upload customization into the element model. */
  function fromCustomization(c: CartItemCustomization): DesignElement[] {
    if (c.elements?.length) return c.elements;
    if (!c.imageDataUrl) return [];
    const area = areaForId(c.zoneId);
    const el: ImageElement = {
      kind: 'image',
      id: 'el-1',
      src: c.imageDataUrl,
      mediaId: c.mediaId ?? null,
      name: c.originalFilename,
      naturalWidth: c.naturalWidth ?? 0,
      naturalHeight: c.naturalHeight ?? 0,
      place: legacyToPlacement(
        {
          offsetXPercent: c.offsetXPercent,
          offsetYPercent: c.offsetYPercent,
          scale: c.scale,
          rotation: c.rotation ?? 0
        },
        c.naturalWidth ?? 0,
        c.naturalHeight ?? 0,
        area
      )
    };
    return [el];
  }

  onMount(() => {
    if (initialCustomizations.length > 0) {
      const restoredDesign: ZoneDesign = {};
      for (const c of initialCustomizations) {
        const els = fromCustomization(c);
        if (els.length) restoredDesign[c.zoneId] = els;
      }
      design = restoredDesign;
      designId = initialCustomizations[0]?.designId || newDesignId();
      designRevision = initialCustomizations[0]?.designRevision ?? 0;
      history = createHistory<ZoneDesign>(design);
      emitChange();
      return;
    }

    const draft = loadDraft(storage(), productId);
    if (draft && draftHasWork(draft)) {
      design = draft.zones;
      designId = draft.designId;
      designRevision = draft.revision;
      restoredDraft = true;
      history = createHistory<ZoneDesign>(design);
      emitChange();
      return;
    }

    designId = draft?.designId || newDesignId();
    designRevision = draft?.revision ?? 0;
    history = createHistory<ZoneDesign>({});
  });

  // --- media ---------------------------------------------------------------

  let selectedMediaIndex = 0;
  $: imageMedia = media.filter((m) => m.type === 'image');
  $: currentImage = imageMedia.length > 0 ? imageMedia[selectedMediaIndex]?.url : productImage;
  $: currentMediaId = imageMedia.length > 0 ? imageMedia[selectedMediaIndex]?.id : null;
  $: visibleZones = zones.filter((z) => z.mediaId === null || z.mediaId === currentMediaId);

  function selectMedia(index: number): void {
    selectedMediaIndex = index;
  }

  // --- selection -----------------------------------------------------------

  $: activeZone = zones.find((z) => z.id === activeZoneId) ?? null;
  $: activeArea = activeZone ? areaFor(activeZone) : null;
  // Reads `design` by name rather than through `elementsFor`: Svelte tracks the
  // identifiers an expression mentions, not what a helper reads inside itself,
  // so routing this through the helper would freeze the panel at whatever the
  // design was when the zone was first selected. The same applies to the
  // `{@const}` bindings in the markup below.
  $: activeElements = (activeZoneId ? design[activeZoneId] : undefined) ?? [];
  $: selected = activeElements.find((e) => e.id === selectedId) ?? null;
  $: selectedQuality =
    selected?.kind === 'image' && activeArea && selected.naturalWidth
      ? assessPlacedImage(
          selected.naturalWidth,
          selected.naturalHeight,
          selected.place,
          activeArea.requiredDpi
        )
      : null;
  $: advice =
    selected?.kind === 'text' && activeZoneId
      ? contrastAdvice(surfaceByZone[activeZoneId] ?? '', selected.color)
      : null;

  function selectZone(zoneId: string): void {
    activeZoneId = zoneId;
    if (!elementsFor(zoneId).some((e) => e.id === selectedId)) {
      selectedId = elementsFor(zoneId).at(-1)?.id ?? null;
    }
  }

  function selectElement(zoneId: string, id: string): void {
    activeZoneId = zoneId;
    selectedId = id;
  }

  // --- adding --------------------------------------------------------------

  /**
   * One persistent input per zone, rather than a throwaway created on click.
   * A real element in the DOM can be labelled, reached by assistive tech, and
   * driven by tests; a detached one can be none of those.
   */
  let fileInputs: Record<string, HTMLInputElement> = {};

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
    input.value = '';

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
      const area = areaFor(zone);
      const placement = placeNewImage(width, height, area);

      // Warn before uploading if the original can't hold up at the size it is
      // about to be placed at — cheaper for the customer to find out now.
      const geometry = printGeometryFor(zone.id);
      if (geometry) {
        const quality = assessPlacedImage(width, height, placement, area.requiredDpi);
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

      addElement(zone.id, {
        kind: 'image',
        id: 'pending',
        src: uploaded.url,
        mediaId: uploaded.id,
        name: file.name,
        naturalWidth: width,
        naturalHeight: height,
        place: placement
      });
    } catch (err) {
      toastStore.error(err instanceof Error ? err.message : 'Could not upload that design');
    } finally {
      URL.revokeObjectURL(objectUrl);
      uploadingZones.delete(zone.id);
      uploadingZones = new Set(uploadingZones);
    }
  }

  function addText(zone: ProductCustomizationZone): void {
    const area = areaFor(zone);
    const el: TextElement = {
      kind: 'text',
      id: 'pending',
      text: 'Your text',
      color: DEFAULT_INK,
      font: DEFAULT_FONT,
      place: placeNewText(area)
    };
    addElement(zone.id, el);
    fitTextBoxes();
  }

  // --- editing -------------------------------------------------------------

  function setText(value: string): void {
    if (!activeZoneId || !selected) return;
    updateElement(
      activeZoneId,
      selected.id,
      (el) => (el.kind === 'text' ? { ...el, text: value } : el),
      false
    );
    fitTextBoxes();
  }

  function setFont(stack: string): void {
    if (!activeZoneId || !selected) return;
    loadFont(fontFor(stack));
    updateElement(activeZoneId, selected.id, (el) =>
      el.kind === 'text' ? { ...el, font: stack } : el
    );
    fitTextBoxes();
  }

  function setInk(hex: string): void {
    if (!activeZoneId || !selected) return;
    const color = normaliseHex(hex);
    if (!color) return;
    updateElement(activeZoneId, selected.id, (el) => (el.kind === 'text' ? { ...el, color } : el));
  }

  function setWidth(widthIn: number, record = true): void {
    if (!activeZoneId || !selected) return;
    place(activeZoneId, selected.id, (p, area) => resizeToWidth(p, widthIn, area), record);
    if (selected.kind === 'text') fitTextBoxes(record);
  }

  function setRotation(degrees: number, record = true): void {
    if (!activeZoneId || !selected) return;
    place(
      activeZoneId,
      selected.id,
      (p, area) => clampToArea({ ...p, rotation: snapRotation(degrees) }, area),
      record
    );
  }

  function doCenter(): void {
    if (!activeZoneId || !selected) return;
    place(activeZoneId, selected.id, (p, area) => centerIn(p, area));
  }

  function doFit(): void {
    if (!activeZoneId || !selected) return;
    place(activeZoneId, selected.id, (p, area) => fitToArea(p, area));
    if (selected.kind === 'text') fitTextBoxes(false);
  }

  function doFlip(): void {
    if (!activeZoneId || !selected) return;
    setElements(activeZoneId, flipElement(elementsFor(activeZoneId), selected.id));
  }

  function doDuplicate(): void {
    if (!activeZoneId || !selected) return;
    const result = duplicateElement(
      elementsFor(activeZoneId),
      selected.id,
      areaForId(activeZoneId)
    );
    setElements(activeZoneId, result.elements);
    if (result.id) selectedId = result.id;
  }

  function doReorder(direction: 'forward' | 'back'): void {
    if (!activeZoneId || !selected) return;
    setElements(activeZoneId, reorder(elementsFor(activeZoneId), selected.id, direction));
  }

  function doRemove(zoneId: string, id: string): void {
    setElements(zoneId, removeElement(elementsFor(zoneId), id));
    if (selectedId === id) selectedId = elementsFor(zoneId).at(-1)?.id ?? null;
  }

  // --- dragging ------------------------------------------------------------

  let drag: {
    zoneId: string;
    id: string;
    startX: number;
    startY: number;
    boxWidth: number;
    place: DesignElement['place'];
  } | null = null;

  function handleDragStart(
    e: MouseEvent | TouchEvent,
    zone: ProductCustomizationZone,
    el: DesignElement
  ): void {
    e.preventDefault();
    selectElement(zone.id, el.id);
    const point = 'touches' in e ? e.touches[0] : e;
    drag = {
      zoneId: zone.id,
      id: el.id,
      startX: point.clientX,
      startY: point.clientY,
      boxWidth: printBoxPx(zone, areaFor(zone)).width,
      place: el.place
    };
  }

  function handleDragMove(e: MouseEvent | TouchEvent): void {
    if (!drag) return;
    e.preventDefault();
    const point = 'touches' in e ? e.touches[0] : e;
    const area = areaForId(drag.zoneId);
    const { dxIn, dyIn } = pointerDeltaToInches(
      point.clientX - drag.startX,
      point.clientY - drag.startY,
      drag.boxWidth,
      area
    );
    const start = drag.place;
    updateElement(
      drag.zoneId,
      drag.id,
      (el) => ({ ...el, place: moveBy(start, dxIn, dyIn, area) }),
      false
    );
  }

  function handleDragEnd(): void {
    if (!drag) return;
    drag = null;
    // One drag gesture = one undo step.
    commit();
    emitChange();
  }

  /**
   * Keyboard placement. Arrow keys nudge (shift = coarse), +/- resize, [/]
   * rotate, Delete removes — without this the design tools are mouse-only and
   * unusable for anyone relying on a keyboard.
   */
  function handleElementKeydown(
    e: KeyboardEvent,
    zone: ProductCustomizationZone,
    el: DesignElement
  ): void {
    const area = areaFor(zone);
    const step = (e.shiftKey ? 0.5 : 0.1) * (area.physical ? 1 : area.widthIn / 10);
    const move = (direction: Direction): void =>
      place(zone.id, el.id, (p) => nudgeBy(p, direction, step, area));

    const handlers: Record<string, () => void> = {
      ArrowLeft: () => move('left'),
      ArrowRight: () => move('right'),
      ArrowUp: () => move('up'),
      ArrowDown: () => move('down'),
      '+': () => place(zone.id, el.id, (p) => resizeToWidth(p, p.widthIn * 1.1, area)),
      '=': () => place(zone.id, el.id, (p) => resizeToWidth(p, p.widthIn * 1.1, area)),
      '-': () => place(zone.id, el.id, (p) => resizeToWidth(p, p.widthIn / 1.1, area)),
      '[': () =>
        place(zone.id, el.id, (p) => clampToArea({ ...p, rotation: p.rotation - 15 }, area)),
      ']': () =>
        place(zone.id, el.id, (p) => clampToArea({ ...p, rotation: p.rotation + 15 }, area)),
      Delete: () => doRemove(zone.id, el.id),
      Backspace: () => doRemove(zone.id, el.id)
    };
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }

  // --- font picker ---------------------------------------------------------

  let fontCategory = '';
  $: fontChoices = filterFonts('', fontCategory);

  // --- output --------------------------------------------------------------

  /**
   * What the cart is told.
   *
   * `elements` is the design; everything beside it describes the *first image
   * element* in the old single-upload terms, so the cart summary, the order
   * tables and the admin view keep working for the designs that are one
   * picture — which is most of them.
   */
  function emitChange(): void {
    const customizations: CartItemCustomization[] = [];
    for (const zone of zones) {
      const els = elementsFor(zone.id);
      if (!els.length) continue;
      const area = areaFor(zone);
      const firstImage = els.find((e): e is ImageElement => e.kind === 'image');
      const legacy = firstImage
        ? placementToLegacy(
            firstImage.place,
            firstImage.naturalWidth,
            firstImage.naturalHeight,
            area
          )
        : { offsetXPercent: 0, offsetYPercent: 0, scale: 1, rotation: 0 };
      customizations.push({
        zoneId: zone.id,
        zoneName: zone.name,
        elements: els,
        designId,
        designRevision: designRevision + 1,
        imageDataUrl: firstImage?.src ?? '',
        mediaId: firstImage?.mediaId ?? null,
        naturalWidth: firstImage?.naturalWidth ?? 0,
        naturalHeight: firstImage?.naturalHeight ?? 0,
        originalFilename: firstImage?.name ?? 'Text design',
        ...legacy
      });
    }
    dispatch('customizationsChange', customizations);
  }

  /** How wide an element is, in the words that zone can honestly use. */
  function widthLabel(widthIn: number, area: DesignArea): string {
    if (area.physical) return `${widthIn.toFixed(2)}″`;
    return `${Math.round((widthIn / area.widthIn) * 100)}%`;
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
      <h3>Design Your Product</h3>
      <p class="customizer-hint">
        Add artwork or text to a print area, then drag to position. With something selected: arrow
        keys nudge, <kbd>+</kbd>/<kbd>−</kbd> resize, <kbd>[</kbd>/<kbd>]</kbd> rotate.
      </p>
    </div>
    <div class="history-actions">
      <button
        class="ghost-btn"
        on:click={handleUndo}
        disabled={!canUndo(history)}
        title="Undo (last design change)"
      >
        Undo
      </button>
      <button class="ghost-btn" on:click={handleRedo} disabled={!canRedo(history)} title="Redo">
        Redo
      </button>
    </div>
  </div>

  {#if restoredDraft}
    <p class="draft-note">
      Picked up where you left off.
      <button class="link-btn" on:click={startOver}>Start over</button>
    </p>
  {/if}

  <div
    class="preview-container"
    bind:this={containerEl}
    role="img"
    aria-label="Product design preview"
  >
    <img
      class="product-image"
      src={currentImage}
      alt={productName}
      bind:this={productImgEl}
      on:load={() => sampleSurface(productImgEl)}
    />

    {#each visibleZones as zone (zone.id)}
      {@const area = areaFor(zone)}
      {@const els = design[zone.id] ?? []}
      {@const box = printBoxPx(zone, area)}
      <input
        class="visually-hidden-input"
        type="file"
        accept={zone.allowedTypes.join(',')}
        bind:this={fileInputs[zone.id]}
        on:change={(e) => handleFileSelect(e, zone)}
        aria-label="Upload artwork for {zone.name}"
        data-zone-input={zone.id}
      />
      <div
        class="zone-overlay"
        class:active={activeZoneId === zone.id}
        class:has-design={els.length > 0}
        style="left: {zone.xPercent}%; top: {zone.yPercent}%; width: {zone.widthPercent}%; height: {zone.heightPercent}%;"
        role="group"
        aria-label="Print area: {zone.name}"
      >
        <button
          class="zone-surface"
          on:click={() => (els.length ? selectZone(zone.id) : fileInputs[zone.id]?.click())}
          aria-label={els.length
            ? `Select print area: ${zone.name}`
            : `Add artwork to ${zone.name}`}
          title={els.length ? zone.name : `Add artwork: ${zone.name}`}
        >
          {#if !els.length}
            <span class="zone-placeholder">
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
            </span>
          {/if}
        </button>

        <div
          class="print-box"
          style="left:{box.left}px; top:{box.top}px; width:{box.width}px; height:{box.height}px;"
        >
          {#each els as el (el.id)}
            <button
              class="element"
              class:selected={activeZoneId === zone.id && selectedId === el.id}
              style={elementStyle(el, area)}
              on:mousedown|stopPropagation={(e) => handleDragStart(e, zone, el)}
              on:touchstart|stopPropagation={(e) => handleDragStart(e, zone, el)}
              on:click|stopPropagation={() => selectElement(zone.id, el.id)}
              on:keydown={(e) => handleElementKeydown(e, zone, el)}
              aria-label={el.kind === 'image' ? `Artwork: ${el.name}` : `Text: ${el.text}`}
            >
              {#if el.kind === 'image'}
                <img class="element-image" src={el.src} alt="" draggable="false" />
              {:else}
                {@const origin = textOrigin(el)}
                <svg
                  class="element-text"
                  viewBox={textViewBox(el)}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <text
                    x={origin.x}
                    y={origin.y}
                    font-size="100"
                    font-family={el.font}
                    fill={el.color}>{el.text}</text
                  >
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

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

  {#if visibleZones.length > 0}
    <div class="zone-controls">
      {#each visibleZones as zone (zone.id)}
        {@const area = areaFor(zone)}
        {@const els = design[zone.id] ?? []}
        {@const geometry = printGeometryFor(zone.id)}
        <div class="zone-control" class:active={activeZoneId === zone.id}>
          <div class="zone-head">
            <span class="zone-name">
              {zone.name}
              {#if geometry}
                <span class="zone-spec"
                  >{formatPhysicalSize(geometry)} · {geometry.requiredDpi} DPI</span
                >
              {/if}
            </span>
            <div class="placement-actions">
              <button class="upload-btn" on:click={() => fileInputs[zone.id]?.click()}>
                Add artwork
              </button>
              <button class="ghost-btn" on:click={() => addText(zone)}>Add text</button>
            </div>
          </div>

          {#if uploadingZones.has(zone.id)}
            <span class="upload-status">Uploading full-resolution original…</span>
          {/if}

          {#if els.length}
            <ul class="layers" aria-label="Design elements on {zone.name}">
              {#each [...els].reverse() as el (el.id)}
                <li class="layer" class:selected={activeZoneId === zone.id && selectedId === el.id}>
                  <button class="layer-select" on:click={() => selectElement(zone.id, el.id)}>
                    <span class="layer-kind">{el.kind === 'image' ? 'Art' : 'Text'}</span>
                    <span class="layer-name">
                      {el.kind === 'image' ? el.name : el.text || 'Empty text'}
                    </span>
                    <span class="layer-size">{widthLabel(el.place.widthIn, area)}</span>
                  </button>
                  <button
                    class="remove-btn"
                    on:click={() => doRemove(zone.id, el.id)}
                    aria-label="Remove {el.kind === 'image' ? el.name : el.text} from {zone.name}"
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
                </li>
              {/each}
            </ul>
          {:else}
            <p class="zone-empty">Nothing here yet — add artwork or a line of text.</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if selected && activeZone && activeArea}
    <div class="element-editor">
      <div class="editor-head">
        <strong>{selected.kind === 'image' ? selected.name : 'Text'}</strong>
        <span class="editor-zone">on {activeZone.name}</span>
      </div>

      {#if selected.kind === 'text'}
        <div class="field">
          <label for="design-text">Words</label>
          <input
            id="design-text"
            type="text"
            value={selected.text}
            maxlength="60"
            on:input={(e) => setText(e.currentTarget.value)}
            on:change={commit}
          />
        </div>

        <div class="field">
          <label for="design-font-category">Style</label>
          <select
            id="design-font-category"
            bind:value={fontCategory}
            aria-label="Filter fonts by style"
          >
            <option value="">All styles</option>
            {#each FONT_CATEGORIES as category (category)}
              <option value={category}>{category}</option>
            {/each}
          </select>
          <select
            aria-label="Font"
            value={selected.font}
            on:change={(e) => setFont(e.currentTarget.value)}
          >
            {#each fontChoices as font (font.id)}
              <option value={font.stack}>{font.name}</option>
            {/each}
            {#if !FONTS.some((f) => f.stack === selected.font)}
              <option value={selected.font}>Current</option>
            {/if}
          </select>
        </div>

        <div class="field">
          <span class="field-label">Ink — {inkNameFor(selected.color)}</span>
          <div class="swatches">
            {#each INK_COLORS as ink (ink.id)}
              <button
                class="swatch"
                class:selected={normaliseHex(selected.color) === ink.hex}
                style="background:{ink.hex}"
                on:click={() => setInk(ink.hex)}
                aria-label={ink.name}
                title={ink.name}
              ></button>
            {/each}
            <input
              class="swatch-custom"
              type="color"
              value={normaliseHex(selected.color) || '#000000'}
              on:input={(e) => setInk(e.currentTarget.value)}
              aria-label="Custom ink colour"
            />
          </div>
        </div>

        {#if advice}
          <p class="advice">{advice}</p>
        {/if}
      {:else}
        <p class="file-name" title={selected.name}>
          {selected.name}
          {#if selected.naturalWidth}
            <span class="file-dims">{selected.naturalWidth}×{selected.naturalHeight}px</span>
          {/if}
        </p>
        {#if selectedQuality}
          <span
            class="quality-badge {selectedQuality.rating}"
            title="Effective resolution at the size it is printed."
          >
            {selectedQuality.dpi} DPI · {selectedQuality.message}
          </span>
        {/if}
      {/if}

      <div class="scale-control">
        <label for="design-width">Size</label>
        <input
          id="design-width"
          type="range"
          min={MIN_ELEMENT_WIDTH_IN}
          max={activeArea.widthIn}
          step="0.05"
          value={selected.place.widthIn}
          on:input={(e) => setWidth(parseFloat(e.currentTarget.value), false)}
          on:change={commit}
        />
        <span class="scale-value">{widthLabel(selected.place.widthIn, activeArea)}</span>
      </div>

      <div class="scale-control">
        <label for="design-rotation">Rotate</label>
        <input
          id="design-rotation"
          type="range"
          min="0"
          max="359"
          step="1"
          value={selected.place.rotation}
          on:input={(e) => setRotation(parseFloat(e.currentTarget.value), false)}
          on:change={commit}
        />
        <span class="scale-value">{Math.round(selected.place.rotation)}°</span>
      </div>

      <div class="placement-actions">
        <button class="ghost-btn" on:click={doFit} title="Fill the print area">Fit</button>
        <button class="ghost-btn" on:click={doCenter} title="Centre in the print area"
          >Centre</button
        >
        <button class="ghost-btn" on:click={doFlip} title="Mirror horizontally">Flip</button>
        <button class="ghost-btn" on:click={doDuplicate} title="Duplicate">Duplicate</button>
        <button
          class="ghost-btn"
          on:click={() => doReorder('forward')}
          disabled={activeElements.at(-1)?.id === selected.id}
          title="Bring forward"
        >
          Forward
        </button>
        <button
          class="ghost-btn"
          on:click={() => doReorder('back')}
          disabled={activeElements[0]?.id === selected.id}
          title="Send back"
        >
          Back
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .product-customizer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .customizer-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
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

  .draft-note {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: var(--color-primary, #6366f1);
    text-decoration: underline;
    cursor: pointer;
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
    overflow: hidden;
    transition:
      border-color 0.2s,
      background-color 0.2s,
      box-shadow 0.2s;
  }

  .zone-overlay.active {
    border-color: var(--color-primary, #6366f1);
    border-style: solid;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
  }

  .zone-overlay.has-design {
    border-color: var(--color-success, #10b981);
    background: transparent;
  }

  .zone-overlay.has-design.active {
    border-color: var(--color-success, #10b981);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
  }

  /* Fills the zone behind the design: clicking bare product selects the area
     (or, on an empty one, opens the file picker) without swallowing clicks on
     the elements stacked above it. */
  .zone-surface {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    /* `inherit` rather than a `--color-*` token: a storefront theme is applied
       to a subtree, so a token here can still hold light-mode values while the
       page is dark. Inheriting follows whatever the panel actually is. */
    color: inherit;
    cursor: pointer;
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

  .zone-surface:hover .zone-placeholder {
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

  /* The print area at its true proportions, letterboxed inside the zone the
     owner drew. Everything placed is positioned as a percentage of this box,
     so an inch across reads the same as an inch down. */
  .print-box {
    position: absolute;
    pointer-events: none;
  }

  .element {
    position: absolute;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    cursor: grab;
    pointer-events: auto;
    transform-origin: center center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .element:active {
    cursor: grabbing;
  }

  .element.selected {
    border-color: var(--color-primary, #6366f1);
    border-style: dashed;
  }

  .element:focus-visible {
    outline: 2px solid var(--color-primary, #6366f1);
    outline-offset: 2px;
  }

  .element-image {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
  }

  /* Fills the box exactly, because the box was measured from this ink in
     `fitTextBoxes` — which is what keeps the preview and the print agreeing. */
  .element-text {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
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
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-accent);
    border-radius: 6px;
    border: 1px solid var(--color-border-secondary);
    font-size: 0.85rem;
    transition: border-color 0.2s;
  }

  .zone-control.active {
    border-color: var(--color-primary, #6366f1);
    background: var(--color-bg-primary);
  }

  .zone-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .zone-name {
    font-weight: 600;
    color: var(--color-text-primary);
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

  .zone-empty {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-tertiary);
  }

  .layers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .layer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm, 4px);
  }

  .layer.selected {
    border-color: var(--color-primary, #6366f1);
  }

  .layer-select {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    min-height: var(--touch-target, 44px);
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .layer-kind {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-tertiary);
    flex-shrink: 0;
  }

  .layer-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-size {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .element-editor {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.75rem;
    border: 1px solid var(--color-primary, #6366f1);
    border-radius: 6px;
    background: var(--color-bg-primary);
  }

  .editor-head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .editor-zone {
    font-size: 0.8125rem;
    color: var(--color-text-tertiary);
  }

  .field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .field label,
  .field-label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .field input[type='text'],
  .field select {
    min-height: var(--touch-target, 44px);
    padding: 0.25rem 0.5rem;
    font: inherit;
    color: inherit;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: var(--radius-sm, 4px);
  }

  .field input[type='text'] {
    flex: 1;
    min-width: 8rem;
  }

  .swatches {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .swatch {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 2px solid var(--color-border-secondary);
    border-radius: 50%;
    cursor: pointer;
  }

  .swatch.selected {
    border-color: var(--color-primary, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }

  .swatch-custom {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--color-border-secondary);
    border-radius: var(--radius-sm, 4px);
    background: transparent;
    cursor: pointer;
  }

  .advice {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-warning, #d97706);
  }

  .upload-status {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
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
    align-self: flex-start;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm, 4px);
    border: 1px solid currentColor;
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
    margin: 0;
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .file-dims {
    margin-left: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .scale-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .scale-control label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .scale-control input[type='range'] {
    flex: 1;
    max-width: 220px;
    accent-color: var(--color-primary, #6366f1);
  }

  .scale-value {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    min-width: 3.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .upload-btn {
    min-height: var(--touch-target, 44px);
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
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
    .zone-head {
      align-items: flex-start;
    }

    .scale-control input[type='range'] {
      max-width: none;
    }
  }
</style>
