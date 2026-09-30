import { uniform } from 'three/tsl';

export const pixelRatioNode = uniform(1);

export function setPixelRatio(value: number): void {
  pixelRatioNode.value = Math.max(1, value);
}
