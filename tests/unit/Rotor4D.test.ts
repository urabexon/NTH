import { Matrix4, Vector4 } from 'three';
import { describe, expect, test } from 'vitest';

import { planeRotation, ROTATION_PLANES, Rotor4D } from '@/core/Rotor4D';

const EPSILON = 1e-9;

function expectOrthonormal(matrix: Matrix4): void {
  const product = matrix.clone().transpose().multiply(matrix);
  const identity = new Matrix4().identity();
  product.elements.forEach((value, i) => {
    expect(Math.abs(value - (identity.elements[i] ?? Number.NaN))).toBeLessThan(EPSILON);
  });
  expect(Math.abs(matrix.determinant() - 1)).toBeLessThan(EPSILON);
}

describe('Rotor4D', () => {
  test('starts as the identity before any update', () => {
    const rotor = new Rotor4D({ seed: 7 });
    expect(rotor.matrix.equals(new Matrix4().identity())).toBe(true);
  });

  test('stays a proper rotation after many updates', () => {
    const rotor = new Rotor4D({ seed: 7 });
    for (let i = 0; i < 500; i++) rotor.update(1 / 60);
    expectOrthonormal(rotor.matrix);
  });

  test('advances every plane at its speed', () => {
    const speeds = { xy: 0.1, xz: 0.2, yz: 0.3, xw: 0.4, yw: 0.5, zw: 0.6 };
    const rotor = new Rotor4D({ initialSpeeds: speeds });
    rotor.update(2);
    for (const plane of ROTATION_PLANES) {
      expect(rotor.currentAngles[plane]).toBeCloseTo(speeds[plane] * 2, 9);
    }
  });

  test('speedMultiplier scales the motion and zero freezes it', () => {
    const rotor = new Rotor4D({ seed: 7 });
    rotor.speedMultiplier = 0;
    rotor.update(1);
    expect(rotor.matrix.equals(new Matrix4().identity())).toBe(true);
  });

  test('a pure xw rotation leaves the y and z axes untouched', () => {
    const rotor = new Rotor4D({
      initialSpeeds: { xy: 0, xz: 0, yz: 0, xw: Math.PI / 2, yw: 0, zw: 0 },
    });
    rotor.update(1);
    const y = new Vector4(0, 1, 0, 0).applyMatrix4(rotor.matrix);
    const x = new Vector4(1, 0, 0, 0).applyMatrix4(rotor.matrix);
    expect(y.y).toBeCloseTo(1, 9);
    expect(x.x).toBeCloseTo(0, 9);
    expect(x.w).toBeCloseTo(1, 9);
  });

  test('reseed eases the speeds toward new targets instead of jumping', () => {
    const rotor = new Rotor4D({ seed: 3, easingTime: 1 });
    const before = { ...rotor.currentSpeeds };
    rotor.reseed();
    rotor.update(0.001);
    for (const plane of ROTATION_PLANES) {
      expect(Math.abs(rotor.currentSpeeds[plane] - before[plane])).toBeLessThan(0.01);
    }
    for (let i = 0; i < 600; i++) rotor.update(1 / 60);
    const after = rotor.currentSpeeds;
    expect(ROTATION_PLANES.some((plane) => Math.abs(after[plane] - before[plane]) > 0.05)).toBe(
      true,
    );
  });

  test('random speeds stay inside [minSpeed, maxSpeed] in magnitude', () => {
    const rotor = new Rotor4D({ seed: 11, minSpeed: 0.2, maxSpeed: 0.5 });
    for (const plane of ROTATION_PLANES) {
      const magnitude = Math.abs(rotor.currentSpeeds[plane]);
      expect(magnitude).toBeGreaterThanOrEqual(0.2);
      expect(magnitude).toBeLessThanOrEqual(0.5);
    }
  });

  test('is deterministic for the same seed', () => {
    const a = new Rotor4D({ seed: 5 });
    const b = new Rotor4D({ seed: 5 });
    for (let i = 0; i < 10; i++) {
      a.update(0.1);
      b.update(0.1);
    }
    expect(a.matrix.equals(b.matrix)).toBe(true);
  });
});

describe('planeRotation', () => {
  test('rotates the first axis of the plane toward the second', () => {
    const m = planeRotation(new Matrix4(), 0, 3, Math.PI / 2);
    const v = new Vector4(1, 0, 0, 0).applyMatrix4(m);
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.w).toBeCloseTo(1, 9);
  });

  test('is orthonormal for any angle', () => {
    expectOrthonormal(planeRotation(new Matrix4(), 1, 2, 1.234));
  });
});
