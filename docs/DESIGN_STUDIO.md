# The customer design studio

What a shopper uses to put artwork and words on a product before they buy it,
and what the store owner receives when they do.

Lives in `src/lib/components/ProductCustomizer.svelte`, over four pure modules:

| Module                            | Owns                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `src/lib/utils/designElements.ts` | the design model and every placement rule               |
| `src/lib/utils/designText.ts`     | type, ink, and whether the two will be visible together |
| `src/lib/utils/printQuality.ts`   | how sharp a file will actually print                    |
| `src/lib/utils/designDraft.ts`    | keeping a design between visits                         |

## Inches are the source of truth

The obvious way to build a product customizer keeps positions in screen pixels,
or in percentages of whatever box the preview happened to be, and generates the
print file from what the preview rendered. That produces a file a few hundred
pixels wide — far below what a press needs — and it does it silently. The shirt
arrives soft and blocky and nobody knows why.

So a `Placement` is measured in **inches on the product**:

```ts
interface Placement {
  xIn: number; // from the top-left of the print area
  yIn: number;
  widthIn: number;
  heightIn: number;
  rotation: number; // degrees clockwise, about its own centre
}
```

The preview scales inches to screen pixels for display. The print-file builder
scales the same inches to the provider's required DPI. The preview can be any
size on any screen without touching what gets printed.

Two consequences worth knowing:

- **Print quality is measured, not guessed.** `assessPlacedImage` divides the
  upload's real pixels by the inches it covers, rates the weaker of the two
  axes, and words the verdict for a customer rather than a printer — including
  the widest that particular file can print and still be sharp.
- **The preview letterboxes.** An owner draws a zone box on a product photo by
  eye; the print area behind it has real measurements. `printBoxPx` fits the
  second inside the first, so an inch across reads the same as an inch down and
  a circle stays a circle.

## A design is a list, not an upload

Each zone holds a stack of `DesignElement`s, bottom of the stack first:

- `ImageElement` — an upload, kept at full resolution in R2 and referenced by
  its `/api/media/...` URL. Never downsampled on the way in.
- `TextElement` — words, a font stack, and an ink colour.

Elements can be added, moved, resized, rotated, mirrored, duplicated, reordered
and deleted; `designElements.ts` holds all of it as pure functions, so the
rules are unit-tested directly and the server-side print-file builder can reuse
them to reproduce the customer's placement exactly.

Mirroring is a **flag**, not a rewrite of the artwork: the print file and the
production sheet can both describe it, and the original is never altered.

### Text boxes are measured, not assumed

A text element's width is chosen by the customer; its height comes from
measuring the string in the face it will be printed in (`measureInk` →
`fitTextBoxes` → `textHeightIn`). A script runs a third wider than a condensed
sans at the same size, so without this the size control and the visible words
drift apart and the placement sent to the printer describes a box bigger than
the artwork in it.

What is measured is the **ink box** — `actualBoundingBox*` from a canvas at a
100px em — not the em square. The em square is taller than the letters and
narrower than an overhanging one, so a box taken from it either wastes room or
lets a descender out past the edge of the print area. What is stored is the
rectangle the printer will actually put ink in.

That is also why text renders as inline SVG rather than a styled `<span>`: HTML
gives no way to put a baseline at a known place, since the gap between a line
box and the ink in it depends on the face, while an SVG whose `viewBox` is the
measured ink lines the two up by construction at any size. It is the same
description a server-side renderer will work from when print files land.

Re-measuring keeps the box's **centre** fixed, so an edit — or a face finally
downloading, which is why `fonts.loadingdone` triggers a refit — does not walk
the words up the product away from where they were put.

### Type and ink

`designText.ts` offers system stacks first — no network, identical for everyone
— then a curated set of Google faces that merch is actually set in. A face is
fetched **only when it is chosen**, so a storefront nobody customizes makes no
third-party request at all.

Ink leads with a stocked palette and keeps a colour picker behind it. Handing a
customer a system colour dialog to pick from sixteen million asks them to solve
a problem they do not have, and on a phone it covers the design they were
looking at.

`contrastAdvice` catches black artwork on a black shirt — which looks fine on a
white canvas and disappears on the garment. The surface colour is **sampled
from the product photograph** behind the print area rather than declared,
because a storefront's catalogue is whatever the owner uploaded, not a garment
table we control. A photo served cross-origin taints the canvas; the advice is
dropped rather than the customizer breaking.

## Zones with no print area behind them

A zone that isn't linked to a template print area still needs to be placed and
dragged, so `areaFromGeometry` gives it a nominal 10-inch canvas shaped by the
zone's own aspect (the preview container is square, so that ratio is stable).
Everything travels the same code path; only the DPI advice is withheld, because
there is no real measurement to be honest about — and sizes are shown as a
percentage rather than in fake inches.

## Drafts

Placing artwork carefully takes twenty minutes, and a stray refresh used to
throw all of it away. A draft is saved to `localStorage` per product — shoppers
are anonymous, so there is no account to hang it on — carrying:

- a **design id**, generated once and kept for the life of the design, so a
  store sees "revision 2 of one design" rather than two unrelated orders;
- a **revision count**, which is where that number comes from.

Only geometry and R2 URLs are written, never file bytes, which is why a draft
stays well inside the storage quota. Format changes, another product's draft,
and anything older than 30 days are dropped rather than half-restored.

## What reaches the order

`CartItemCustomization.elements` carries the design. Everything beside it —
`imageDataUrl`, `scale`, `offsetXPercent`, … — describes the **first image
element** in the older single-upload terms, so the cart summary, the order
tables, and anything else reading those fields keep working for designs that
are one picture, which is most of them. A text-only design has an empty
`imageDataUrl`.

Migration `0102` adds `elements`, `design_id` and `design_revision` to
`order_item_customizations`. Reading is version-blind: `readElements` returns
the stored design, or reconstructs a single image element from the legacy
columns for orders written before that migration.

Checkout is necessarily public — shoppers are anonymous — so
`sanitizeElements` narrows whatever the browser sent before it is stored:
at most 40 elements a zone, 200 characters a line, unknown kinds dropped,
non-finite numbers coerced. A row that survives it describes a design the
print-file builder can render, so nothing downstream re-validates it.

## Where this came from

The model is ported from the CustomPerfections design studio
(`~/_Projects/client/CustomPerfections/site/src/lib/design/`), which worked the
same problems out first against one shop's real jobs. The differences are
Ammoura's: many tenants rather than one catalogue, uploads that already live in
R2 (so a restored draft shows real artwork instead of a dead `blob:` handle),
and print areas that come from Printful's specs rather than a hand-measured
garment table.

Still on the CustomPerfections side and not ported: 3-D preview of hard goods
(`profiles.ts`, `wrap.ts`), per-size print areas, and rendering the export
canvas. The last one is P2 in `plans/pod-authoring-and-fulfillment.md` — the
compositing spike — and it is the reason placements are stored in inches now.
