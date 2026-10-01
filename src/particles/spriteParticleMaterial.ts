import { AdditiveBlending, Color } from 'three';
import { length, mrt, output, smoothstep, uniform, uv } from 'three/tsl';
import { SpriteNodeMaterial, type Node } from 'three/webgpu';

import { previousDistanceNode, previousMatrix4dNode } from '@/core/motion';
import type { Projector4D } from '@/core/Projector4D';
import { clipNow, clipPrevious, screenVelocity } from '@/shaders/screenVelocity';
import { projectPoint4D } from '@/shaders/stereographicProjection';

export interface SpriteParticleMaterialOptions {
  readonly projector: Projector4D;
  readonly point4d: Node<'vec4'>;
  readonly size: Node<'float'>;
  readonly color: number;
  readonly opacity: number;
}

export function createSpriteParticleMaterial(
  options: SpriteParticleMaterialOptions,
): SpriteNodeMaterial {
  const material = new SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const projected = projectPoint4D(
    options.point4d,
    options.projector.matrixNode,
    options.projector.distanceNode,
  );
  const projectedPrevious = projectPoint4D(
    options.point4d,
    previousMatrix4dNode,
    previousDistanceNode,
  );
  material.positionNode = projected;
  material.mrtNode = mrt({
    output,
    velocity: screenVelocity(clipNow(projected), clipPrevious(projectedPrevious)),
  });
  material.scaleNode = options.size;
  material.colorNode = uniform(new Color(options.color));
  material.opacityNode = smoothstep(0.5, 0.1, length(uv().sub(0.5))).mul(options.opacity);
  return material;
}
