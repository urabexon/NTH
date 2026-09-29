import { Color } from 'three';
import { dot, Fn, uniform, uv, vec3, vec4 } from 'three/tsl';
import type { Node, TextureNode } from 'three/webgpu';

import {
  ABERRATION_DEFAULT,
  ABERRATION_MAX,
  ABERRATION_SAMPLES,
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

  get transitionProgress(): number {
    return this.transition;
  }

  update(dt: number): void {
    if (this.transition >= 1) return;
    this.transition = Math.min(1, this.transition + dt / INVERT_TRANSITION_TIME);
    const eased = smoothstep(smoothstep(this.transition));
    this.exclusionColor.value.copy(this.fromColor).lerp(this.toColor, eased);
  }

  apply(input: TextureNode): Node<'vec4'> {
    const { aberration, exclusionColor } = this;

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
      return vec4(blended, 1);
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
