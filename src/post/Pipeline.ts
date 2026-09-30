import { afterImage } from 'three/addons/tsl/display/AfterImageNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { convertToTexture, pass, uniform } from 'three/tsl';
import {
  RenderPipeline,
  type Camera,
  type Node,
  type Scene,
  type WebGPURenderer,
} from 'three/webgpu';

import {
  BLOOM_RADIUS_DEFAULT,
  BLOOM_STRENGTH_DEFAULT,
  BLOOM_THRESHOLD_DEFAULT,
  TRAIL_DAMP_DEFAULT,
  TRAIL_DAMP_MAX,
} from '@/core/config';
import { clamp } from '@/core/easing';

import { CompositeEffect } from './CompositeEffect';
import { DeformEffect } from './DeformEffect';

export interface PipelineOptions {
  readonly bloomEnabled?: boolean;
}

export class Pipeline {
  readonly deform = new DeformEffect();
  readonly composite = new CompositeEffect();
  readonly trailDampNode = uniform(TRAIL_DAMP_DEFAULT);

  private readonly post: RenderPipeline;
  private readonly bloomNode;

  constructor(
    renderer: WebGPURenderer,
    scene: Scene,
    camera: Camera,
    options: PipelineOptions = {},
  ) {
    const scenePass = pass(scene, camera);
    const deformed = this.deform.apply(scenePass.getTextureNode('output'));
    const color = afterImage(deformed, this.trailDampNode) as unknown as Node<'vec4'>;

    this.bloomNode = bloom(
      color,
      BLOOM_STRENGTH_DEFAULT,
      BLOOM_RADIUS_DEFAULT,
      BLOOM_THRESHOLD_DEFAULT,
    );

    const lit = options.bloomEnabled === false ? color : color.add(this.bloomNode);
    const composed = this.composite.apply(convertToTexture(lit));
    this.post = new RenderPipeline(renderer, fxaa(composed));
  }

  get trailDamp(): number {
    return this.trailDampNode.value;
  }

  set trailDamp(value: number) {
    this.trailDampNode.value = clamp(value, 0, TRAIL_DAMP_MAX);
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

  update(dt: number): void {
    this.deform.update(dt);
    this.composite.update(dt);
  }

  render(): void {
    this.post.render();
  }
}
