import { describe, expect, test } from 'vitest';

import { baseColor, hopfFiber, hopfMap, latitudeRings, type Vec3 } from '@/geometry/hopf';
import type { Vec4 } from '@/geometry/schema';

const EPS = 1e-9;

function length4([x, y, z, w]: Vec4): number {
  return Math.hypot(x, y, z, w);
}

function distance4(p: Vec4, q: Vec4): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2], p[3] - q[3]);
}

describe('hopfMap', () => {
  test('sends unit 4-vectors to unit 3-vectors', () => {
    for (const p of [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0.5, 0.5, 0.5, 0.5],
    ] as Vec4[]) {
      const [a, b, c] = hopfMap(p);
      expect(Math.hypot(a, b, c)).toBeCloseTo(1, 9);
    }
  });
});

describe('hopfFiber', () => {
  const bases: Vec3[] = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [0.3, -0.4, Math.sqrt(1 - 0.25)],
  ];

  test('every sample lies on the unit 3-sphere', () => {
    for (const base of bases) {
      for (const p of hopfFiber(base, 32)) expect(Math.abs(length4(p) - 1)).toBeLessThan(EPS);
    }
  });

  test('every sample maps back to its base point', () => {
    for (const base of bases) {
      for (const p of hopfFiber(base, 32)) {
        const mapped = hopfMap(p);
        expect(mapped[0]).toBeCloseTo(base[0], 9);
        expect(mapped[1]).toBeCloseTo(base[1], 9);
        expect(mapped[2]).toBeCloseTo(base[2], 9);
      }
    }
  });

  test('is a closed great circle: opposite samples are antipodal', () => {
    const fiber = hopfFiber([0.3, -0.4, Math.sqrt(1 - 0.25)], 64);
    const p = fiber[0];
    const q = fiber[32];
    if (!p || !q) throw new Error('missing samples');
    expect(distance4(p, q)).toBeCloseTo(2, 9);
  });

  test('fibers over different base points never touch', () => {
    const a = hopfFiber([1, 0, 0], 128);
    const b = hopfFiber([0, 1, 0], 128);
    let min = Number.POSITIVE_INFINITY;
    for (const p of a) for (const q of b) min = Math.min(min, distance4(p, q));
    expect(min).toBeGreaterThan(0.5);
  });
});

describe('latitudeRings', () => {
  test('returns unit vectors on evenly spaced latitudes', () => {
    const points = latitudeRings(64, 4);
    expect(points).toHaveLength(64);
    for (const [x, y, z] of points) expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    const latitudes = new Set(points.map(([, , z]) => z.toFixed(6)));
    expect(latitudes.size).toBe(4);
  });

  test('handles counts that do not divide evenly', () => {
    expect(latitudeRings(10, 4)).toHaveLength(10);
  });
});

describe('baseColor', () => {
  test('stays inside [0, 1] and varies with the base point', () => {
    const a = baseColor([1, 0, 0]);
    const b = baseColor([-1, 0, 0]);
    for (const c of [...a, ...b]) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    expect(a).not.toEqual(b);
  });
});
