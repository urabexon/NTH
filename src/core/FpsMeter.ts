export class FpsMeter {
  private frames = 0;
  private elapsed = 0;
  private value = 0;

  constructor(private readonly onSample: (fps: number) => void) {}

  get fps(): number {
    return this.value;
  }

  tick(dt: number): void {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < 1) return;
    this.value = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    this.onSample(this.value);
  }
}
