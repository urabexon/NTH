import { Matrix4, type Camera } from 'three';
import { uniform } from 'three/tsl';

import { PROJECTION_DISTANCE_DEFAULT } from './config';

export const previousMatrix4dNode = uniform(new Matrix4());
export const previousDistanceNode = uniform(PROJECTION_DISTANCE_DEFAULT);
export const previousViewMatrixNode = uniform(new Matrix4());
export const previousProjectionMatrixNode = uniform(new Matrix4());

export function captureMotion(matrix4d: Matrix4, distance: number, camera: Camera): void {
  previousMatrix4dNode.value.copy(matrix4d);
  previousDistanceNode.value = distance;
  previousViewMatrixNode.value.copy(camera.matrixWorldInverse);
  previousProjectionMatrixNode.value.copy(camera.projectionMatrix);
}
