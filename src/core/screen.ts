import { uniform } from 'three/tsl';

export const pixelRatioNode = uniform(1);

export function setPixelRatio(value: number): void {
  pixelRatioNode.value = Math.max(1, value);
}

export function effectivePixelRatio(
  devicePixelRatio: number,
  maxRatio: number,
  scale: number,
): number {
  return Math.max(0.25, Math.min(devicePixelRatio, maxRatio) * scale);
}

export function defaultRenderScale(
  devicePixelRatio: number,
  threshold: number,
  hidpiDefault: number,
): number {
  return devicePixelRatio >= threshold ? hidpiDefault : 1;
}
