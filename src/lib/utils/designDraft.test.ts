import { describe, it, expect } from 'vitest';
import {
  FORMAT,
  MAX_AGE_MS,
  MAX_BYTES,
  clearDraft,
  draftHasWork,
  draftKey,
  loadDraft,
  newDesignId,
  pack,
  saveDraft,
  type DesignDraft,
  type StorageLike
} from './designDraft';
import type { DesignElement } from './designElements';

/** A storage that behaves like a browser's, including a quota that bites. */
function memoryStorage(quotaBytes = Infinity): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      const used = [...map.entries()].reduce((n, [key, val]) => n + key.length + val.length, 0);
      if (used + k.length + v.length > quotaBytes) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => void map.delete(k)
  };
}

const TEXT: DesignElement = {
  kind: 'text',
  id: 'el-1',
  text: 'ONWARD',
  color: '#ffffff',
  font: 'system-ui, sans-serif',
  place: { xIn: 1, yIn: 1, widthIn: 6, heightIn: 2, rotation: 0 }
};

function draft(over: Partial<DesignDraft> = {}): DesignDraft {
  return {
    ...pack('prod-1', { 'zone-1': [TEXT] }, 'design-1', 0, 1_700_000_000_000),
    ...over
  };
}

describe('newDesignId', () => {
  it('gives a different id each time', () => {
    expect(newDesignId()).not.toBe(newDesignId());
  });
});

describe('draftKey', () => {
  it('scopes a draft to one product', () => {
    expect(draftKey('a')).not.toBe(draftKey('b'));
    expect(draftKey('a')).toContain('a');
  });
});

describe('saveDraft', () => {
  it('writes a draft and reports its size', () => {
    const storage = memoryStorage();
    const result = saveDraft(storage, draft());
    expect(result.ok).toBe(true);
    expect(storage.map.get(draftKey('prod-1'))).toContain('ONWARD');
  });

  it('refuses a draft larger than the budget rather than trying', () => {
    const storage = memoryStorage();
    const huge = draft({ zones: { 'zone-1': Array(20000).fill(TEXT) } });
    expect(saveDraft(storage, huge)).toEqual({ ok: false, reason: 'too-large' });
    expect(storage.map.size).toBe(0);
    expect(JSON.stringify(huge).length).toBeGreaterThan(MAX_BYTES);
  });

  it('reports a quota failure instead of throwing', () => {
    expect(saveDraft(memoryStorage(10), draft())).toEqual({ ok: false, reason: 'quota' });
  });

  it('says so when there is no storage at all', () => {
    expect(saveDraft(null, draft())).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('loadDraft', () => {
  it('reads back what was written', () => {
    const storage = memoryStorage();
    saveDraft(storage, draft());
    const back = loadDraft(storage, 'prod-1', 1_700_000_000_000);
    expect(back?.designId).toBe('design-1');
    expect(back?.zones['zone-1'][0]).toEqual(TEXT);
  });

  it('drops a save from an older format', () => {
    const storage = memoryStorage();
    storage.setItem(draftKey('prod-1'), JSON.stringify({ ...draft(), format: FORMAT - 1 }));
    expect(loadDraft(storage, 'prod-1', 1_700_000_000_000)).toBeNull();
  });

  it('drops a save that belongs to another product', () => {
    const storage = memoryStorage();
    storage.setItem(draftKey('prod-1'), JSON.stringify(draft({ productId: 'prod-2' })));
    expect(loadDraft(storage, 'prod-1', 1_700_000_000_000)).toBeNull();
  });

  it('drops a save too old to trust', () => {
    const storage = memoryStorage();
    saveDraft(storage, draft());
    const later = 1_700_000_000_000 + MAX_AGE_MS + 1;
    expect(loadDraft(storage, 'prod-1', later)).toBeNull();
  });

  it('survives corrupt JSON and an empty slot', () => {
    const storage = memoryStorage();
    storage.setItem(draftKey('prod-1'), '{not json');
    expect(loadDraft(storage, 'prod-1')).toBeNull();
    expect(loadDraft(memoryStorage(), 'prod-1')).toBeNull();
    expect(loadDraft(null, 'prod-1')).toBeNull();
  });

  it('defaults a missing revision to zero', () => {
    const storage = memoryStorage();
    const { revision: _revision, ...withoutRevision } = draft();
    storage.setItem(draftKey('prod-1'), JSON.stringify(withoutRevision));
    expect(loadDraft(storage, 'prod-1', 1_700_000_000_000)?.revision).toBe(0);
  });
});

describe('clearDraft', () => {
  it('removes the draft and tolerates a storage that refuses', () => {
    const storage = memoryStorage();
    saveDraft(storage, draft());
    clearDraft(storage, 'prod-1');
    expect(storage.map.size).toBe(0);
    expect(() => clearDraft(null, 'prod-1')).not.toThrow();
  });
});

describe('draftHasWork', () => {
  it('is true only when some zone has elements', () => {
    expect(draftHasWork(draft())).toBe(true);
    expect(draftHasWork(draft({ zones: { 'zone-1': [] } }))).toBe(false);
    expect(draftHasWork(null)).toBe(false);
  });
});
