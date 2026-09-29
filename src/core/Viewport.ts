import type { WebGPURenderer } from 'three/webgpu';

import { FRAME_ASPECT } from './config';
import { fitAspect } from './letterbox';

export class Viewport {
  constructor(
    private readonly renderer: WebGPURenderer,
    private readonly aspect: number = FRAME_ASPECT,
  ) {
    window.addEventListener('resize', this.apply);
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
    this.renderer.setSize(width, height, true);
  };
}
