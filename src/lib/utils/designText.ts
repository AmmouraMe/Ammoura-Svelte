/**
 * Words on a product: the type a shopper can choose from, the inks it can be
 * printed in, and whether the two will actually be visible together.
 *
 * Type is the half of a customizer people reach for when they have no artwork
 * — a name, a date, an in-joke — and it is the half a single-upload tool cannot
 * do at all. What matters is that the preview and the print file agree, so a
 * font is stored as the CSS stack that rendered it, not as a display name.
 *
 * Faces are fetched from Google's CDN and only when one is first used, so a
 * storefront that nobody customizes makes no third-party request at all. The
 * system stacks at the top of the list cost nothing either way, which is why
 * they lead.
 *
 * Pure module: `loadFont` is the one function that touches the DOM, and it is
 * a no-op outside the browser.
 */

export interface FontChoice {
  id: string;
  /** Fetched from Google on demand rather than served by the storefront. */
  remote?: boolean;
  /** Grouping for the picker's filter. */
  category: FontCategory;
  /** What it is called in the interface — plain words, not typographic jargon. */
  name: string;
  stack: string;
}

export type FontCategory = 'display' | 'sans' | 'serif' | 'slab' | 'script' | 'hand' | 'mono';

export const FONT_CATEGORIES: FontCategory[] = [
  'display',
  'sans',
  'serif',
  'slab',
  'script',
  'hand',
  'mono'
];

/** A Google face, described once. `remote` and the stack follow from the name. */
function google(name: string, category: FontCategory): FontChoice {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    category,
    remote: true,
    stack: `'${name}', ${fallbackFor(category)}`
  };
}

function fallbackFor(category: FontCategory): string {
  switch (category) {
    case 'serif':
    case 'slab':
      return 'serif';
    case 'mono':
      return 'monospace';
    case 'script':
    case 'hand':
      return 'cursive';
    default:
      return 'sans-serif';
  }
}

/**
 * The type on offer.
 *
 * System stacks first: they render identically for everyone, need no network,
 * and are what most short pieces of text want anyway. The Google faces after
 * them are the ones merch is actually set in — heavy display faces, condensed
 * sans, a few scripts — rather than a catalog dump nobody can choose from.
 */
export const FONTS: FontChoice[] = [
  { id: 'system-sans', name: 'Plain sans', category: 'sans', stack: 'system-ui, sans-serif' },
  { id: 'system-serif', name: 'Plain serif', category: 'serif', stack: 'Georgia, serif' },
  { id: 'system-mono', name: 'Typewriter', category: 'mono', stack: 'ui-monospace, monospace' },
  google('Bebas Neue', 'display'),
  google('Oswald', 'display'),
  google('Anton', 'display'),
  google('Archivo Black', 'display'),
  google('Bungee', 'display'),
  google('Righteous', 'display'),
  google('Titan One', 'display'),
  google('Luckiest Guy', 'display'),
  google('Bangers', 'display'),
  google('Black Ops One', 'display'),
  google('Staatliches', 'display'),
  google('Passion One', 'display'),
  google('Fredoka', 'display'),
  google('Alfa Slab One', 'slab'),
  google('Ultra', 'slab'),
  google('Josefin Slab', 'slab'),
  google('Montserrat', 'sans'),
  google('Kanit', 'sans'),
  google('Barlow Condensed', 'sans'),
  google('Archivo Narrow', 'sans'),
  google('Inter', 'sans'),
  google('Playfair Display', 'serif'),
  google('Merriweather', 'serif'),
  google('Cormorant Garamond', 'serif'),
  google('Pacifico', 'script'),
  google('Lobster', 'script'),
  google('Satisfy', 'script'),
  google('Dancing Script', 'script'),
  google('Great Vibes', 'script'),
  google('Permanent Marker', 'hand'),
  google('Caveat', 'hand'),
  google('Chewy', 'hand'),
  google('Shadows Into Light', 'hand'),
  google('Special Elite', 'mono'),
  google('Courier Prime', 'mono')
];

export const DEFAULT_FONT = FONTS[0].stack;

/** Filter the picker by free text and category. Both are optional. */
export function filterFonts(query: string, category: string, fonts = FONTS): FontChoice[] {
  const q = query.trim().toLowerCase();
  return fonts.filter(
    (f) => (!category || f.category === category) && (!q || f.name.toLowerCase().includes(q))
  );
}

/** What to call a stack in the interface — its name if we offer it, else "Custom". */
export function fontNameFor(stack: string): string {
  return FONTS.find((f) => f.stack === stack)?.name ?? 'Custom';
}

export function fontFor(stack: string): FontChoice | undefined {
  return FONTS.find((f) => f.stack === stack);
}

/** The stylesheet a remote face is fetched from. */
export function googleFontHref(name: string): string {
  const family = name.trim().replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
}

const loaded = new Set<string>();

/**
 * Fetch a face, once, and only when something is about to be set in it.
 *
 * Idempotent by design: the picker calls this as tiles scroll past and as a
 * selection is made, and neither should produce a second `<link>`.
 */
export function loadFont(font: FontChoice | undefined): void {
  if (!font?.remote || typeof document === 'undefined') return;
  if (loaded.has(font.id)) return;
  loaded.add(font.id);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontHref(font.name);
  link.dataset.designFont = font.id;
  document.head.appendChild(link);
}

// --- Ink ------------------------------------------------------------------

export interface InkColor {
  id: string;
  name: string;
  hex: string;
}

/**
 * The inks worth offering as a first choice.
 *
 * A press is not a screen: a shop stocks a set of colours and nearly every job
 * is one of them. Handing a customer an operating-system colour dialog to pick
 * from sixteen million asks them to solve a problem they do not have, and on a
 * phone it is a full-screen system sheet over the design they were looking at.
 * So the palette leads and the picker stays available behind it.
 */
export const INK_COLORS: InkColor[] = [
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'black', name: 'Black', hex: '#111111' },
  { id: 'silver', name: 'Silver grey', hex: '#c8c9c7' },
  { id: 'red', name: 'Red', hex: '#c8102e' },
  { id: 'orange', name: 'Orange', hex: '#f26522' },
  { id: 'gold', name: 'Gold', hex: '#f2a900' },
  { id: 'green', name: 'Kelly green', hex: '#007a33' },
  { id: 'royal', name: 'Royal blue', hex: '#0033a0' },
  { id: 'purple', name: 'Purple', hex: '#5f259f' },
  { id: 'pink', name: 'Hot pink', hex: '#e0218a' }
];

export const DEFAULT_INK = INK_COLORS[1].hex;

/**
 * A hex colour in the one form everything here compares against: `#rrggbb`,
 * lower case. Returns empty for anything unparseable, so callers can tell a
 * colour they failed to read from black.
 */
export function normaliseHex(hex: string): string {
  const raw = (hex ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .toLowerCase()
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : '';
}

/** What to call the ink in the interface — its name if we stock it, else the hex. */
export function inkNameFor(hex: string): string {
  const norm = normaliseHex(hex);
  if (!norm) return 'Custom';
  return INK_COLORS.find((i) => i.hex === norm)?.name ?? norm.toUpperCase();
}

/** Rough perceived lightness, enough to tell black-ish from white-ish. */
export function isLight(hex: string): boolean {
  const norm = normaliseHex(hex);
  if (!norm) return false;
  const n = parseInt(norm.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

/** Relative luminance, per WCAG, for the contrast ratio below. */
function luminance(hex: string): number {
  const norm = normaliseHex(hex);
  if (!norm) return 0;
  const n = parseInt(norm.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * Whether ink will read against the surface it is printed on.
 *
 * Only advisory — plenty of designs are deliberately low contrast — but it
 * catches the common mistake of black artwork on a black shirt, which looks
 * fine in a design tool on a white canvas and disappears on the garment.
 *
 * The surface colour is sampled from the product photograph behind the print
 * area rather than declared, because a storefront's catalogue is whatever the
 * owner uploaded, not a garment table we control.
 */
export function contrastAdvice(surfaceHex: string, inkHex: string): string | null {
  const surface = normaliseHex(surfaceHex);
  const ink = normaliseHex(inkHex);
  if (!surface || !ink) return null;
  const ratio = contrastRatio(surface, ink);
  if (ratio >= 3) return null;
  if (isLight(ink) && isLight(surface)) {
    return 'Light artwork on a light product will be hard to see.';
  }
  if (!isLight(ink) && !isLight(surface)) {
    return 'Dark artwork on a dark product will be hard to see.';
  }
  return 'This ink is close to the product colour and may not stand out.';
}
