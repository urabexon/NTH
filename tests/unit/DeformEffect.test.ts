import { describe, expect, test } from 'vitest';

import { LENS_RADIUS_MAX_PX, LENS_RADIUS_MIN_PX } from '@/core/config';
import { DeformEffect } from '@/post/DeformEffect';

function run(effect: DeformEffect, seconds: number, step = 1 / 60): void {
  for (let t = 0; t < seconds; t += step) effect.update(step);
}

describe('DeformEffect', () => {
  test('turbulence decays back to zero within about a second', () => {
    const effect = new DeformEffect();
    effect.triggerTurbulence();
    expect(effect.turbulence.value).toBe(1);
    run(effect, 0.2);
    expect(effect.turbulence.value).toBeGreaterThan(0.3);
    run(effect, 1.5);
    expect(effect.turbulence.value).toBeLessThan(0.02);
  });

  test('triggering again never lowers an active burst', () => {
    const effect = new DeformEffect();
    effect.triggerTurbulence(1);
    effect.triggerTurbulence(0.2);
    expect(effect.turbulence.value).toBe(1);
  });

  test('slit-scan eases in faster than it eases out', () => {
    const effect = new DeformEffect();
    effect.slitScanEnabled = true;
    run(effect, 0.15);
    const afterIn = effect.slitScan.value;
    effect.slitScanEnabled = false;
    run(effect, 0.15);
    const afterOut = effect.slitScan.value;
    expect(afterIn).toBeGreaterThan(0.9);
    expect(afterOut).toBeGreaterThan(0.2);
    expect(afterOut).toBeLessThan(0.5);
  });

  test('effect kind maps to the shader index', () => {
    const effect = new DeformEffect();
    expect(effect.effectKind.value).toBe(0);
    effect.effect = 'repeat';
    expect(effect.effectKind.value).toBe(1);
    effect.effect = 'mirror-left';
    expect(effect.effectKind.value).toBe(2);
    effect.effect = 'mirror-right';
    expect(effect.effectKind.value).toBe(3);
    expect(effect.effect).toBe('mirror-right');
  });

  test('lens radius is clamped to the allowed pixel range', () => {
    const effect = new DeformEffect();
    effect.lensRadiusPx = 10;
    expect(effect.lensRadiusPx).toBe(LENS_RADIUS_MIN_PX);
    effect.lensRadiusPx = 5000;
    expect(effect.lensRadiusPx).toBe(LENS_RADIUS_MAX_PX);
  });

  test('lens intensity follows the enabled flag with easing', () => {
    const effect = new DeformEffect();
    effect.lensEnabled = true;
    run(effect, 0.3);
    expect(effect.lensIntensity.value).toBeGreaterThan(0.95);
    effect.lensEnabled = false;
    run(effect, 0.3);
    expect(effect.lensIntensity.value).toBeGreaterThan(0.4);
    run(effect, 3);
    expect(effect.lensIntensity.value).toBeLessThan(0.01);
  });

  test('time advances by dt', () => {
    const effect = new DeformEffect();
    run(effect, 1, 0.25);
    expect(effect.time.value).toBeCloseTo(1, 9);
  });
});
