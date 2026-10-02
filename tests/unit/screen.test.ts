import { describe, expect, test } from 'vitest';

import { defaultRenderScale, effectivePixelRatio } from '@/core/screen';

describe('effectivePixelRatio', () => {
  test('caps the device ratio and applies the scale', () => {
    expect(effectivePixelRatio(1, 2, 1)).toBe(1);
    expect(effectivePixelRatio(2, 2, 0.75)).toBe(1.5);
    expect(effectivePixelRatio(3, 2, 1)).toBe(2);
    expect(effectivePixelRatio(1, 2, 0.1)).toBe(0.25);
  });
});

describe('defaultRenderScale', () => {
  test('lowers the scale only on hi-DPI screens', () => {
    expect(defaultRenderScale(1, 2, 0.75)).toBe(1);
    expect(defaultRenderScale(2, 2, 0.75)).toBe(0.75);
    expect(defaultRenderScale(3, 2, 0.75)).toBe(0.75);
  });
});
