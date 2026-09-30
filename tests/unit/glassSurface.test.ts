import { describe, expect, test } from 'vitest';

import { GLASS_OPACITY } from '@/core/config';
import { glassOpacityFor } from '@/shaders/glassSurface';

describe('glassOpacityFor', () => {
  test('uses the full opacity for the hypercube and never exceeds it', () => {
    expect(glassOpacityFor(48)).toBeCloseTo(GLASS_OPACITY, 9);
    expect(glassOpacityFor(10)).toBeCloseTo(GLASS_OPACITY, 9);
  });

  test('fades denser polytopes so stacked faces do not saturate', () => {
    const cell24 = glassOpacityFor(96);
    const cell120 = glassOpacityFor(2160);
    expect(cell24).toBeLessThan(GLASS_OPACITY);
    expect(cell120).toBeLessThan(cell24);
    expect(cell120).toBeGreaterThan(0);
  });
});
