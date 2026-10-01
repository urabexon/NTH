import { describe, expect, test, vi } from 'vitest';

import { bandEnergy, OnsetDetector } from '@/audio/analysis';
import { AudioReactor } from '@/audio/AudioReactor';
import { AUDIO_DISTANCE_SWING } from '@/core/config';

describe('bandEnergy', () => {
  const sampleRate = 48000;
  const fftSize = 1024;
  const hzPerBin = sampleRate / fftSize;

  test('averages only the bins inside the band', () => {
    const bins = new Uint8Array(fftSize / 2);
    const lowBin = Math.round(60 / hzPerBin);
    bins[lowBin] = 255;
    bins[Math.round(5000 / hzPerBin)] = 255;
    const energy = bandEnergy(bins, sampleRate, fftSize, 30, 180);
    const binsInBand = Math.ceil(180 / hzPerBin) - Math.floor(30 / hzPerBin) + 1;
    expect(energy).toBeCloseTo(1 / binsInBand, 9);
  });

  test('is 1 when the whole band is saturated and 0 when silent', () => {
    const bins = new Uint8Array(fftSize / 2).fill(255);
    expect(bandEnergy(bins, sampleRate, fftSize, 30, 180)).toBe(1);
    expect(bandEnergy(new Uint8Array(fftSize / 2), sampleRate, fftSize, 30, 180)).toBe(0);
  });
});

describe('OnsetDetector', () => {
  test('fires on a sudden rise, then respects the minimum interval', () => {
    const detector = new OnsetDetector(0.2, 0.3, 0.8);
    for (let i = 0; i < 30; i++) expect(detector.update(0.1, 1 / 60)).toBe(false);
    expect(detector.update(0.9, 1 / 60)).toBe(true);
    expect(detector.update(0.9, 1 / 60)).toBe(false);
    for (let i = 0; i < 60; i++) detector.update(0.1, 1 / 60);
    expect(detector.update(0.9, 1 / 60)).toBe(true);
  });

  test('fires once for a sustained note', () => {
    const detector = new OnsetDetector(0.2, 0.3, 0.8);
    let fired = 0;
    for (let i = 0; i < 180; i++) if (detector.update(i < 30 ? 0.05 : 0.9, 1 / 60)) fired++;
    expect(fired).toBe(1);
  });

  test('does not fire on a slow swell', () => {
    const detector = new OnsetDetector(0.2);
    let fired = 0;
    for (let i = 0; i <= 600; i++) if (detector.update(i / 600, 1 / 60)) fired++;
    expect(fired).toBe(0);
  });
});

describe('AudioReactor', () => {
  test('pushes the projection distance down with bass and triggers onsets', () => {
    let energy = 0;
    const onOnset = vi.fn();
    const setDistanceOffset = vi.fn();
    const reactor = new AudioReactor(
      { lowBandEnergy: () => energy },
      { onOnset, setDistanceOffset },
    );
    reactor.sensitivity = 1;
    reactor.smoothing = 0;
    for (let i = 0; i < 30; i++) reactor.update(1 / 60);
    expect(setDistanceOffset.mock.lastCall?.[0]).toBeCloseTo(0, 9);
    energy = 0.8;
    for (let i = 0; i < 60; i++) reactor.update(1 / 60);
    expect(reactor.currentLevel).toBeGreaterThan(0.9);
    const offset = setDistanceOffset.mock.lastCall?.[0] as number;
    expect(offset).toBeLessThan(-AUDIO_DISTANCE_SWING * 0.9);
    expect(onOnset).toHaveBeenCalledTimes(1);
  });

  test('reset() clears the level and the offset', () => {
    const setDistanceOffset = vi.fn();
    const reactor = new AudioReactor(
      { lowBandEnergy: () => 1 },
      { onOnset: vi.fn(), setDistanceOffset },
    );
    for (let i = 0; i < 30; i++) reactor.update(1 / 60);
    reactor.reset();
    expect(reactor.currentLevel).toBe(0);
    expect(setDistanceOffset).toHaveBeenLastCalledWith(0);
  });
});
