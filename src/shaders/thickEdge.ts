import {
  attribute,
  cameraProjectionMatrix,
  clamp,
  Fn,
  modelViewMatrix,
  normalize,
  screenSize,
  varying,
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
  readonly across: Node<'float'>;
}

export function thickEdgeVertex({ matrix4d, distance, widthPx }: ThickEdgeInputs): ThickEdgeNodes {
  const prev4 = vec4(attribute('positionPrev', 'vec3'), attribute('positionPrevW', 'float'));
  const curr4 = vec4(attribute('positionCurr', 'vec3'), attribute('positionCurrW', 'float'));
  const next4 = vec4(attribute('positionNext', 'vec3'), attribute('positionNextW', 'float'));
  const side = attribute('side', 'float');

  const currentNow = projectPoint4D(curr4, matrix4d, distance);
  const currentPrevious = projectPoint4D(curr4, previousMatrix4dNode, previousDistanceNode);
  const velocity = screenVelocity(
    cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(currentNow, 1))),
    clipPrevious(currentPrevious),
  );

  const vertex = Fn(() => {
    const toClip = (point: Node<'vec3'>) =>
      cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(point, 1)));
    const clipPrev = toClip(projectPoint4D(prev4, matrix4d, distance));
    const clipCurr = toClip(currentNow);
    const clipNext = toClip(projectPoint4D(next4, matrix4d, distance));

    const aspect = screenSize.x.div(screenSize.y);
    const ndcPrev = clipPrev.xy.div(clipPrev.w).mul(vec2(aspect, 1));
    const ndcNext = clipNext.xy.div(clipNext.w).mul(vec2(aspect, 1));
    const direction = normalize(ndcNext.sub(ndcPrev));
    const normal = vec2(direction.y.negate(), direction.x);

    const depthScale = clamp(
      clipCurr.w.reciprocal().mul(EDGE_DEPTH_REFERENCE),
      EDGE_DEPTH_SCALE_MIN,
      EDGE_DEPTH_SCALE_MAX,
    );
    const halfWidthNdc = widthPx.mul(pixelRatioNode).mul(depthScale).div(screenSize.y);
    const offset = normal.mul(halfWidthNdc).mul(side).div(vec2(aspect, 1));

    return vec4(clipCurr.xy.add(offset.mul(clipCurr.w)), clipCurr.zw);
  })();

  const across = varying(side, 'edgeAcross');

  return { vertex, velocity, across };
}
