import { Matrix4 } from 'three';

import { createRandom, randomBetween, randomSign, type Random } from './random';

export const ROTATION_PLANES = ['xy', 'xz', 'yz', 'xw', 'yw', 'zw'] as const;
export type RotationPlane = (typeof ROTATION_PLANES)[number];

const PLANE_AXES: Readonly<Record<RotationPlane, readonly [number, number]>> = {
  xy: [0, 1],
  xz: [0, 2],
  yz: [1, 2],
  xw: [0, 3],
  yw: [1, 3],
  zw: [2, 3],
};

export interface Rotor4DOptions {
  readonly seed?: number;
  readonly minSpeed?: number;
  readonly maxSpeed?: number;
  readonly easingTime?: number;
  readonly initialSpeeds?: Readonly<Record<RotationPlane, number>>;
}

const DEFAULT_MIN_SPEED = 0.15;
const DEFAULT_MAX_SPEED = 0.6;
const DEFAULT_EASING_TIME = 1.5;

export class Rotor4D {
  readonly matrix = new Matrix4();
  speedMultiplier = 1;

  private readonly random: Random;
  private readonly minSpeed: number;
  private readonly maxSpeed: number;
  private readonly easingTime: number;
  private readonly angles: Record<RotationPlane, number>;
  private readonly speeds: Record<RotationPlane, number>;
  private readonly targetSpeeds: Record<RotationPlane, number>;
  private readonly planeMatrix = new Matrix4();

  constructor(options: Rotor4DOptions = {}) {
    this.random = createRandom(options.seed ?? 1);
    this.minSpeed = options.minSpeed ?? DEFAULT_MIN_SPEED;
    this.maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;
    this.easingTime = options.easingTime ?? DEFAULT_EASING_TIME;
    this.angles = zeroPlanes();
    this.speeds = { ...(options.initialSpeeds ?? this.randomSpeeds()) };
    this.targetSpeeds = { ...this.speeds };
  }

  get currentSpeeds(): Readonly<Record<RotationPlane, number>> {
    return { ...this.speeds };
  }

  get currentAngles(): Readonly<Record<RotationPlane, number>> {
    return { ...this.angles };
  }

  reseed(): void {
    Object.assign(this.targetSpeeds, this.randomSpeeds());
  }

  update(dt: number): void {
    const blend = this.easingTime > 0 ? 1 - Math.exp(-dt / this.easingTime) : 1;
    for (const plane of ROTATION_PLANES) {
      this.speeds[plane] += (this.targetSpeeds[plane] - this.speeds[plane]) * blend;
      this.angles[plane] += this.speeds[plane] * this.speedMultiplier * dt;
    }
    this.rebuildMatrix();
  }

  private randomSpeeds(): Record<RotationPlane, number> {
    const speeds = zeroPlanes();
    for (const plane of ROTATION_PLANES) {
      speeds[plane] =
        randomSign(this.random) * randomBetween(this.random, this.minSpeed, this.maxSpeed);
    }
    return speeds;
  }

  private rebuildMatrix(): void {
    this.matrix.identity();
    for (const plane of ROTATION_PLANES) {
      const [i, j] = PLANE_AXES[plane];
      this.matrix.multiply(planeRotation(this.planeMatrix, i, j, this.angles[plane]));
    }
  }
}

export function planeRotation(target: Matrix4, i: number, j: number, angle: number): Matrix4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const e = target.identity().elements;
  e[i + i * 4] = c;
  e[j + j * 4] = c;
  e[i + j * 4] = -s;
  e[j + i * 4] = s;
  return target;
}

function zeroPlanes(): Record<RotationPlane, number> {
  return { xy: 0, xz: 0, yz: 0, xw: 0, yw: 0, zw: 0 };
}
