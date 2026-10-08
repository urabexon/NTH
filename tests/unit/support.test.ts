import { describe, expect, test } from 'vitest';

import { isSupported, MIN_SUPPORTED_WIDTH } from '@/core/support';

const desktop = { coarsePointer: false, canHover: true, width: 1440, forced: false };

describe('isSupported', () => {
  test('accepts a desktop pointer at a normal width', () => {
    expect(isSupported(desktop)).toBe(true);
  });

  test('rejects touch-only devices regardless of width', () => {
    expect(isSupported({ ...desktop, coarsePointer: true, canHover: false, width: 1366 })).toBe(
      false,
    );
  });

  test('accepts touch screens that also hover (laptops with touch)', () => {
    expect(isSupported({ ...desktop, coarsePointer: true, canHover: true })).toBe(true);
  });

  test('rejects narrow windows and honours the force flag', () => {
    expect(isSupported({ ...desktop, width: MIN_SUPPORTED_WIDTH - 1 })).toBe(false);
    expect(isSupported({ ...desktop, width: MIN_SUPPORTED_WIDTH - 1, forced: true })).toBe(true);
    expect(isSupported({ ...desktop, coarsePointer: true, canHover: false, forced: true })).toBe(
      true,
    );
  });
});
