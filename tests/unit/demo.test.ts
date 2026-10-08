import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import { DemoPlayer, type DemoState } from '@/demo/DemoPlayer';
import { timelineSchema, type Timeline } from '@/demo/schema';

const bundled = timelineSchema.parse(
  JSON.parse(readFileSync(join(process.cwd(), 'public/demo/timeline.json'), 'utf8')),
);

function fakeTransport() {
  const t = { time: 0, ended: false, started: [] as string[], stops: 0 };
  return {
    t,
    transport: {
      start: (file: string) => {
        t.started.push(file);
        return Promise.resolve();
      },
      stop: () => {
        t.stops++;
      },
      get playbackTime() {
        return t.time;
      },
      get hasEnded() {
        return t.ended;
      },
    },
  };
}

function setup(timeline: Timeline = bundled) {
  const { t, transport } = fakeTransport();
  const onCue = vi.fn();
  const states: DemoState[] = [];
  const player = new DemoPlayer(timeline, transport, {
    onCue,
    onStateChange: (s) => states.push(s),
  });
  return { player, t, onCue, states };
}

describe('bundled timeline', () => {
  test('is valid, starts at 0 and is sorted', () => {
    expect(bundled.track).toBe('demo/track.m4a');
    expect(bundled.cues[0]?.at).toBe(0);
    const ats = bundled.cues.map((c) => c.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    expect(ats.at(-1)).toBeLessThan(60);
  });

  test('schema rejects an empty timeline', () => {
    expect(() => timelineSchema.parse({ v: 1, track: 'x', cues: [] })).toThrow();
  });
});

describe('DemoPlayer', () => {
  test('starts the track, applies the first cue immediately and later cues on time', async () => {
    const { player, t, onCue, states } = setup();
    await player.start();
    expect(t.started).toEqual(['demo/track.m4a']);
    expect(states).toEqual(['playing']);
    expect(onCue).toHaveBeenCalledTimes(1);
    expect(onCue.mock.calls[0]?.[0]).toBe(0);
    const second = bundled.cues[1]?.at ?? 0;
    const third = bundled.cues[2]?.at ?? 0;
    t.time = second - 0.1;
    player.update();
    expect(onCue).toHaveBeenCalledTimes(1);
    t.time = third + 0.1;
    player.update();
    expect(onCue).toHaveBeenCalledTimes(3);
    expect(player.cueIndex).toBe(2);
  });

  test('ends when the track ends and can be restarted from the first cue', async () => {
    const { player, t, onCue, states } = setup();
    await player.start();
    t.time = 60;
    t.ended = true;
    player.update();
    expect(states.at(-1)).toBe('ended');
    expect(t.stops).toBe(1);
    t.ended = false;
    t.time = 0;
    await player.start();
    expect(onCue).toHaveBeenLastCalledWith(0, bundled.cues[0]);
  });

  test('stop() during playback stops the transport once and ignores later updates', async () => {
    const { player, t, onCue } = setup();
    await player.start();
    player.stop();
    player.stop();
    expect(t.stops).toBe(1);
    t.time = 30;
    player.update();
    expect(onCue).toHaveBeenCalledTimes(1);
    expect(player.state).toBe('off');
  });
});
