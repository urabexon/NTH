import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { pass } from 'three/tsl';
import { RenderPipeline, type Camera, type Scene, type WebGPURenderer } from 'three/webgpu';

import {
  BLOOM_RADIUS_DEFAULT,
  BLOOM_STRENGTH_DEFAULT,
  BLOOM_THRESHOLD_DEFAULT,
} from '@/core/config';

export interface PipelineOptions {
  readonly bloomEnabled?: boolean;
}

export class Pipeline {
  private readonly post: RenderPipeline;
  private readonly bloomNode;

  constructor(
    renderer: WebGPURenderer,
    scene: Scene,
    camera: Camera,
    options: PipelineOptions = {},
  ) {
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode('output');

    this.bloomNode = bloom(
      color,
      BLOOM_STRENGTH_DEFAULT,
      BLOOM_RADIUS_DEFAULT,
      BLOOM_THRESHOLD_DEFAULT,
    );

    const composed = options.bloomEnabled === false ? color : color.add(this.bloomNode);
    this.post = new RenderPipeline(renderer, fxaa(composed));
  }

  get bloomStrength(): number {
    return this.bloomNode.strength.value;
  }

  set bloomStrength(value: number) {
    this.bloomNode.strength.value = Math.max(0, value);
  }

  get bloomRadius(): number {
    return this.bloomNode.radius.value;
  }

  set bloomRadius(value: number) {
    this.bloomNode.radius.value = Math.max(0, value);
  }

  get bloomThreshold(): number {
    return this.bloomNode.threshold.value;
  }

  set bloomThreshold(value: number) {
    this.bloomNode.threshold.value = Math.max(0, value);
  }

  render(): void {
    this.post.render();
  }
}
