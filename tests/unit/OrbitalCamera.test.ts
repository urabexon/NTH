import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';

import { OrbitalCamera } from '@/camera/OrbitalCamera';
import {
  CAMERA_DISTANCE,
  CAMERA_FOV,
  DOLLY_MAX,
  MAGNIFY_DISTANCE,
  MAGNIFY_FOV,
} from '@/core/config';

function run(camera: OrbitalCamera, seconds: number, step = 1 / 60): void {
  for (let t = 0; t < seconds; t += step) camera.update(step);
}

function worldPosition(camera: OrbitalCamera): Vector3 {
  camera.updateMatrixWorld(true);
  return new Vector3().setFromMatrixPosition(camera.camera.matrixWorld);
}

describe('OrbitalCamera', () => {
  test('keeps the camera at CAMERA_DISTANCE from the origin while orbiting', () => {
    const orbit = new OrbitalCamera({ seed: 3 });
    run(orbit, 5);
    expect(worldPosition(orbit).length()).toBeCloseTo(CAMERA_DISTANCE, 6);
  });

  test('always looks at the origin', () => {
    const orbit = new OrbitalCamera({ seed: 3 });
    run(orbit, 3);
    orbit.updateMatrixWorld(true);
    const forward = new Vector3(0, 0, -1).transformDirection(orbit.camera.matrixWorld);
    const toOrigin = worldPosition(orbit).negate().normalize();
    expect(forward.dot(toOrigin)).toBeCloseTo(1, 6);
  });

  test('actually moves over time', () => {
    const orbit = new OrbitalCamera({ seed: 3 });
    const before = worldPosition(orbit);
    run(orbit, 2);
    expect(before.distanceTo(worldPosition(orbit))).toBeGreaterThan(0.05);
  });

  test('dolly eases toward its target and is clamped to DOLLY_MAX', () => {
    const orbit = new OrbitalCamera({ seed: 1 });
    orbit.dollyDistance = 2;
    orbit.update(1 / 60);
    expect(orbit.dollyDistance).toBeGreaterThan(0);
    expect(orbit.dollyDistance).toBeLessThan(2);
    run(orbit, 5);
    expect(orbit.dollyDistance).toBeCloseTo(2, 3);
    expect(worldPosition(orbit).length()).toBeCloseTo(CAMERA_DISTANCE + 2, 3);

    orbit.dollyDistance = 99;
    run(orbit, 5);
    expect(orbit.dollyDistance).toBeCloseTo(DOLLY_MAX, 3);
  });

  test('magnify snaps in fast and eases out slowly', () => {
    const orbit = new OrbitalCamera({ seed: 1 });
    orbit.isMagnified = true;
    run(orbit, 0.3);
    expect(orbit.camera.fov).toBeGreaterThan(MAGNIFY_FOV - 2);
    expect(Math.abs(orbit.camera.position.z - MAGNIFY_DISTANCE)).toBeLessThan(0.1);

    orbit.isMagnified = false;
    run(orbit, 0.3);
    expect(orbit.camera.fov).toBeGreaterThan(CAMERA_FOV + 10);
    run(orbit, 5);
    expect(orbit.camera.fov).toBeCloseTo(CAMERA_FOV, 1);
    expect(orbit.camera.position.z).toBeCloseTo(CAMERA_DISTANCE, 1);
  });

  test('reseed changes the orbit direction smoothly', () => {
    const orbit = new OrbitalCamera({ seed: 9 });
    run(orbit, 1);
    const a = worldPosition(orbit);
    orbit.reseed();
    orbit.update(1 / 60);
    const b = worldPosition(orbit);
    expect(a.distanceTo(b)).toBeLessThan(0.02);
  });

  test('is deterministic for the same seed', () => {
    const a = new OrbitalCamera({ seed: 5 });
    const b = new OrbitalCamera({ seed: 5 });
    run(a, 2);
    run(b, 2);
    expect(worldPosition(a).distanceTo(worldPosition(b))).toBeLessThan(1e-12);
  });
});
