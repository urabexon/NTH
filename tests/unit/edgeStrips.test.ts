import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { buildEdgeStrips } from '@/geometry/edgeStrips';
import type { Edge } from '@/geometry/Graph';
import { parseGraphs } from '@/geometry/loadGraphs';
import type { Vec4 } from '@/geometry/schema';
import { generateVertexColors, type Rgb } from '@/geometry/vertexColors';

const vertices: Vec4[] = [
  [0, 0, 0, 1],
  [1, 0, 0, 0],
];
const colors: Rgb[] = [
  [1, 0, 0],
  [0, 0, 1],
];
const oneEdge: Edge[] = [[0, 1]];

describe('buildEdgeStrips', () => {
  test('emits two vertices per sample point and two triangles per segment', () => {
    const mesh = buildEdgeStrips(vertices, colors, oneEdge, 3);
    expect(mesh.pointCount).toBe(4);
    expect(mesh.vertexCount).toBe(8);
    expect(mesh.triangleCount).toBe(6);
    expect(mesh.index).toHaveLength(18);
    expect(mesh.positionCurr).toHaveLength(24);
  });

  test('stores previous, current and next sample on every vertex, clamped at the ends', () => {
    const mesh = buildEdgeStrips(vertices, colors, oneEdge, 2);
    const at = (arr: Float32Array, v: number) => Array.from(arr.subarray(v * 3, v * 3 + 3));
    expect(at(mesh.positionPrev, 0)).toEqual([0, 0, 0]);
    expect(at(mesh.positionCurr, 0)).toEqual([0, 0, 0]);
    expect(at(mesh.positionNext, 0)).toEqual([0.5, 0, 0]);
    expect(at(mesh.positionPrev, 2)).toEqual([0, 0, 0]);
    expect(at(mesh.positionCurr, 2)).toEqual([0.5, 0, 0]);
    expect(at(mesh.positionNext, 2)).toEqual([1, 0, 0]);
    expect(at(mesh.positionNext, 4)).toEqual([1, 0, 0]);
    expect(mesh.positionCurrW[0]).toBe(1);
    expect(mesh.positionCurrW[2]).toBe(0.5);
    expect(mesh.positionCurrW[4]).toBe(0);
  });

  test('alternates side -1 / +1 and shares vertices between segments', () => {
    const mesh = buildEdgeStrips(vertices, colors, oneEdge, 2);
    expect(Array.from(mesh.side)).toEqual([-1, 1, -1, 1, -1, 1]);
    expect(Array.from(mesh.index)).toEqual([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]);
  });

  test('interpolates color along the edge', () => {
    const mesh = buildEdgeStrips(vertices, colors, oneEdge, 2);
    expect(mesh.color[0]).toBe(1);
    expect(mesh.color[2 * 3]).toBeCloseTo(0.5);
    expect(mesh.color[5 * 3 + 2]).toBe(1);
  });

  test('every index points at an existing vertex', () => {
    const mesh = buildEdgeStrips(vertices, colors, oneEdge, 5);
    for (const i of mesh.index) expect(i).toBeLessThan(mesh.vertexCount);
  });

  test('rejects a bad level', () => {
    expect(() => buildEdgeStrips(vertices, colors, oneEdge, 0)).toThrow();
  });

  test('120-cell at level 8: 1200 edges become 21600 vertices', () => {
    const graphs = parseGraphs(
      JSON.parse(readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8')),
    );
    const graph = graphs.get('120-cell');
    if (!graph) throw new Error('missing 120-cell');
    const mesh = buildEdgeStrips(
      graph.vertices,
      generateVertexColors(graph.vertices.length, 1),
      graph.edges,
      8,
    );
    expect(mesh.vertexCount).toBe(1200 * 9 * 2);
    expect(mesh.triangleCount).toBe(1200 * 8 * 2);
  });
});
