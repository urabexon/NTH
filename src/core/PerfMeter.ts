import type { WebGPURenderer } from 'three/webgpu';

export interface PerfSample {
  cpuMs: number;
  gpuMs: number;
  drawCalls: number;
  triangles: number;
  vramMb: number;
}

const SMOOTHING = 0.1;
const GPU_RESOLVE_INTERVAL = 10;
const BYTES_PER_MB = 1024 * 1024;

export class PerfMeter {
  readonly sample: PerfSample = { cpuMs: 0, gpuMs: 0, drawCalls: 0, triangles: 0, vramMb: 0 };

  private frameStart = 0;
  private frames = 0;
  private framesSinceResolve = 0;
  private resolving = false;

  constructor(
    private readonly renderer: WebGPURenderer,
    private readonly gpuTiming: boolean,
  ) {}

  beginFrame(now: number = performance.now()): void {
    this.frameStart = now;
  }

  endFrame(now: number = performance.now()): void {
    const cpu = now - this.frameStart;
    this.sample.cpuMs = smooth(this.sample.cpuMs, cpu);
    const info = this.renderer.info;
    this.sample.drawCalls = info.render.drawCalls;
    this.sample.triangles = info.render.triangles;
    this.sample.vramMb = info.memory.total / BYTES_PER_MB;
    this.frames++;
    this.framesSinceResolve++;
    if (this.gpuTiming && !this.resolving && this.frames % GPU_RESOLVE_INTERVAL === 0) {
      this.resolving = true;
      const batch = this.framesSinceResolve;
      this.framesSinceResolve = 0;
      void this.renderer
        .resolveTimestampsAsync('render')
        .then(() => {
          const gpu = this.renderer.info.render.timestamp / batch;
          if (Number.isFinite(gpu) && gpu > 0) this.sample.gpuMs = smooth(this.sample.gpuMs, gpu);
        })
        .catch(() => undefined)
        .finally(() => {
          this.resolving = false;
        });
    }
  }
}

export function smooth(previous: number, next: number, factor: number = SMOOTHING): number {
  return previous === 0 ? next : previous + (next - previous) * factor;
}
