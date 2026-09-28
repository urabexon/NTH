import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { Graph } from '@/geometry/Graph';
import { collectEdges, fanTriangulate } from '@/geometry/Graph';
import { parseGraphs } from '@/geometry/loadGraphs';

const graphs = parseGraphs(
  JSON.parse(readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8')),
);

function get(slug: string): Graph {
  const graph = graphs.get(slug);
  if (!graph) throw new Error(`missing ${slug}`);
  return graph;
}

describe('fanTriangulate', () => {
  test('returns a triangle unchanged', () => {
    expect(fanTriangulate([4, 5, 6])).toEqual([[4, 5, 6]]);
  });

  test('cuts a square into two triangles sharing the first vertex', () => {
    expect(fanTriangulate([0, 1, 2, 3])).toEqual([
      [0, 1, 2],
      [0, 2, 3],
    ]);
  });

  test('cuts a pentagon into three triangles', () => {
    expect(fanTriangulate([0, 1, 2, 3, 4])).toEqual([
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 4],
    ]);
  });

  test('rejects faces with fewer than three vertices', () => {
    expect(() => fanTriangulate([0, 1])).toThrow();
  });
});

describe('collectEdges', () => {
  test('lists each side once with the smaller index first', () => {
    expect(collectEdges([[2, 1, 0]])).toEqual([
      [1, 2],
      [0, 1],
      [0, 2],
    ]);
  });

  test('does not repeat an edge shared by two faces', () => {
    const edges = collectEdges([
      [0, 1, 2],
      [2, 1, 3],
    ]);
    expect(edges).toHaveLength(5);
  });
});

describe('Graph from data', () => {
  test('hypercube: 16 vertices, 24 square faces, 48 triangles, 32 edges', () => {
    const graph = get('hypercube');
    expect(graph.vertices).toHaveLength(16);
    expect(graph.polygons).toHaveLength(24);
    expect(graph.triangles).toHaveLength(48);
    expect(graph.edges).toHaveLength(32);
  });

  test('24-cell: 24 vertices, 96 triangular faces, 96 triangles, 96 edges', () => {
    const graph = get('24-cell');
    expect(graph.vertices).toHaveLength(24);
    expect(graph.polygons).toHaveLength(96);
    expect(graph.triangles).toHaveLength(96);
    expect(graph.edges).toHaveLength(96);
  });

  test('120-cell: 600 vertices, 720 pentagons, 2160 triangles, 1200 edges', () => {
    const graph = get('120-cell');
    expect(graph.vertices).toHaveLength(600);
    expect(graph.polygons).toHaveLength(720);
    expect(graph.triangles).toHaveLength(720 * 3);
    expect(graph.edges).toHaveLength(1200);
  });

  test('loads all 24 polytopes with their display names', () => {
    expect(graphs.size).toBe(24);
    expect(get('hypercube').name).toBe('Hypercube');
    expect(get('3-3-4-maze').name).toBe('{3,3,4} Maze');
  });
});

describe('parseGraphs validation', () => {
  test('rejects a vertex that is not a 4-vector', () => {
    expect(() => parseGraphs({ bad: { name: 'Bad', vertices: [[0, 0, 1]], faces: [] } })).toThrow(
      /vertices/,
    );
  });

  test('rejects a face index outside the vertex range', () => {
    const vertices = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ];
    expect(() => parseGraphs({ bad: { name: 'Bad', vertices, faces: [[0, 1, 3]] } })).toThrow(
      /faces/,
    );
  });

  test('rejects a non-object root', () => {
    expect(() => parseGraphs([])).toThrow();
  });
});
