import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MAX_FRAME_DELTA } from '@/core/config';
import { Ticker } from '@/core/Ticker';

function installFakeAnimationFrame() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    const id = nextId++;
    callbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    callbacks.delete(id);
  });
  vi.stubGlobal('performance', { now: () => 0 });

  return {
    fire(now: number): void {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      for (const [, cb] of pending) cb(now);
    },
    get pendingCount() {
      return callbacks.size;
    },
  };
}

describe('Ticker', () => {
  let frames: ReturnType<typeof installFakeAnimationFrame>;

  beforeEach(() => {
    frames = installFakeAnimationFrame();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('reports the delta in seconds and accumulates elapsed time', () => {
    const onTick = vi.fn();
    const ticker = new Ticker(onTick);

    ticker.start();
    frames.fire(16);
    frames.fire(48);

    expect(onTick).toHaveBeenNthCalledWith(1, 0.016, 0.016);
    expect(onTick).toHaveBeenNthCalledWith(2, 0.032, 0.048);
  });

  test('clamps a long pause to MAX_FRAME_DELTA', () => {
    const onTick = vi.fn();
    const ticker = new Ticker(onTick);

    ticker.start();
    frames.fire(5000);

    expect(onTick).toHaveBeenCalledWith(MAX_FRAME_DELTA, MAX_FRAME_DELTA);
  });

  test('stops requesting frames after stop()', () => {
    const ticker = new Ticker(() => undefined);

    ticker.start();
    expect(ticker.isRunning).toBe(true);
    ticker.stop();

    expect(ticker.isRunning).toBe(false);
    expect(frames.pendingCount).toBe(0);
  });
});
