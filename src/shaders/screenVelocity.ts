import {
  cameraProjectionMatrix,
  modelViewMatrix,
  modelWorldMatrix,
  varying,
  vec4,
} from 'three/tsl';
import type { Node } from 'three/webgpu';

import { previousProjectionMatrixNode, previousViewMatrixNode } from '@/core/motion';

export function clipNow(position: Node<'vec3'>): Node<'vec4'> {
  return cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(position, 1)));
}

export function clipPrevious(position: Node<'vec3'>): Node<'vec4'> {
  return previousProjectionMatrixNode.mul(
    previousViewMatrixNode.mul(modelWorldMatrix.mul(vec4(position, 1))),
  );
}

export function screenVelocity(now: Node<'vec4'>, previous: Node<'vec4'>): Node<'vec2'> {
  const ndcNow = now.xy.div(now.w);
  const ndcPrevious = previous.xy.div(previous.w);
  return varying(ndcNow.sub(ndcPrevious).mul(0.5));
}
