import { float } from 'three/tsl';
import type { Node } from 'three/webgpu';

import { GLASS_DENSITY_POWER, GLASS_OPACITY, GLASS_REFERENCE_TRIANGLES } from '@/core/config';

export function glassOpacityFor(triangleCount: number): number {
  const density = GLASS_REFERENCE_TRIANGLES / Math.max(1, triangleCount);
  return GLASS_OPACITY * Math.min(1, Math.pow(density, GLASS_DENSITY_POWER));
}

export function glassOpacity(triangleCount: number): Node<'float'> {
  return float(glassOpacityFor(triangleCount));
}
