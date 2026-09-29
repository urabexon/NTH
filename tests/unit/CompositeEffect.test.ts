import { Color } from 'three';
import { describe, expect, test } from 'vitest';

import { ABERRATION_MAX, INVERT_COLOR, INVERT_TRANSITION_TIME } from '@/core/config';
import { CompositeEffect, SPECTRUM_SAMPLES } from '@/post/CompositeEffect';

function run(effect: CompositeEffect, seconds: number, step = 1 / 60): void {
  for (let t = 0; t < seconds - 1e-9; t += step) effect.update(step);
}

describe('CompositeEffect invert', () => {
  test('starts black and reaches the invert color after the transition time', () => {
    const effect = new CompositeEffect();
    expect(effect.exclusionColor.value.getHex()).toBe(0x000000);
    effect.isInverted = true;
    run(effect, INVERT_TRANSITION_TIME + 0.1);
    expect(effect.exclusionColor.value.getHex()).toBe(INVERT_COLOR);
    expect(effect.transitionProgress).toBe(1);
  });

  test('is halfway through at half the transition time', () => {
    const effect = new CompositeEffect();
    effect.isInverted = true;
    run(effect, INVERT_TRANSITION_TIME / 2);
    const expected = new Color(0x000000).lerp(new Color(INVERT_COLOR), 0.5);
    expect(effect.exclusionColor.value.r).toBeCloseTo(expected.r, 2);
    expect(effect.exclusionColor.value.g).toBeCloseTo(expected.g, 2);
  });

  test('eases in slowly at the start (double smoothstep)', () => {
    const effect = new CompositeEffect();
    effect.isInverted = true;
    run(effect, INVERT_TRANSITION_TIME * 0.1);
    expect(effect.exclusionColor.value.r).toBeLessThan(0.02);
  });

  test('toggling back mid-way starts from the current color', () => {
    const effect = new CompositeEffect();
    effect.isInverted = true;
    run(effect, INVERT_TRANSITION_TIME / 2);
    const midway = effect.exclusionColor.value.clone();
    effect.isInverted = false;
    effect.update(0.001);
    expect(effect.exclusionColor.value.r).toBeCloseTo(midway.r, 3);
    run(effect, INVERT_TRANSITION_TIME + 0.1);
    expect(effect.exclusionColor.value.getHex()).toBe(0x000000);
  });

  test('setting the same state again does not restart the transition', () => {
    const effect = new CompositeEffect();
    effect.isInverted = true;
    run(effect, INVERT_TRANSITION_TIME + 0.1);
    effect.isInverted = true;
    expect(effect.transitionProgress).toBe(1);
  });
});

describe('CompositeEffect aberration', () => {
  test('clamps the amount to [0, ABERRATION_MAX]', () => {
    const effect = new CompositeEffect();
    effect.aberrationAmount = -1;
    expect(effect.aberrationAmount).toBe(0);
    effect.aberrationAmount = 99;
    expect(effect.aberrationAmount).toBe(ABERRATION_MAX);
  });

  test('spectrum weights favour red first, green in the middle, blue last', () => {
    const first = SPECTRUM_SAMPLES.at(0)?.weight;
    const middle = SPECTRUM_SAMPLES.at(Math.floor(SPECTRUM_SAMPLES.length / 2))?.weight;
    const last = SPECTRUM_SAMPLES.at(-1)?.weight;
    expect(first?.[0]).toBeGreaterThan(first?.[2] ?? Number.NaN);
    expect(middle?.[1]).toBeGreaterThan(middle?.[0] ?? Number.NaN);
    expect(last?.[2]).toBeGreaterThan(last?.[0] ?? Number.NaN);
  });
});
