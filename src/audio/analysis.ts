import { AUDIO_ONSET_AVERAGE_TIME, AUDIO_ONSET_MIN_INTERVAL } from '@/core/config';
import { easeToward } from '@/core/easing';

export function bandEnergy(
  bins: Uint8Array,
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number,
): number {
  const hzPerBin = sampleRate / fftSize;
  const first = Math.max(0, Math.floor(lowHz / hzPerBin));
  const last = Math.min(bins.length - 1, Math.ceil(highHz / hzPerBin));
  if (last < first) return 0;
  let sum = 0;
  for (let i = first; i <= last; i++) sum += bins[i] ?? 0;
  return sum / ((last - first + 1) * 255);
}

export class OnsetDetector {
  private average = 0;
  private sinceLast = Number.POSITIVE_INFINITY;

  constructor(
    private readonly threshold: number,
    private readonly minInterval: number = AUDIO_ONSET_MIN_INTERVAL,
    private readonly averageTime: number = AUDIO_ONSET_AVERAGE_TIME,
  ) {}

  get runningAverage(): number {
    return this.average;
  }

  update(energy: number, dt: number): boolean {
    this.sinceLast += dt;
    const rise = energy - this.average;
    this.average = easeToward(this.average, energy, dt, this.averageTime);
    if (rise > this.threshold && this.sinceLast >= this.minInterval) {
      this.sinceLast = 0;
      this.average = energy;
      return true;
    }
    return false;
  }
}
