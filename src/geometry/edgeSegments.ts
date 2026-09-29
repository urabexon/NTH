import type { Edge } from './Graph';
import type { Vec4 } from './schema';
import type { Rgb } from './vertexColors';

export interface EdgeSegmentMesh {
  readonly positionA: Float32Array;
  readonly positionAW: Float32Array;
  readonly positionB: Float32Array;
  readonly positionBW: Float32Array;
  readonly corner: Float32Array;
  readonly color: Float32Array;
  readonly index: Uint32Array;
  readonly segmentCount: number;
  readonly vertexCount: number;
}

const VERTICES_PER_SEGMENT = 4;
const INDICES_PER_SEGMENT = 6;
const CORNERS: readonly (readonly [end: number, side: number])[] = [
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 1],
];

export function buildEdgeSegments(
  vertices: readonly Vec4[],
  colors: readonly Rgb[],
  edges: readonly Edge[],
  level: number,
): EdgeSegmentMesh {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Edge subdivision level must be a positive integer, got ${String(level)}`);
  }

  const segmentCount = edges.length * level;
  const vertexCount = segmentCount * VERTICES_PER_SEGMENT;

  const positionA = new Float32Array(vertexCount * 3);
  const positionAW = new Float32Array(vertexCount);
  const positionB = new Float32Array(vertexCount * 3);
  const positionBW = new Float32Array(vertexCount);
  const corner = new Float32Array(vertexCount * 2);
  const color = new Float32Array(vertexCount * 3);
  const index = new Uint32Array(segmentCount * INDICES_PER_SEGMENT);

  let vertexCursor = 0;
  let indexCursor = 0;

  for (const [ia, ib] of edges) {
    const a = vertices[ia];
    const b = vertices[ib];
    const ca = colors[ia];
    const cb = colors[ib];
    if (!a || !b || !ca || !cb) {
      throw new Error(`Edge references a missing vertex: ${String([ia, ib])}`);
    }

    for (let step = 0; step < level; step++) {
      const t0 = step / level;
      const t1 = (step + 1) / level;
      const base = vertexCursor;

      for (const [end, side] of CORNERS) {
        const t = end === 0 ? t0 : t1;
        const v = vertexCursor;
        positionA[v * 3] = lerp(a[0], b[0], t0);
        positionA[v * 3 + 1] = lerp(a[1], b[1], t0);
        positionA[v * 3 + 2] = lerp(a[2], b[2], t0);
        positionAW[v] = lerp(a[3], b[3], t0);
        positionB[v * 3] = lerp(a[0], b[0], t1);
        positionB[v * 3 + 1] = lerp(a[1], b[1], t1);
        positionB[v * 3 + 2] = lerp(a[2], b[2], t1);
        positionBW[v] = lerp(a[3], b[3], t1);
        corner[v * 2] = end;
        corner[v * 2 + 1] = side;
        color[v * 3] = lerp(ca[0], cb[0], t);
        color[v * 3 + 1] = lerp(ca[1], cb[1], t);
        color[v * 3 + 2] = lerp(ca[2], cb[2], t);
        vertexCursor++;
      }

      index[indexCursor++] = base;
      index[indexCursor++] = base + 2;
      index[indexCursor++] = base + 1;
      index[indexCursor++] = base + 1;
      index[indexCursor++] = base + 2;
      index[indexCursor++] = base + 3;
    }
  }

  return {
    positionA,
    positionAW,
    positionB,
    positionBW,
    corner,
    color,
    index,
    segmentCount,
    vertexCount,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
