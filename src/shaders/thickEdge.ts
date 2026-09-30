import {
  attribute,
  cameraProjectionMatrix,
  clamp,
  Fn,
  mix,
  modelViewMatrix,
  normalize,
  screenSize,
  vec2,
  vec4,
} from 'three/tsl';
import type { Node } from 'three/webgpu';

import { EDGE_DEPTH_REFERENCE, EDGE_DEPTH_SCALE_MAX, EDGE_DEPTH_SCALE_MIN } from '@/core/config';
import { previousDistanceNode, previousMatrix4dNode } from '@/core/motion';
import { pixelRatioNode } from '@/core/screen';

import { clipPrevious, screenVelocity } from './screenVelocity';
import { projectPoint4D } from './stereographicProjection';

export interface ThickEdgeInputs {
  readonly matrix4d: Node<'mat4'>;
  readonly distance: Node<'float'>;
  readonly widthPx: Node<'float'>;
}

export interface ThickEdgeNodes {
  readonly vertex: Node<'vec4'>;
  readonly velocity: Node<'vec2'>;
}

export function thickEdgeVertex({ matrix4d, distance, widthPx }: ThickEdgeInputs): ThickEdgeNodes {
  const positionA = attribute('positionA', 'vec3');
  const positionAW = attribute('positionAW', 'float');
  const positionB = attribute('positionB', 'vec3');
  const positionBW = attribute('positionBW', 'float');
  const corner = attribute('corner', 'vec2');
  const end = corner.x;

  const centerNow = mix(
    projectPoint4D(vec4(positionA, positionAW), matrix4d, distance),
    projectPoint4D(vec4(positionB, positionBW), matrix4d, distance),
    end,
  );
  const centerPrevious = mix(
    projectPoint4D(vec4(positionA, positionAW), previousMatrix4dNode, previousDistanceNode),
    projectPoint4D(vec4(positionB, positionBW), previousMatrix4dNode, previousDistanceNode),
    end,
  );
  const velocity = screenVelocity(
    cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(centerNow, 1))),
    clipPrevious(centerPrevious),
  );

  const vertex = Fn(() => {
    const projectedA = projectPoint4D(vec4(positionA, positionAW), matrix4d, distance);
    const projectedB = projectPoint4D(vec4(positionB, positionBW), matrix4d, distance);

    const clipA = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(projectedA, 1)));
    const clipB = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(projectedB, 1)));

    const side = corner.y;
    const clip = mix(clipA, clipB, end);

    const aspect = screenSize.x.div(screenSize.y);
    const ndcA = clipA.xy.div(clipA.w).mul(vec2(aspect, 1));
    const ndcB = clipB.xy.div(clipB.w).mul(vec2(aspect, 1));
    const direction = normalize(ndcB.sub(ndcA));
    const normal = vec2(direction.y.negate(), direction.x);

    const depthScale = clamp(
      clip.w.reciprocal().mul(EDGE_DEPTH_REFERENCE),
      EDGE_DEPTH_SCALE_MIN,
      EDGE_DEPTH_SCALE_MAX,
    );
    const halfWidthNdc = widthPx.mul(pixelRatioNode).mul(depthScale).div(screenSize.y);

    const extension = direction.mul(halfWidthNdc).mul(end.mul(2).sub(1));
    const offset = normal.mul(halfWidthNdc).mul(side).add(extension).div(vec2(aspect, 1));

    return vec4(clip.xy.add(offset.mul(clip.w)), clip.zw);
  })();

  return { vertex, velocity };
}
