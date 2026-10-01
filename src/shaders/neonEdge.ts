import { abs, float, mix, pow, smoothstep, vec3 } from 'three/tsl';
import type { Node } from 'three/webgpu';

import {
  NEON_CORE_BOOST,
  NEON_CORE_INNER,
  NEON_CORE_OUTER,
  NEON_CORE_WHITENESS,
  NEON_DENSITY_POWER,
  NEON_HALO_FALLOFF,
  NEON_REFERENCE_EDGES,
} from '@/core/config';

export interface NeonEdgeNodes {
  readonly color: Node<'vec3'>;
  readonly opacity: Node<'float'>;
}

export function neonIntensityFor(edgeCount: number): number {
  return Math.min(1, Math.pow(NEON_REFERENCE_EDGES / Math.max(1, edgeCount), NEON_DENSITY_POWER));
}

export function neonEdge(
  baseColor: Node<'vec3'>,
  across: Node<'float'>,
  intensity: number,
): NeonEdgeNodes {
  const distance = abs(across);
  const core = float(1).sub(smoothstep(NEON_CORE_INNER, NEON_CORE_OUTER, distance));
  const halo = pow(float(1).sub(distance), NEON_HALO_FALLOFF);
  const color = mix(baseColor, vec3(1), core.mul(NEON_CORE_WHITENESS))
    .mul(float(1).add(core.mul(NEON_CORE_BOOST - 1)))
    .mul(intensity);
  return { color, opacity: halo };
}
