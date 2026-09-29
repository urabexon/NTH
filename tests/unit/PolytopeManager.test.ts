import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Matrix4 } from 'three';
import { describe, expect, test } from 'vitest';

import { Projector4D } from '@/core/Projector4D';
import { parseGraphs } from '@/geometry/loadGraphs';
import { PolytopeManager } from '@/geometry/PolytopeManager';

const graphs = parseGraphs(
  JSON.parse(readFileSync(join(process.cwd(), 'public/data/graphs.json'), 'utf8')),
);

function createManager(seed = 1): PolytopeManager {
  return new PolytopeManager(graphs, {
    projector: new Projector4D(new Matrix4()),
    seed,
    subdivisionFor: () => 1,
  });
}

describe('PolytopeManager', () => {
  test('builds one mesh per polytope and reports progress', async () => {
    const manager = createManager();
    const progress: number[] = [];
    await manager.build((built, total) => progress.push(built / total));
    expect(manager.children).toHaveLength(24);
    expect(progress).toHaveLength(24);
    expect(progress.at(0)).toBeCloseTo(1 / 24);
    expect(progress.at(-1)).toBe(1);
  });

  test('shows exactly one mesh at a time', async () => {
    const manager = createManager();
    await manager.build();
    manager.show('hypercube');
    expect(manager.current).toBe('hypercube');
    expect(manager.children.filter((child) => child.visible)).toHaveLength(1);
    manager.show('120-cell');
    expect(manager.currentMesh?.name).toBe('120-cell');
    expect(manager.currentMesh?.edges.visible).toBe(true);
    expect(manager.currentMesh?.faces.visible).toBe(false);
    expect(manager.children.filter((child) => child.visible)).toHaveLength(1);
  });

  test('showRandom never picks the current polytope', async () => {
    const manager = createManager(7);
    await manager.build();
    manager.show('hypercube');
    for (let i = 0; i < 50; i++) {
      const previous = manager.current;
      const next = manager.showRandom();
      expect(next).not.toBe(previous);
      expect(manager.current).toBe(next);
    }
  });

  test('rejects an unknown slug', async () => {
    const manager = createManager();
    await manager.build();
    expect(() => {
      manager.show('nope');
    }).toThrow(/Unknown polytope/);
  });

  test('facesVisible toggles the face meshes of every polytope', async () => {
    const manager = createManager();
    await manager.build();
    manager.facesVisible = true;
    expect(manager.currentMesh).toBeNull();
    manager.show('hypercube');
    expect(manager.currentMesh?.faces.visible).toBe(true);
    manager.facesVisible = false;
    expect(manager.currentMesh?.faces.visible).toBe(false);
  });

  test('setAllVisible(false) restores only the current mesh', async () => {
    const manager = createManager();
    await manager.build();
    manager.show('pentatope');
    manager.setAllVisible(true);
    expect(manager.children.filter((child) => child.visible)).toHaveLength(24);
    manager.setAllVisible(false);
    const visible = manager.children.filter((child) => child.visible);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.name).toBe('Pentatope');
  });
});
