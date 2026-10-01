import { Color } from 'three';

import { NEON_PALETTE } from '@/core/config';
import { createRandom } from '@/core/random';

export type Rgb = readonly [r: number, g: number, b: number];

const PALETTE_RGB: readonly Rgb[] = NEON_PALETTE.map((hex) => {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
});

export function generateVertexColors(count: number, seed: number): Rgb[] {
  const random = createRandom(seed);
  const offset = Math.floor(random() * PALETTE_RGB.length);
  return Array.from({ length: count }, (_, i) => {
    const index = (offset + i + Math.floor(random() * 2)) % PALETTE_RGB.length;
    return PALETTE_RGB[index] ?? PALETTE_RGB[0] ?? [1, 1, 1];
  });
}
