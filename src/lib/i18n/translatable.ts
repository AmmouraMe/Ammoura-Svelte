/**
 * What parts of tenant content are translatable, and how translated values
 * address into widget config. Isomorphic: the admin translations UI extracts
 * fields with this module, and the server overlay writes values back through
 * the same paths.
 *
 * Field-path scheme for widgets: '<widgetId>:<configPath>' where configPath is
 * dot-separated and may include array indices, e.g. 'a1b2:items.0.title'.
 * Widget ids are stable across revisions (generated once at creation and
 * serialized verbatim into snapshots), but seeded composite child ids repeat
 * across pages — so widget translations are always page-scoped by the caller.
 */

interface WidgetLike {
  id?: string;
  type?: string;
  config?: Record<string, unknown> & { children?: WidgetLike[] };
}

/**
 * Config keys holding customer-visible text, applied uniformly to every
 * widget type (unknown keys simply don't exist on most components).
 */
export const TRANSLATABLE_CONFIG_KEYS: readonly string[] = [
  'text',
  'heading',
  'label',
  'title',
  'subtitle',
  'description',
  'alt',
  'caption',
  'badgeText',
  'primaryCtaText',
  'secondaryCtaText',
  'html'
];

/** Keys translated inside config array entries like items[] / links[]. */
const TRANSLATABLE_ARRAY_KEYS: Record<string, readonly string[]> = {
  items: ['title', 'description', 'text', 'label'],
  links: ['text', 'label']
};

export interface TranslatableField {
  /** Full field path: '<widgetId>:<configPath>' */
  field: string;
  /** Source-language text */
  source: string;
  /** Human label for the editor, e.g. 'heading — Welcome to my store' */
  label: string;
}

function extractFromConfig(
  widgetId: string,
  config: Record<string, unknown>,
  widgetType: string,
  out: TranslatableField[]
): void {
  for (const key of TRANSLATABLE_CONFIG_KEYS) {
    const value = config[key];
    if (typeof value === 'string' && value.trim() !== '') {
      out.push({
        field: `${widgetId}:${key}`,
        source: value,
        label: `${widgetType} · ${key}`
      });
    }
  }

  for (const [arrayKey, itemKeys] of Object.entries(TRANSLATABLE_ARRAY_KEYS)) {
    const array = config[arrayKey];
    if (!Array.isArray(array)) continue;
    array.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      for (const itemKey of itemKeys) {
        const value = (item as Record<string, unknown>)[itemKey];
        if (typeof value === 'string' && value.trim() !== '') {
          out.push({
            field: `${widgetId}:${arrayKey}.${index}.${itemKey}`,
            source: value,
            label: `${widgetType} · ${arrayKey}[${index}].${itemKey}`
          });
        }
      }
    });
  }
}

function walk(widgets: WidgetLike[], out: TranslatableField[]): void {
  for (const widget of widgets) {
    if (!widget || typeof widget !== 'object') continue;
    const config = widget.config;
    if (widget.id && config && typeof config === 'object') {
      extractFromConfig(widget.id, config, widget.type ?? 'component', out);
      if (Array.isArray(config.children)) {
        walk(config.children, out);
      }
    }
  }
}

/**
 * Walk a page's component tree (including nested config.children) and list
 * every translatable text field with its source value.
 */
export function extractTranslatableFields(components: unknown[]): TranslatableField[] {
  const out: TranslatableField[] = [];
  walk(components as WidgetLike[], out);
  return out;
}

/** Read a dot/index path out of a config object. */
export function getConfigValueByPath(config: Record<string, unknown>, path: string): unknown {
  let current: unknown = config;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Write a value at a dot/index path, but only when the slot already exists as
 * a string — a translation must never invent config structure that the source
 * widget no longer has (e.g. after an items[] entry was deleted).
 */
export function setConfigValueByPath(
  config: Record<string, unknown>,
  path: string,
  value: string
): boolean {
  const parts = path.split('.');
  let current: unknown = config;
  for (const part of parts.slice(0, -1)) {
    if (current === null || typeof current !== 'object') return false;
    current = (current as Record<string, unknown>)[part];
  }
  const last = parts[parts.length - 1];
  if (current === null || typeof current !== 'object') return false;
  const target = current as Record<string, unknown>;
  if (typeof target[last] !== 'string') return false;
  target[last] = value;
  return true;
}
