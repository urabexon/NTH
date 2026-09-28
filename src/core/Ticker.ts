import { MAX_FRAME_DELTA } from './config';

export type TickCallback = (dt: number, elapsed: number) => void;

export class Ticker {
  private requestId: number | null = null;
  private previousTime = 0;
  private elapsed = 0;

  constructor(private readonly onTick: TickCallback) {}

  start(): void {
    if (this.requestId !== null) return;
    this.previousTime = performance.now();
    this.requestId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.requestId === null) return;
    cancelAnimationFrame(this.requestId);
    this.requestId = null;
  }

  get isRunning(): boolean {
    return this.requestId !== null;
  }

  private readonly frame = (now: number): void => {
    this.requestId = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.previousTime) / 1000, MAX_FRAME_DELTA);
    this.previousTime = now;
    this.elapsed += dt;
    this.onTick(dt, this.elapsed);
  };
}
