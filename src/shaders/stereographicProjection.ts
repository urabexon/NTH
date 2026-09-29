import { attribute, normalize, positionLocal, vec4 } from 'three/tsl';
import type { Node } from 'three/webgpu';

export function projectPoint4D(
  point: Node<'vec4'>,
  matrix4d: Node<'mat4'>,
  distance: Node<'float'>,
) {
  const onSphere = normalize(matrix4d.mul(point));
  const scale = distance.div(distance.sub(onSphere.w));
  return onSphere.xyz.mul(scale);
}

export function stereographicProjection(matrix4d: Node<'mat4'>, distance: Node<'float'>) {
  const positionW = attribute('positionW', 'float');
  return projectPoint4D(vec4(positionLocal, positionW), matrix4d, distance);
}
