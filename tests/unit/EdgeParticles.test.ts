import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Matrix4 } from 'three';
import { describe, expect, test } from 'vitest';

import { PARTICLE_COUNT } from '@/core/config';
import { Projector4D } from '@/core/Projector4D';
import { parseGraphs } from '@/geometry/loadGraphs';
import { EdgeParticles } from '@/particles/EdgeParticles';

const graphs = parseGraphs(
  JSON.parse(readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8')),
);

function get(slug: string) {
  const graph = graphs.get(slug);
  if (!graph) throw new Error(`missing ${slug}`);
  return graph;
}

describe('EdgeParticles', () => {
  test('uses the configured particle count as the instance count', () => {
    const particles = new EdgeParticles({
      projector: new Projector4D(new Matrix4()),
      maxEdges: 64,
    });
    expect(particles.count).toBe(PARTICLE_COUNT);
    expect(particles.particleCount).toBe(PARTICLE_COUNT);
  });

  test('setGraph copies edge endpoints into the storage buffers', () => {
    const particles = new EdgeParticles({
      projector: new Projector4D(new Matrix4()),
      maxEdges: 64,
    });
    const hypercube = get('hypercube');
    particles.setGraph(hypercube);
    expect(particles.activeEdgeCount).toBe(32);
    const [ia, ib] = hypercube.edges[0] ?? [0, 0];
    const { a, b } = particles.readEdge(0);
    expect(a).toEqual(hypercube.vertices[ia]);
    expect(b).toEqual(hypercube.vertices[ib]);
  });

  test('clamps to maxEdges when a graph has more edges than the buffer', () => {
    const particles = new EdgeParticles({
      projector: new Projector4D(new Matrix4()),
      maxEdges: 10,
    });
    particles.setGraph(get('120-cell'));
    expect(particles.activeEdgeCount).toBe(10);
  });
});
