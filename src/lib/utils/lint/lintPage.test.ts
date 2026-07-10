import { describe, it, expect } from 'vitest';
import { lintComponents } from './lintPage';
import type { PageComponent } from '$lib/types/pages';

function comp(id: string, type: string, config: Record<string, unknown> = {}): PageComponent {
  return { id, type, config, position: 0 } as unknown as PageComponent;
}

describe('lintComponents', () => {
  it('flags an image with no alt text', () => {
    const warnings = lintComponents([comp('img1', 'image', { src: 'x.png', alt: '' })]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].rule).toBe('missing-alt');
    expect(warnings[0].componentId).toBe('img1');
  });

  it('does not flag an image that has alt text', () => {
    const warnings = lintComponents([comp('img1', 'image', { src: 'x.png', alt: 'A cat' })]);
    expect(warnings).toHaveLength(0);
  });

  it('flags a low-contrast button label', () => {
    const warnings = lintComponents([
      comp('b1', 'button', { textColor: '#777777', backgroundColor: '#808080' })
    ]);
    expect(warnings.some((w) => w.rule === 'contrast' && w.componentId === 'b1')).toBe(true);
  });

  it('passes a high-contrast button', () => {
    const warnings = lintComponents([
      comp('b1', 'button', { textColor: '#000000', backgroundColor: '#ffffff' })
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('skips contrast when a color is a theme reference the resolver leaves unresolved', () => {
    const warnings = lintComponents([
      comp('b1', 'button', { textColor: 'theme:primary', backgroundColor: '#fff' })
    ]);
    // 'theme:primary' isn't parseable -> no false alarm
    expect(warnings).toHaveLength(0);
  });

  it('uses the injected resolver to resolve theme colors before checking', () => {
    const resolve = (c?: string | null) => (c === 'theme:muted' ? '#808080' : (c ?? undefined));
    const warnings = lintComponents(
      [comp('b1', 'button', { textColor: 'theme:muted', backgroundColor: '#777777' })],
      resolve
    );
    expect(warnings.some((w) => w.rule === 'contrast')).toBe(true);
  });

  it('flags a too-small interactive tap target', () => {
    const warnings = lintComponents([comp('c1', 'cta', { styles: { minHeight: 30 } })]);
    expect(warnings.some((w) => w.rule === 'touch-target')).toBe(true);
  });

  it('does not flag a 44px+ tap target', () => {
    const warnings = lintComponents([comp('c1', 'cta', { styles: { minHeight: 48 } })]);
    expect(warnings.filter((w) => w.rule === 'touch-target')).toHaveLength(0);
  });

  it('recurses into nested children', () => {
    const parent = comp('p1', 'container', {
      children: [comp('img1', 'image', { src: 'x.png', alt: '' })]
    });
    const warnings = lintComponents([parent]);
    expect(warnings.some((w) => w.componentId === 'img1' && w.rule === 'missing-alt')).toBe(true);
  });
});
