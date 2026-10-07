import { describe, expect, test } from 'vitest';

import { PerfMeter, smooth } from '@/core/PerfMeter';

function fakeRenderer(overrides: Partial<{ timestamp: number }> = {}) {
  const info = {
    render: { drawCalls: 12, triangles: 34567, timestamp: overrides.timestamp ?? 3.5 },
    memory: { total: 50 * 1024 * 1024 },
  };
  return {
    info,
    resolveTimestampsAsync: () => Promise.resolve(info.render.timestamp),
  };
}

describe('smooth', () => {
  test('takes the first sample as is and then eases', () => {
    expect(smooth(0, 10)).toBe(10);
    expect(smooth(10, 20, 0.5)).toBe(15);
  });
});

describe('PerfMeter', () => {
  test('records cpu time, counters and vram every frame', () => {
    const renderer = fakeRenderer();
    const meter = new PerfMeter(renderer as never, false);
    meter.beginFrame(100);
    meter.endFrame(108);
    expect(meter.sample.cpuMs).toBe(8);
    expect(meter.sample.drawCalls).toBe(12);
    expect(meter.sample.triangles).toBe(34567);
    expect(meter.sample.vramMb).toBe(50);
    expect(meter.sample.gpuMs).toBe(0);
  });

  test('resolves accumulated gpu time every tenth frame and averages it per frame', async () => {
    const renderer = fakeRenderer({ timestamp: 42.5 });
    const meter = new PerfMeter(renderer as never, true);
    for (let i = 0; i < 10; i++) {
      meter.beginFrame(i);
      meter.endFrame(i + 1);
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(meter.sample.gpuMs).toBe(4.25);
  });
});
