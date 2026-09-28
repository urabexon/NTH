import { createRandom } from '@/core/random';

export type Rgb = readonly [r: number, g: number, b: number];

const COLOR_RANGES = {
  r: { min: 0.25, max: 1.0, gamma: 0.75 },
  g: { min: 0.2, max: 0.7, gamma: 0.9 },
  b: { min: 0.5, max: 0.8, gamma: 0.85 },
} as const;

function channel(random: () => number, range: { min: number; max: number; gamma: number }): number {
  const shaped = Math.pow(random(), range.gamma);
  return range.min + (range.max - range.min) * shaped;
}

export function generateVertexColors(count: number, seed: number): Rgb[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => [
    channel(random, COLOR_RANGES.r),
    channel(random, COLOR_RANGES.g),
    channel(random, COLOR_RANGES.b),
  ]);
}
