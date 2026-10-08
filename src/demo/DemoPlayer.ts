import type { Cue, Timeline } from './schema';

export interface DemoTransport {
  start(file: string): Promise<void>;
  stop(): void;
  readonly playbackTime: number;
  readonly hasEnded: boolean;
}

export interface DemoListener {
  onCue(index: number, cue: Cue): void;
  onStateChange(state: DemoState): void;
}

export type DemoState = 'off' | 'playing' | 'ended';

export class DemoPlayer {
  private stateValue: DemoState = 'off';
  private nextCue = 0;

  constructor(
    private readonly timeline: Timeline,
    private readonly transport: DemoTransport,
    private readonly listener: DemoListener,
  ) {}

  get state(): DemoState {
    return this.stateValue;
  }

  get cueIndex(): number {
    return this.nextCue - 1;
  }

  async start(): Promise<void> {
    if (this.stateValue === 'playing') return;
    this.nextCue = 0;
    await this.transport.start(this.timeline.track);
    this.setState('playing');
    this.update();
  }

  stop(): void {
    if (this.stateValue !== 'playing') return;
    this.transport.stop();
    this.setState('off');
  }

  update(): void {
    if (this.stateValue !== 'playing') return;
    const time = this.transport.playbackTime;
    while (this.nextCue < this.timeline.cues.length) {
      const cue = this.timeline.cues[this.nextCue];
      if (!cue || cue.at > time) break;
      this.listener.onCue(this.nextCue, cue);
      this.nextCue++;
    }
    if (this.transport.hasEnded) {
      this.transport.stop();
      this.setState('ended');
    }
  }

  private setState(state: DemoState): void {
    this.stateValue = state;
    this.listener.onStateChange(state);
  }
}
