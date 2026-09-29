import { describe, expect, test } from 'vitest';

import { fitAspect } from '@/core/letterbox';

const ASPECT = 1920 / 816;

describe('fitAspect', () => {
  test('adds side bars when the window is wider than the frame', () => {
    expect(fitAspect({ width: 3000, height: 816 }, ASPECT)).toEqual({ width: 1920, height: 816 });
  });

  test('adds top and bottom bars when the window is taller than the frame', () => {
    expect(fitAspect({ width: 1920, height: 2000 }, ASPECT)).toEqual({ width: 1920, height: 816 });
  });

  test('returns the container itself when the aspect already matches', () => {
    expect(fitAspect({ width: 1920, height: 816 }, ASPECT)).toEqual({ width: 1920, height: 816 });
  });

  test('handles a portrait tablet', () => {
    const size = fitAspect({ width: 768, height: 1024 }, ASPECT);
    expect(size.width).toBe(768);
    expect(size.height).toBe(Math.round(768 / ASPECT));
  });
});
