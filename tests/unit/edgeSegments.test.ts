import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { buildEdgeSegments } from '@/geometry/edgeSegments';
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

describe('buildEdgeSegments', () => {
  test('emits four corners and two triangles per segment', () => {
    const mesh = buildEdgeSegments(vertices, colors, oneEdge, 3);
    expect(mesh.segmentCount).toBe(3);
    expect(mesh.vertexCount).toBe(12);
    expect(mesh.index).toHaveLength(18);
    expect(mesh.positionA).toHaveLength(36);
    expect(mesh.corner).toHaveLength(24);
  });

  test('splits the edge evenly and stores both segment ends on every corner', () => {
    const mesh = buildEdgeSegments(vertices, colors, oneEdge, 2);
    expect(Array.from(mesh.positionA.subarray(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(mesh.positionB.subarray(0, 3))).toEqual([0.5, 0, 0]);
    expect(mesh.positionAW[0]).toBe(1);
    expect(mesh.positionBW[0]).toBe(0.5);
    expect(Array.from(mesh.positionA.subarray(4 * 3, 4 * 3 + 3))).toEqual([0.5, 0, 0]);
    expect(Array.from(mesh.positionB.subarray(4 * 3, 4 * 3 + 3))).toEqual([1, 0, 0]);
  });

  test('corner attribute encodes end (0/1) and side (-1/1)', () => {
    const mesh = buildEdgeSegments(vertices, colors, oneEdge, 1);
    expect(Array.from(mesh.corner)).toEqual([0, -1, 0, 1, 1, -1, 1, 1]);
  });

  test('interpolates color along the edge', () => {
    const mesh = buildEdgeSegments(vertices, colors, oneEdge, 2);
    expect(mesh.color[0]).toBe(1);
    expect(mesh.color[2 * 3]).toBeCloseTo(0.5);
    expect(mesh.color[7 * 3 + 2]).toBe(1);
  });

  test('every index points at an existing vertex', () => {
    const mesh = buildEdgeSegments(vertices, colors, oneEdge, 5);
    for (const i of mesh.index) expect(i).toBeLessThan(mesh.vertexCount);
  });

  test('rejects a bad level', () => {
    expect(() => buildEdgeSegments(vertices, colors, oneEdge, 0)).toThrow();
  });

  test('120-cell at level 8: 1200 edges become 9600 segments', () => {
    const graphs = parseGraphs(
      JSON.parse(readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8')),
    );
    const graph = graphs.get('120-cell');
    if (!graph) throw new Error('missing 120-cell');
    const mesh = buildEdgeSegments(
      graph.vertices,
      generateVertexColors(graph.vertices.length, 1),
      graph.edges,
      8,
    );
    expect(mesh.segmentCount).toBe(9600);
    expect(mesh.vertexCount).toBe(38400);
  });
});
