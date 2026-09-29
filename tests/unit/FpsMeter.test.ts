import { describe, expect, test, vi } from 'vitest';

import { FpsMeter } from '@/core/FpsMeter';

describe('FpsMeter', () => {
  test('samples once per second of accumulated time', () => {
    const onSample = vi.fn();
    const meter = new FpsMeter(onSample);
    for (let i = 0; i < 60; i++) meter.tick(1 / 60);
    expect(onSample).toHaveBeenCalledTimes(1);
    expect(onSample.mock.calls[0]?.[0]).toBeCloseTo(60, 5);
    expect(meter.fps).toBeCloseTo(60, 5);
  });

  test('reports a lower rate for slower frames', () => {
    const onSample = vi.fn();
    const meter = new FpsMeter(onSample);
    for (let i = 0; i < 31; i++) meter.tick(1 / 30);
    expect(onSample).toHaveBeenCalledTimes(1);
    expect(onSample.mock.calls[0]?.[0]).toBeCloseTo(30, 5);
  });
});
