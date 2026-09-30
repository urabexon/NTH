import { afterImage } from 'three/addons/tsl/display/AfterImageNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { convertToTexture, mrt, output, pass, uniform, velocity } from 'three/tsl';
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
  CAMERA_DISTANCE,
  DOF_BOKEH_DEFAULT,
  DOF_BOKEH_MAX,
  DOF_FOCAL_LENGTH,
  MOTION_BLUR_DEFAULT,
  MOTION_BLUR_MAX,
  TRAIL_DAMP_DEFAULT,
  TRAIL_DAMP_MAX,
} from '@/core/config';
import { clamp } from '@/core/easing';

import { CompositeEffect } from './CompositeEffect';
import { DeformEffect } from './DeformEffect';
import { motionStreak } from './motionStreak';

export interface PipelineOptions {
  readonly bloomEnabled?: boolean;
}

export class Pipeline {
  readonly deform = new DeformEffect();
  readonly composite = new CompositeEffect();
  readonly trailDampNode = uniform(TRAIL_DAMP_DEFAULT);
  readonly motionBlurNode = uniform(MOTION_BLUR_DEFAULT);
  readonly bokehNode = uniform(DOF_BOKEH_DEFAULT);
  readonly focusDistanceNode = uniform(CAMERA_DISTANCE);

  private readonly post: RenderPipeline;
  private readonly bloomNode;

  constructor(
    renderer: WebGPURenderer,
    scene: Scene,
    camera: Camera,
    options: PipelineOptions = {},
  ) {
    const scenePass = pass(scene, camera);
    scenePass.setMRT(mrt({ output, velocity }));
    const sceneColor = scenePass.getTextureNode('output');
    const sceneVelocity = scenePass.getTextureNode('velocity');
    const blurred = motionStreak(sceneColor, sceneVelocity, this.motionBlurNode);
    const focused = dof(
      blurred,
      scenePass.getViewZNode(),
      this.focusDistanceNode,
      DOF_FOCAL_LENGTH,
      this.bokehNode,
    );
    const deformed = this.deform.apply(convertToTexture(focused));
    const color = afterImage(deformed, this.trailDampNode) as unknown as Node<'vec4'>;

    this.bloomNode = bloom(
      color,
      BLOOM_STRENGTH_DEFAULT,
      BLOOM_RADIUS_DEFAULT,
      BLOOM_THRESHOLD_DEFAULT,
    );

    const lit = options.bloomEnabled === false ? color : color.add(this.bloomNode);
    this.bloomNode.setResolutionScale(1 / renderer.getPixelRatio());
    const composed = this.composite.apply(convertToTexture(lit));
    this.post = new RenderPipeline(renderer, fxaa(composed));
  }

  get motionBlur(): number {
    return this.motionBlurNode.value;
  }

  set motionBlur(value: number) {
    this.motionBlurNode.value = clamp(value, 0, MOTION_BLUR_MAX);
  }

  get bokeh(): number {
    return this.bokehNode.value;
  }

  set bokeh(value: number) {
    this.bokehNode.value = clamp(value, 0, DOF_BOKEH_MAX);
  }

  get focusDistance(): number {
    return this.focusDistanceNode.value;
  }

  set focusDistance(value: number) {
    this.focusDistanceNode.value = Math.max(0.01, value);
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
