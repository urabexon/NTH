import { uniform } from 'three/tsl';

import { EDGE_WIDTH_DEFAULT_PX, EDGE_WIDTH_MAX_PX, EDGE_WIDTH_MIN_PX } from '@/core/config';
import { clamp } from '@/core/easing';

export class EdgeStyle {
  readonly widthNode = uniform(EDGE_WIDTH_DEFAULT_PX);

  get widthPx(): number {
    return this.widthNode.value;
  }

  set widthPx(value: number) {
    this.widthNode.value = clamp(value, EDGE_WIDTH_MIN_PX, EDGE_WIDTH_MAX_PX);
  }
}
