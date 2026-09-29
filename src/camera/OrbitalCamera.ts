import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three';

import {
  CAMERA_DISTANCE,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  DOLLY_EASING_TIME,
  DOLLY_MAX,
  FRAME_ASPECT,
  MAGNIFY_DISTANCE,
  MAGNIFY_FOV,
  MAGNIFY_IN_TIME,
  MAGNIFY_OUT_TIME,
  ORBIT_EASING_TIME,
  ORBIT_MAX_SPEED,
  ORBIT_MIN_SPEED,
} from '@/core/config';
import { clamp, easeToward } from '@/core/easing';
import { createRandom, randomBetween, type Random } from '@/core/random';

export interface OrbitalCameraOptions {
  readonly seed?: number;
  readonly aspect?: number;
}

export class OrbitalCamera extends Object3D {
  readonly camera: PerspectiveCamera;

  private readonly dolly = new Object3D();
  private readonly random: Random;
  private readonly angularVelocity = new Vector3();
  private readonly targetAngularVelocity = new Vector3();
  private readonly step = new Quaternion();
  private readonly axis = new Vector3();

  private dollyTarget = 0;
  private dollyValue = 0;
  private magnified = false;
  private magnifyAmount = 0;

  constructor(options: OrbitalCameraOptions = {}) {
    super();
    this.random = createRandom(options.seed ?? 1);
    this.camera = new PerspectiveCamera(
      CAMERA_FOV,
      options.aspect ?? FRAME_ASPECT,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    this.camera.position.z = CAMERA_DISTANCE;
    this.dolly.add(this.camera);
    this.add(this.dolly);
    this.targetAngularVelocity.copy(this.randomAngularVelocity());
    this.angularVelocity.copy(this.targetAngularVelocity);
  }

  get dollyDistance(): number {
    return this.dollyValue;
  }

  set dollyDistance(value: number) {
    this.dollyTarget = clamp(value, 0, DOLLY_MAX);
  }

  get isMagnified(): boolean {
    return this.magnified;
  }

  set isMagnified(value: boolean) {
    this.magnified = value;
  }

  reseed(): void {
    this.targetAngularVelocity.copy(this.randomAngularVelocity());
  }

  update(dt: number): void {
    this.updateOrbit(dt);
    this.updateDolly(dt);
    this.updateMagnify(dt);
  }

  private updateOrbit(dt: number): void {
    this.angularVelocity.lerp(this.targetAngularVelocity, 1 - Math.exp(-dt / ORBIT_EASING_TIME));
    const speed = this.angularVelocity.length();
    if (speed === 0) return;
    this.axis.copy(this.angularVelocity).divideScalar(speed);
    this.step.setFromAxisAngle(this.axis, speed * dt);
    this.quaternion.premultiply(this.step).normalize();
  }

  private updateDolly(dt: number): void {
    this.dollyValue = easeToward(this.dollyValue, this.dollyTarget, dt, DOLLY_EASING_TIME);
    this.dolly.position.z = this.dollyValue;
  }

  private updateMagnify(dt: number): void {
    const target = this.magnified ? 1 : 0;
    const time = this.magnified ? MAGNIFY_IN_TIME : MAGNIFY_OUT_TIME;
    this.magnifyAmount = easeToward(this.magnifyAmount, target, dt, time);
    this.camera.fov = CAMERA_FOV + (MAGNIFY_FOV - CAMERA_FOV) * this.magnifyAmount;
    this.camera.position.z =
      CAMERA_DISTANCE + (MAGNIFY_DISTANCE - CAMERA_DISTANCE) * this.magnifyAmount;
    this.camera.updateProjectionMatrix();
  }

  private randomAngularVelocity(): Vector3 {
    const direction = new Vector3(
      randomBetween(this.random, -1, 1),
      randomBetween(this.random, -1, 1),
      randomBetween(this.random, -1, 1),
    );
    if (direction.lengthSq() === 0) direction.set(0, 1, 0);
    direction.normalize();
    return direction.multiplyScalar(randomBetween(this.random, ORBIT_MIN_SPEED, ORBIT_MAX_SPEED));
  }
}
