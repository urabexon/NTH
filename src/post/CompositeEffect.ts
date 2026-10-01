import { Color } from 'three';
import {
  dot,
  float,
  Fn,
  fract,
  length,
  screenSize,
  sin,
  smoothstep as smoothstepNode,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import type { Node, TextureNode } from 'three/webgpu';

import {
  ABERRATION_DEFAULT,
  ABERRATION_MAX,
  ABERRATION_SAMPLES,
  GRAIN_AMOUNT,
  VIGNETTE_RADIUS,
  VIGNETTE_STRENGTH,
  INVERT_COLOR,
  INVERT_TRANSITION_TIME,
} from '@/core/config';
import { clamp, smoothstep } from '@/core/easing';

interface SpectrumSample {
  readonly t: number;
  readonly weight: readonly [number, number, number];
}

export const SPECTRUM_SAMPLES: readonly SpectrumSample[] = Array.from(
  { length: ABERRATION_SAMPLES },
  (_, i) => {
    const t = i / ABERRATION_SAMPLES;
    return { t, weight: spectrumWeight(t) };
  },
);

const SPECTRUM_TOTAL: readonly [number, number, number] = SPECTRUM_SAMPLES.reduce<
  [number, number, number]
>(
  (sum, sample) => [
    sum[0] + sample.weight[0],
    sum[1] + sample.weight[1],
    sum[2] + sample.weight[2],
  ],
  [0, 0, 0],
);

export class CompositeEffect {
  readonly aberration = uniform(ABERRATION_DEFAULT);
  readonly exclusionColor = uniform(new Color(0x000000));
  readonly time = uniform(0);
  readonly vignette = uniform(VIGNETTE_STRENGTH);
  readonly grain = uniform(GRAIN_AMOUNT);

  private inverted = false;
  private transition = 1;
  private readonly fromColor = new Color(0x000000);
  private readonly toColor = new Color(0x000000);

  get isInverted(): boolean {
    return this.inverted;
  }

  set isInverted(value: boolean) {
    if (value === this.inverted) return;
    this.inverted = value;
    this.fromColor.copy(this.exclusionColor.value);
    this.toColor.set(value ? INVERT_COLOR : 0x000000);
    this.transition = 0;
  }

  get aberrationAmount(): number {
    return this.aberration.value;
  }

  set aberrationAmount(value: number) {
    this.aberration.value = clamp(value, 0, ABERRATION_MAX);
  }

  get vignetteStrength(): number {
    return this.vignette.value;
  }

  set vignetteStrength(value: number) {
    this.vignette.value = clamp(value, 0, 1);
  }

  get grainAmount(): number {
    return this.grain.value;
  }

  set grainAmount(value: number) {
    this.grain.value = clamp(value, 0, 0.2);
  }

  get transitionProgress(): number {
    return this.transition;
  }

  update(dt: number): void {
    this.time.value += dt;
    if (this.transition >= 1) return;
    this.transition = Math.min(1, this.transition + dt / INVERT_TRANSITION_TIME);
    const eased = smoothstep(smoothstep(this.transition));
    this.exclusionColor.value.copy(this.fromColor).lerp(this.toColor, eased);
  }

  apply(input: TextureNode): Node<'vec4'> {
    const { aberration, exclusionColor, time, vignette, grain } = this;

    return Fn(() => {
      const coord = uv();
      const centered = coord.sub(0.5);
      const distance = dot(centered, centered);

      let sum: Node<'vec3'> = vec3(0);
      for (const { t, weight } of SPECTRUM_SAMPLES) {
        const offset = centered.mul(distance).mul(aberration.mul(t));
        const sample = input.sample(coord.add(offset)).rgb;
        sum = sum.add(sample.mul(vec3(...weight)));
      }
      const color = sum.div(vec3(...SPECTRUM_TOTAL));

      const blended = color.add(exclusionColor).sub(color.mul(exclusionColor).mul(2));
      const radial = length(centered.mul(vec2(1.3, 1)));
      const shade = float(1).sub(smoothstepNode(VIGNETTE_RADIUS, 1.25, radial).mul(vignette));
      const pixel = coord.mul(screenSize).add(time.fract().mul(173));
      const noise = fract(sin(dot(pixel, vec2(12.9898, 78.233))).mul(43758.5453))
        .sub(0.5)
        .mul(grain);
      return vec4(blended.mul(shade).add(noise), 1);
    })();
  }
}

function spectrumWeight(t: number): [number, number, number] {
  const lo = t <= 0.5 ? 1 : 0;
  const hi = 1 - lo;
  const w = clamp(1 - Math.abs(2 * clamp((t - 1 / 6) / (4 / 6), 0, 1) - 1), 0, 1);
  const gamma = 1 / 2.2;
  return [Math.pow(lo * (1 - w), gamma), Math.pow(w, gamma), Math.pow(hi * (1 - w), gamma)];
}
