import {
  AUDIO_DISTANCE_SWING,
  AUDIO_ONSET_THRESHOLD,
  AUDIO_SENSITIVITY_DEFAULT,
  AUDIO_SMOOTHING_DEFAULT,
} from '@/core/config';
import { clamp, easeToward } from '@/core/easing';

import { OnsetDetector } from './analysis';

export interface ReactorTargets {
  readonly onOnset: () => void;
  readonly setDistanceOffset: (offset: number) => void;
}

export interface EnergySource {
  lowBandEnergy(): number;
}

export class AudioReactor {
  sensitivity = AUDIO_SENSITIVITY_DEFAULT;
  smoothing = AUDIO_SMOOTHING_DEFAULT;

  private level = 0;
  private readonly onsets = new OnsetDetector(AUDIO_ONSET_THRESHOLD);

  constructor(
    private readonly source: EnergySource,
    private readonly targets: ReactorTargets,
  ) {}

  get currentLevel(): number {
    return this.level;
  }

  update(dt: number): void {
    const raw = clamp(this.source.lowBandEnergy() * (0.5 + this.sensitivity * 2), 0, 1);
    this.level = easeToward(this.level, raw, dt, 0.02 + this.smoothing * 0.3);
    this.targets.setDistanceOffset(-this.level * AUDIO_DISTANCE_SWING);
    if (this.onsets.update(raw, dt)) this.targets.onOnset();
  }

  reset(): void {
    this.level = 0;
    this.targets.setDistanceOffset(0);
  }
}
