import type { Vec4 } from './schema';
import type { Rgb } from './vertexColors';

export type Vec3 = readonly [x: number, y: number, z: number];

export function hopfMap([x, y, z, w]: Vec4): Vec3 {
  return [2 * (x * z + y * w), 2 * (y * z - x * w), x * x + y * y - z * z - w * w];
}

export function hopfFiber(base: Vec3, samples: number): Vec4[] {
  const [a, b, c] = base;
  const alpha = Math.atan2(b, a);
  const r1 = Math.sqrt(Math.max(0, (1 + c) / 2));
  const r2 = Math.sqrt(Math.max(0, (1 - c) / 2));
  return Array.from({ length: samples }, (_, i) => {
    const t = (i / samples) * Math.PI * 2;
    return [r1 * Math.cos(t), r1 * Math.sin(t), r2 * Math.cos(t - alpha), r2 * Math.sin(t - alpha)];
  });
}

export function latitudeRings(count: number, rings = 4): Vec3[] {
  const points: Vec3[] = [];
  const perRing = Math.ceil(count / rings);
  for (let r = 0; r < rings && points.length < count; r++) {
    const c = -0.75 + (1.5 * (r + 0.5)) / rings;
    const radius = Math.sqrt(Math.max(0, 1 - c * c));
    const phase = (r / rings) * (Math.PI / perRing);
    for (let i = 0; i < perRing && points.length < count; i++) {
      const theta = (i / perRing) * Math.PI * 2 + phase;
      points.push([Math.cos(theta) * radius, Math.sin(theta) * radius, c]);
    }
  }
  return points;
}

export function baseColor([a, b, c]: Vec3): Rgb {
  const hue = (Math.atan2(b, a) / (Math.PI * 2) + 1) % 1;
  const light = 0.55 + 0.25 * c;
  return hslToRgb(hue, 0.85, light);
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}
