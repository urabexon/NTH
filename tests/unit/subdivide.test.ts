import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Color } from 'three';
import { describe, expect, test } from 'vitest';

import { NEON_PALETTE } from '@/core/config';
import type { Triangle } from '@/geometry/Graph';
import { parseGraphs } from '@/geometry/loadGraphs';
import type { Vec4 } from '@/geometry/schema';
import { subdivide, trianglesPerTriangle, verticesPerTriangle } from '@/geometry/subdivide';
import { generateVertexColors, type Rgb } from '@/geometry/vertexColors';

const unitTriangle: Vec4[] = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
];
const unitColors: Rgb[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const oneTriangle: Triangle[] = [[0, 1, 2]];

describe('per-triangle counts', () => {
  test.each([
    [1, 3, 1],
    [2, 6, 4],
    [5, 21, 25],
    [40, 861, 1600],
  ])('level %i gives %i vertices and %i triangles', (level, vertices, triangles) => {
    expect(verticesPerTriangle(level)).toBe(vertices);
    expect(trianglesPerTriangle(level)).toBe(triangles);
  });
});

describe('subdivide', () => {
  test('level 1 keeps the triangle as is', () => {
    const mesh = subdivide(unitTriangle, unitColors, oneTriangle, 1);
    expect(mesh.vertexCount).toBe(3);
    expect(mesh.triangleCount).toBe(1);
    expect(Array.from(mesh.position)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(Array.from(mesh.index)).toEqual([0, 1, 2]);
  });

  test.each([1, 2, 5])('level %i sizes every buffer consistently', (level) => {
    const mesh = subdivide(unitTriangle, unitColors, oneTriangle, level);
    expect(mesh.vertexCount).toBe(verticesPerTriangle(level));
    expect(mesh.triangleCount).toBe(trianglesPerTriangle(level));
    expect(mesh.position).toHaveLength(mesh.vertexCount * 3);
    expect(mesh.positionW).toHaveLength(mesh.vertexCount);
    expect(mesh.color).toHaveLength(mesh.vertexCount * 3);
    expect(mesh.index).toHaveLength(mesh.triangleCount * 3);
  });

  test('every index points at an existing vertex', () => {
    const mesh = subdivide(unitTriangle, unitColors, oneTriangle, 5);
    for (const i of mesh.index) {
      expect(i).toBeLessThan(mesh.vertexCount);
    }
  });

  test('new vertices stay on the flat triangle (barycentric weights sum to 1)', () => {
    const mesh = subdivide(unitTriangle, unitColors, oneTriangle, 4);
    for (let v = 0; v < mesh.vertexCount; v++) {
      const sum = mesh.position.subarray(v * 3, v * 3 + 3).reduce((acc, n) => acc + n, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  test('interpolates w and color the same way as xyz', () => {
    const vertices: Vec4[] = [
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 2],
    ];
    const mesh = subdivide(vertices, unitColors, oneTriangle, 2);
    expect(Array.from(mesh.positionW)).toEqual([0, 0.5, 1, 1, 1.5, 2]);
    expect(mesh.color[0]).toBe(1);
    expect(mesh.color[5 * 3 + 2]).toBe(1);
    expect(mesh.color[1 * 3]).toBeCloseTo(0.5);
    expect(mesh.color[2 * 3 + 2]).toBeCloseTo(0.5);
  });

  test('rejects a non-positive or fractional level', () => {
    expect(() => subdivide(unitTriangle, unitColors, oneTriangle, 0)).toThrow();
    expect(() => subdivide(unitTriangle, unitColors, oneTriangle, 2.5)).toThrow();
  });

  test('hypercube at level 5: 48 triangles become 1008 vertices and 1200 triangles', () => {
    const graphs = parseGraphs(
      JSON.parse(readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8')),
    );
    const hypercube = graphs.get('hypercube');
    if (!hypercube) throw new Error('missing hypercube');
    const colors = generateVertexColors(hypercube.vertices.length, 1);
    const mesh = subdivide(hypercube.vertices, colors, hypercube.triangles, 5);
    expect(mesh.vertexCount).toBe(48 * 21);
    expect(mesh.triangleCount).toBe(48 * 25);
  });
});

describe('generateVertexColors', () => {
  test('is deterministic for a seed and only uses palette colors', () => {
    const a = generateVertexColors(10, 42);
    const b = generateVertexColors(10, 42);
    expect(a).toEqual(b);
    const palette = new Set(NEON_PALETTE.map((hex) => new Color(hex).getHexString()));
    for (const [r, g, bl] of a) {
      expect(palette.has(new Color(r, g, bl).getHexString())).toBe(true);
    }
  });

  test('differs between seeds', () => {
    expect(generateVertexColors(4, 1)).not.toEqual(generateVertexColors(4, 2));
  });
});
