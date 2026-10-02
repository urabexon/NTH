import type { WebGPURenderer } from 'three/webgpu';

import { FRAME_ASPECT, MAX_PIXEL_RATIO, RENDER_SCALE_MAX, RENDER_SCALE_MIN } from './config';
import { clamp } from './easing';
import { fitAspect } from './letterbox';
import { effectivePixelRatio, setPixelRatio } from './screen';

export class Viewport {
  private scale = 1;

  constructor(
    private readonly renderer: WebGPURenderer,
    private readonly aspect: number = FRAME_ASPECT,
  ) {
    window.addEventListener('resize', this.apply);
    this.apply();
  }

  get renderScale(): number {
    return this.scale;
  }

  set renderScale(value: number) {
    const next = clamp(value, RENDER_SCALE_MIN, RENDER_SCALE_MAX);
    if (next === this.scale) return;
    this.scale = next;
    this.apply();
  }

  dispose(): void {
    window.removeEventListener('resize', this.apply);
  }

  private readonly apply = (): void => {
    const { width, height } = fitAspect(
      { width: window.innerWidth, height: window.innerHeight },
      this.aspect,
    );
    this.renderer.setPixelRatio(
      effectivePixelRatio(window.devicePixelRatio, MAX_PIXEL_RATIO, this.scale),
    );
    this.renderer.setSize(width, height, true);
    setPixelRatio(this.renderer.getPixelRatio());
  };
}
