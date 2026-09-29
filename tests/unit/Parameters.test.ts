import { describe, expect, test } from 'vitest';

import { PROJECTION_DISTANCE_DEFAULT, ROTATION_SPEED_MAX } from '@/core/config';
import { EasedValue } from '@/ui/EasedValue';
import {
  distanceFromSlider,
  Parameters,
  sliderFromDistance,
  type ParameterTargets,
} from '@/ui/Parameters';

function stubTargets() {
  const targets = {
    projector: { distance: 0 },
    rotor: { speedMultiplier: 0 },
    polytopes: {
      scale: {
        x: 0,
        setScalar(v: number) {
          this.x = v;
        },
      },
      edgeStyle: { widthPx: 0 },
    },
    pipeline: { bloomStrength: 0, deform: { lensRadiusPx: 0 } },
    orbit: {},
  };
  return targets;
}

describe('EasedValue', () => {
  test('eases toward the target and settles exactly', () => {
    const v = new EasedValue(0, 0, 1);
    v.target = 1;
    v.update(1 / 60);
    expect(v.value).toBeGreaterThan(0);
    expect(v.value).toBeLessThan(1);
    for (let i = 0; i < 300; i++) v.update(1 / 60);
    expect(v.value).toBe(1);
    expect(v.update(1 / 60)).toBe(false);
  });

  test('clamps targets and jumps immediately with jumpTo', () => {
    const v = new EasedValue(0.5, 0, 1);
    v.target = 5;
    expect(v.target).toBe(1);
    v.jumpTo(-1);
    expect(v.value).toBe(0);
  });
});

describe('distance mapping', () => {
  test('is cubic and round-trips', () => {
    expect(distanceFromSlider(0)).toBeCloseTo(1.001, 6);
    expect(distanceFromSlider(1)).toBe(5);
    for (const d of [1.2, 1.5, 3, 4.5]) {
      expect(distanceFromSlider(sliderFromDistance(d))).toBeCloseTo(d, 6);
    }
  });
});

describe('Parameters', () => {
  test('applies defaults to the targets on construction', () => {
    const targets = stubTargets();
    new Parameters(targets as unknown as ParameterTargets);
    expect(targets.projector.distance).toBeCloseTo(PROJECTION_DISTANCE_DEFAULT, 6);
    expect(targets.rotor.speedMultiplier).toBeCloseTo(1, 6);
    expect(targets.polytopes.scale.x).toBe(1);
    expect(targets.pipeline.deform.lensRadiusPx).toBe(400);
    expect(targets.pipeline.bloomStrength).toBeCloseTo(0.3, 6);
    expect(targets.polytopes.edgeStyle.widthPx).toBe(2);
  });

  test('set() eases the target value over time', () => {
    const targets = stubTargets();
    const parameters = new Parameters(targets as unknown as ParameterTargets);
    parameters.set('rotationSpeed', 1);
    parameters.update(1 / 60);
    expect(targets.rotor.speedMultiplier).toBeGreaterThan(1);
    expect(targets.rotor.speedMultiplier).toBeLessThan(ROTATION_SPEED_MAX);
    for (let i = 0; i < 300; i++) parameters.update(1 / 60);
    expect(targets.rotor.speedMultiplier).toBeCloseTo(ROTATION_SPEED_MAX, 6);
  });

  test('jumpTo() applies immediately', () => {
    const targets = stubTargets();
    const parameters = new Parameters(targets as unknown as ParameterTargets);
    parameters.jumpTo('scale', 1.5);
    expect(targets.polytopes.scale.x).toBe(1.5);
    parameters.jumpTo('distance', 1);
    expect(targets.projector.distance).toBe(5);
  });
});
