import { describe, expect, test, vi } from 'vitest';

import { AppState, type AppStateTargets } from '@/state/AppState';
import { decodeSnapshot, encodeSnapshot, shareUrl, snapshotFromSearch } from '@/state/encode';
import { PRESET_STORAGE_KEY, PresetStore } from '@/state/PresetStore';
import { snapshotSchema, type Snapshot } from '@/state/schema';

const sample: Snapshot = {
  v: 1,
  polytope: '24-cell',
  params: { distance: 0.4, rotationSpeed: 0.7, edgeWidth: 3 },
  effect: 'mirror-left',
  slitScan: true,
  magnify: false,
  invert: true,
  faces: false,
  particles: true,
};

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  };
}

describe('snapshot encoding', () => {
  test('round-trips through a URL-safe string', () => {
    const encoded = encodeSnapshot(sample);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSnapshot(encoded)).toEqual(sample);
  });

  test('shareUrl replaces the query with only the state parameter', () => {
    const url = new URL(shareUrl('http://localhost:5173/?seed=1&d=2', sample));
    expect([...url.searchParams.keys()]).toEqual(['s']);
    expect(snapshotFromSearch(url.search)).toEqual(sample);
  });

  test('snapshotFromSearch returns null for missing or corrupt state', () => {
    expect(snapshotFromSearch('?seed=1')).toBeNull();
    expect(snapshotFromSearch('?s=not-base64!!')).toBeNull();
    expect(
      snapshotFromSearch(`?s=${encodeSnapshot({ ...sample, effect: 'none' })}`),
    ).not.toBeNull();
  });

  test('schema rejects unknown effects and wrong versions', () => {
    expect(() => snapshotSchema.parse({ ...sample, effect: 'swirl' })).toThrow();
    expect(() => snapshotSchema.parse({ ...sample, v: 2 })).toThrow();
  });
});

describe('PresetStore', () => {
  test('saves, lists and clears slots and persists as JSON', () => {
    const storage = fakeStorage();
    const store = new PresetStore(storage);
    store.save(3, sample, 'Drop');
    expect(store.get(3)?.name).toBe('Drop');
    expect(store.list().filter(Boolean)).toHaveLength(1);
    const reloaded = new PresetStore(fakeStorage(storage.dump()));
    expect(reloaded.get(3)?.snapshot).toEqual(sample);
    reloaded.clear(3);
    expect(reloaded.get(3)).toBeNull();
  });

  test('rejects slots outside 1..9 and survives corrupt storage', () => {
    const store = new PresetStore(fakeStorage({ [PRESET_STORAGE_KEY]: '{"v":9}' }));
    expect(store.list().every((p) => p === null)).toBe(true);
    expect(() => {
      store.save(0, sample);
    }).toThrow();
    expect(() => {
      store.save(10, sample);
    }).toThrow();
  });

  test('works without storage', () => {
    const store = new PresetStore(null);
    store.save(1, sample);
    expect(store.get(1)?.snapshot).toEqual(sample);
  });
});

describe('AppState', () => {
  function stubTargets() {
    const active = new Set<string>();
    const values = Object.fromEntries(
      [
        'distance',
        'rotationSpeed',
        'scale',
        'lensRadius',
        'bloomStrength',
        'edgeWidth',
        'trails',
        'fibers',
        'motionBlur',
        'dof',
        'dust',
        'audioSensitivity',
        'audioSmoothing',
        'renderScale',
      ].map((k) => [k, { target: 0.5 }]),
    );
    const targets = {
      parameters: { values, set: vi.fn(), jumpTo: vi.fn() },
      polytopes: {
        current: 'hypercube',
        slugs: ['hypercube', '24-cell'],
        show: vi.fn(),
        facesVisible: true,
      },
      pipeline: {
        deform: { effect: 'none', slitScanEnabled: false },
        composite: { isInverted: false },
      },
      orbit: { isMagnified: false },
      keybinds: {
        isActive: (code: string) => active.has(code),
        press: vi.fn((code: string) => {
          if (active.has(code)) active.delete(code);
          else active.add(code);
        }),
      },
      particles: { visible: true },
    };
    return { targets, active };
  }

  test('capture() reads the live state', () => {
    const { targets } = stubTargets();
    const state = new AppState(targets as unknown as AppStateTargets);
    const snapshot = state.capture();
    expect(snapshot.polytope).toBe('hypercube');
    expect(snapshot.params.distance).toBe(0.5);
    expect(snapshot.effect).toBe('none');
    expect(snapshot.faces).toBe(true);
    expect(snapshot.particles).toBe(true);
  });

  test('apply() sets parameters, polytope, effect and toggles through key bindings', () => {
    const { targets } = stubTargets();
    const state = new AppState(targets as unknown as AppStateTargets);
    state.apply(sample);
    expect(targets.parameters.set).toHaveBeenCalledWith('distance', 0.4);
    expect(targets.parameters.set).toHaveBeenCalledWith('edgeWidth', 3);
    expect(targets.polytopes.show).toHaveBeenCalledWith('24-cell');
    expect(targets.pipeline.deform.effect).toBe('mirror-left');
    expect(targets.keybinds.press).toHaveBeenCalledWith('KeyR');
    expect(targets.keybinds.press).toHaveBeenCalledWith('KeyZ');
    expect(targets.keybinds.press).not.toHaveBeenCalledWith('KeyT');
    expect(targets.polytopes.facesVisible).toBe(false);
    expect(targets.particles.visible).toBe(true);
  });

  test('apply() with immediate uses jumpTo and does not toggle already-matching keys', () => {
    const { targets, active } = stubTargets();
    active.add('KeyR');
    const state = new AppState(targets as unknown as AppStateTargets);
    state.apply(sample, { immediate: true });
    expect(targets.parameters.jumpTo).toHaveBeenCalledWith('distance', 0.4);
    expect(targets.keybinds.press).not.toHaveBeenCalledWith('KeyR');
  });
});
