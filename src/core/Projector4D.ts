import type { Matrix4 } from 'three';
import { uniform } from 'three/tsl';

import { PROJECTION_DISTANCE_DEFAULT, PROJECTION_DISTANCE_MIN } from './config';

export class Projector4D {
  readonly matrixNode;
  readonly distanceNode;

  constructor(matrix: Matrix4, distance: number = PROJECTION_DISTANCE_DEFAULT) {
    this.matrixNode = uniform(matrix);
    this.distanceNode = uniform(clampDistance(distance));
  }

  get distance(): number {
    return this.distanceNode.value;
  }

  set distance(value: number) {
    this.distanceNode.value = clampDistance(value);
  }
}

function clampDistance(value: number): number {
  return Math.max(PROJECTION_DISTANCE_MIN, value);
}
