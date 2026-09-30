import { dot, float, Fn, max, screenSize, uv, vec2 } from 'three/tsl';
import type { Node, TextureNode } from 'three/webgpu';

import { MOTION_BLUR_SAMPLES, MOTION_DILATE_PX } from '@/core/config';

const TAP_DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7071, 0.7071],
  [-0.7071, 0.7071],
  [0.7071, -0.7071],
  [-0.7071, -0.7071],
];

export function motionStreak(
  color: TextureNode,
  velocityTexture: TextureNode,
  amount: Node<'float'>,
): Node<'vec4'> {
  return Fn(() => {
    const uvs = uv();
    const texel = float(1).div(screenSize);
    const radius = amount.mul(MOTION_DILATE_PX);

    const best = velocityTexture.sample(uvs).xy.toVar();
    const bestLength = dot(best, best).toVar();
    for (const ring of [0.5, 1]) {
      for (const [x, y] of TAP_DIRECTIONS) {
        const offset = vec2(x, y).mul(texel).mul(radius.mul(ring));
        const candidate = velocityTexture.sample(uvs.add(offset)).xy;
        const candidateLength = dot(candidate, candidate);
        const better = candidateLength.greaterThan(bestLength);
        best.assign(better.select(candidate, best));
        bestLength.assign(better.select(candidateLength, bestLength));
      }
    }

    const streak = best.mul(amount);
    const result = color.sample(uvs).toVar();
    for (let i = 1; i < MOTION_BLUR_SAMPLES; i++) {
      const t = i / (MOTION_BLUR_SAMPLES - 1) - 0.5;
      const weight = 1 - Math.abs(t) * 1.2;
      const sample = color.sample(uvs.add(streak.mul(t))).mul(weight);
      result.assign(max(result, sample));
    }
    return result;
  })();
}
