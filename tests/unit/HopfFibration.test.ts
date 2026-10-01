import { Matrix4 } from 'three';
import { describe, expect, test } from 'vitest';

import { Projector4D } from '@/core/Projector4D';
import { HopfFibration } from '@/geometry/HopfFibration';

describe('HopfFibration', () => {
  test('builds maxFibers × samples segments and starts hidden', () => {
    const hopf = new HopfFibration({
      projector: new Projector4D(new Matrix4()),
      maxFibers: 8,
      samples: 16,
    });
    expect(hopf.edges.geometry.getAttribute('side').count).toBe(8 * 16 * 4);
    expect(hopf.fiberCount).toBe(0);
    expect(hopf.edges.visible).toBe(false);
  });

  test('fiberCount limits the draw range to whole fibers and clamps', () => {
    const hopf = new HopfFibration({
      projector: new Projector4D(new Matrix4()),
      maxFibers: 8,
      samples: 16,
    });
    hopf.fiberCount = 3.4;
    expect(hopf.fiberCount).toBe(3);
    expect(hopf.edges.geometry.drawRange.count).toBe(3 * 16 * 6);
    expect(hopf.edges.visible).toBe(true);
    hopf.fiberCount = 99;
    expect(hopf.fiberCount).toBe(8);
    expect(hopf.edges.geometry.drawRange.count).toBe(8 * 16 * 6);
  });
});
