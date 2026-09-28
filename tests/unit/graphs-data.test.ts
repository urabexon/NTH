import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

interface PolytopeGraph {
  name: string;
  vertices: number[][];
  faces: number[][];
}

const graphs = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8'),
) as Record<string, PolytopeGraph>;

const EXPECTED_COUNT = 24;
const UNIT_LENGTH_TOLERANCE = 1e-4;

describe('public/data/graphs.json', () => {
  test(`contains ${String(EXPECTED_COUNT)} polytopes with display names`, () => {
    expect(Object.keys(graphs)).toHaveLength(EXPECTED_COUNT);
    for (const graph of Object.values(graphs)) {
      expect(graph.name.length).toBeGreaterThan(0);
    }
  });

  test('stores every vertex as a 4-vector on the unit 3-sphere', () => {
    for (const [slug, graph] of Object.entries(graphs)) {
      for (const vertex of graph.vertices) {
        expect(vertex, slug).toHaveLength(4);
        const length = Math.hypot(...vertex);
        expect(Math.abs(length - 1), `${slug} vertex length`).toBeLessThan(UNIT_LENGTH_TOLERANCE);
      }
    }
  });

  test('references only existing vertices from every face', () => {
    for (const [slug, graph] of Object.entries(graphs)) {
      for (const face of graph.faces) {
        expect(face.length, slug).toBeGreaterThanOrEqual(3);
        for (const index of face) {
          expect(index, slug).toBeGreaterThanOrEqual(0);
          expect(index, slug).toBeLessThan(graph.vertices.length);
        }
      }
    }
  });

  test('has the known counts for the hypercube and the 120-cell', () => {
    expect(graphs.hypercube?.vertices).toHaveLength(16);
    expect(graphs.hypercube?.faces).toHaveLength(24);
    expect(graphs['120-cell']?.vertices).toHaveLength(600);
    expect(graphs['120-cell']?.faces).toHaveLength(720);
  });
});
