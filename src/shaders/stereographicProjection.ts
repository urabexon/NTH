import { attribute, normalize, positionLocal, vec4 } from 'three/tsl';
import type { Node } from 'three/webgpu';

export function stereographicProjection(matrix4d: Node<'mat4'>, distance: Node<'float'>) {
  const positionW = attribute('positionW', 'float');
  const rotated = matrix4d.mul(vec4(positionLocal, positionW));
  const onSphere = normalize(rotated);
  const scale = distance.div(distance.sub(onSphere.w));
  return onSphere.xyz.mul(scale);
}
