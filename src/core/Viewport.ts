import type { PerspectiveCamera } from 'three';
import type { WebGPURenderer } from 'three/webgpu';

export class Viewport {
  constructor(
    private readonly renderer: WebGPURenderer,
    private readonly camera: PerspectiveCamera,
  ) {
    window.addEventListener('resize', this.apply);
    this.apply();
  }

  dispose(): void {
    window.removeEventListener('resize', this.apply);
  }

  private readonly apply = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}
