import {
  abs,
  atan,
  cos,
  float,
  Fn,
  length,
  mix,
  mod,
  mx_noise_vec3,
  select,
  sin,
  screenSize,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import type { Node, TextureNode } from 'three/webgpu';

import {
  LENS_IN_TIME,
  LENS_OUT_TIME,
  LENS_RADIUS_DEFAULT_PX,
  LENS_RADIUS_MAX_PX,
  LENS_RADIUS_MIN_PX,
  SLITSCAN_HALF_WIDTH_PX,
  SLITSCAN_IN_TIME,
  SLITSCAN_OUT_TIME,
  TURBULENCE_AMPLITUDE,
  TURBULENCE_DECAY_TIME,
  TURBULENCE_SCALE,
} from '@/core/config';
import { clamp, easeToward } from '@/core/easing';

export const EFFECT_KINDS = ['none', 'repeat', 'mirror-left', 'mirror-right'] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

const EFFECT_INDEX: Readonly<Record<EffectKind, number>> = {
  none: 0,
  repeat: 1,
  'mirror-left': 2,
  'mirror-right': 3,
};

export class DeformEffect {
  readonly time = uniform(0);
  readonly turbulence = uniform(0);
  readonly slitScan = uniform(0);
  readonly effectKind = uniform(0, 'int');
  readonly lensRadius = uniform(LENS_RADIUS_DEFAULT_PX);
  readonly lensIntensity = uniform(0);

  slitScanEnabled = false;
  lensEnabled = false;

  private kind: EffectKind = 'none';

  get effect(): EffectKind {
    return this.kind;
  }

  set effect(kind: EffectKind) {
    this.kind = kind;
    this.effectKind.value = EFFECT_INDEX[kind];
  }

  get lensRadiusPx(): number {
    return this.lensRadius.value;
  }

  set lensRadiusPx(value: number) {
    this.lensRadius.value = clamp(value, LENS_RADIUS_MIN_PX, LENS_RADIUS_MAX_PX);
  }

  triggerTurbulence(amount = 1): void {
    this.turbulence.value = Math.max(this.turbulence.value, amount);
  }

  update(dt: number): void {
    this.time.value += dt;
    this.turbulence.value = easeToward(this.turbulence.value, 0, dt, TURBULENCE_DECAY_TIME);
    this.slitScan.value = easeToward(
      this.slitScan.value,
      this.slitScanEnabled ? 1 : 0,
      dt,
      this.slitScanEnabled ? SLITSCAN_IN_TIME : SLITSCAN_OUT_TIME,
    );
    this.lensIntensity.value = easeToward(
      this.lensIntensity.value,
      this.lensEnabled ? 1 : 0,
      dt,
      this.lensEnabled ? LENS_IN_TIME : LENS_OUT_TIME,
    );
  }

  apply(input: TextureNode): Node<'vec4'> {
    const { time, turbulence, slitScan, effectKind, lensRadius, lensIntensity } = this;

    return Fn(() => {
      const resolution = screenSize;
      const half = resolution.div(2);
      const coord = uv().mul(resolution).toVar();

      const noiseCoord = vec3(coord.div(resolution.x.mul(TURBULENCE_SCALE)), time.mul(0.5));
      const noise = mx_noise_vec3(noiseCoord).xy;
      coord.addAssign(noise.mul(turbulence).mul(resolution.x.mul(TURBULENCE_AMPLITUDE)));

      const slitX = mix(
        half.x.sub(SLITSCAN_HALF_WIDTH_PX),
        half.x.add(SLITSCAN_HALF_WIDTH_PX),
        coord.x.div(resolution.x),
      );
      coord.x = mix(coord.x, slitX, slitScan);

      const third = resolution.x.div(3);
      const repeatX = mod(coord.x, third).add(third);
      const u = coord.x.div(resolution.x);
      const folded = abs(float(1).sub(u).sub(0.5));
      const mirrorLeftX = float(0.5).sub(folded).mul(resolution.x);
      const mirrorRightX = folded.add(0.5).mul(resolution.x);
      coord.x = select(
        effectKind.equal(1),
        repeatX,
        select(
          effectKind.equal(2),
          mirrorLeftX,
          select(effectKind.equal(3), mirrorRightX, coord.x),
        ),
      );

      const centered = coord.sub(half);
      const r = length(centered);
      const angle = atan(centered.y, centered.x);
      const phase = mix(Math.PI / 2, Math.PI * 2, r.div(lensRadius));
      const bent = lensRadius.mul(cos(phase)).mul(r.div(lensRadius));
      const lensR = select(r.lessThan(lensRadius), bent, r);
      const lensCoord = vec2(cos(angle), sin(angle)).mul(lensR).add(half);
      const finalCoord = mix(coord, lensCoord, lensIntensity);

      return input.sample(finalCoord.div(resolution));
    })();
  }
}
