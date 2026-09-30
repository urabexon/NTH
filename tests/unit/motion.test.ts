import { Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, test } from 'vitest';

import {
  captureMotion,
  previousDistanceNode,
  previousMatrix4dNode,
  previousProjectionMatrixNode,
  previousViewMatrixNode,
} from '@/core/motion';

describe('captureMotion', () => {
  test('copies the 4D matrix, distance and camera matrices into the previous-frame uniforms', () => {
    const camera = new PerspectiveCamera(40, 1.5, 0.1, 100);
    camera.position.set(0, 0, 3);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    const matrix = new Matrix4().makeRotationX(0.3);

    captureMotion(matrix, 1.7, camera);

    expect(previousMatrix4dNode.value.equals(matrix)).toBe(true);
    expect(previousMatrix4dNode.value).not.toBe(matrix);
    expect(previousDistanceNode.value).toBe(1.7);
    expect(previousViewMatrixNode.value.equals(camera.matrixWorldInverse)).toBe(true);
    expect(previousProjectionMatrixNode.value.equals(camera.projectionMatrix)).toBe(true);
  });
});
