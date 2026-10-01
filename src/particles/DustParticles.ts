import {
  Fn,
  hash,
  instancedArray,
  instanceIndex,
  mx_noise_vec4,
  normalize,
  uniform,
  vec4,
} from 'three/tsl';
import { Sprite, type ComputeNode, type Node, type WebGPURenderer } from 'three/webgpu';

import {
  DUST_COLOR,
  DUST_COUNT,
  DUST_DENSITY_DEFAULT,
  DUST_DRIFT_SPEED,
  DUST_OPACITY,
  DUST_SIZE,
  DUST_WIGGLE_AMPLITUDE,
  DUST_WIGGLE_SCALE,
  DUST_WIGGLE_SPEED,
} from '@/core/config';
import { clamp } from '@/core/easing';
import type { Projector4D } from '@/core/Projector4D';

import { createSpriteParticleMaterial } from './spriteParticleMaterial';

export interface DustParticlesOptions {
  readonly projector: Projector4D;
  readonly count?: number;
}

export class DustParticles extends Sprite {
  readonly maxCount: number;

  private readonly anchor;
  private readonly tangent;
  private readonly time = uniform(0);
  private readonly dt = uniform(0);
  private readonly size = uniform(DUST_SIZE);
  private readonly computeInit: ComputeNode;
  private readonly computeUpdate: ComputeNode;
  private needsInit = true;
  private densityValue = DUST_DENSITY_DEFAULT;

  constructor(options: DustParticlesOptions) {
    super();
    this.maxCount = options.count ?? DUST_COUNT;
    this.frustumCulled = false;

    this.anchor = instancedArray(this.maxCount, 'vec4');
    this.tangent = instancedArray(this.maxCount, 'vec4');
    const { anchor, tangent, time, dt } = this;

    const randomUnit4 = (seed: Node<'float'>) =>
      normalize(
        vec4(
          hash(seed).sub(0.5),
          hash(seed.add(11)).sub(0.5),
          hash(seed.add(23)).sub(0.5),
          hash(seed.add(37)).sub(0.5),
        ),
      );

    this.computeInit = Fn(() => {
      const seed = instanceIndex.toFloat();
      const position = randomUnit4(seed);
      const direction = randomUnit4(seed.add(1000));
      const orthogonal = normalize(direction.sub(position.mul(position.dot(direction))));
      anchor.element(instanceIndex).assign(position);
      tangent.element(instanceIndex).assign(orthogonal);
    })().compute(this.maxCount);

    this.computeUpdate = Fn(() => {
      const position = anchor.element(instanceIndex).toVar();
      const direction = tangent.element(instanceIndex).toVar();
      const step = dt.mul(DUST_DRIFT_SPEED);
      const next = normalize(position.add(direction.mul(step)));
      const nextDirection = normalize(direction.sub(next.mul(next.dot(direction))));
      anchor.element(instanceIndex).assign(next);
      tangent.element(instanceIndex).assign(nextDirection);
    })().compute(this.maxCount);

    const base = anchor.element(instanceIndex);
    const wiggle = mx_noise_vec4(base.mul(DUST_WIGGLE_SCALE).add(time.mul(DUST_WIGGLE_SPEED)));
    const point4d = normalize(base.add(wiggle.mul(DUST_WIGGLE_AMPLITUDE)));

    this.material = createSpriteParticleMaterial({
      projector: options.projector,
      point4d,
      size: this.size,
      color: DUST_COLOR,
      opacity: DUST_OPACITY,
    });
    this.density = this.densityValue;
  }

  get density(): number {
    return this.densityValue;
  }

  set density(value: number) {
    this.densityValue = clamp(value, 0, 1);
    this.count = Math.max(1, Math.round(this.maxCount * this.densityValue));
    this.visible = this.densityValue > 0;
  }

  update(renderer: WebGPURenderer, dt: number): void {
    if (!this.visible) return;
    if (this.needsInit) {
      void renderer.compute(this.computeInit);
      this.needsInit = false;
    }
    this.dt.value = dt;
    this.time.value += dt;
    void renderer.compute(this.computeUpdate);
  }

  override dispose(): void {
    (this.material as { dispose(): void }).dispose();
  }
}
