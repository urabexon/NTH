import type { Edge } from './Graph';
import type { Vec4 } from './schema';
import type { Rgb } from './vertexColors';

export interface EdgeStripMesh {
  readonly positionPrev: Float32Array;
  readonly positionPrevW: Float32Array;
  readonly positionCurr: Float32Array;
  readonly positionCurrW: Float32Array;
  readonly positionNext: Float32Array;
  readonly positionNextW: Float32Array;
  readonly side: Float32Array;
  readonly color: Float32Array;
  readonly index: Uint32Array;
  readonly pointCount: number;
  readonly vertexCount: number;
  readonly triangleCount: number;
}

const SIDES: readonly number[] = [-1, 1];

export function buildEdgeStrips(
  vertices: readonly Vec4[],
  colors: readonly Rgb[],
  edges: readonly Edge[],
  level: number,
): EdgeStripMesh {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Edge subdivision level must be a positive integer, got ${String(level)}`);
  }

  const pointsPerEdge = level + 1;
  const pointCount = edges.length * pointsPerEdge;
  const vertexCount = pointCount * 2;
  const triangleCount = edges.length * level * 2;

  const positionPrev = new Float32Array(vertexCount * 3);
  const positionPrevW = new Float32Array(vertexCount);
  const positionCurr = new Float32Array(vertexCount * 3);
  const positionCurrW = new Float32Array(vertexCount);
  const positionNext = new Float32Array(vertexCount * 3);
  const positionNextW = new Float32Array(vertexCount);
  const side = new Float32Array(vertexCount);
  const color = new Float32Array(vertexCount * 3);
  const index = new Uint32Array(triangleCount * 3);

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

    const base = vertexCursor;
    for (let k = 0; k <= level; k++) {
      const tPrev = Math.max(0, k - 1) / level;
      const tCurr = k / level;
      const tNext = Math.min(level, k + 1) / level;

      for (const s of SIDES) {
        const v = vertexCursor;
        writeLerp4(positionPrev, positionPrevW, v, a, b, tPrev);
        writeLerp4(positionCurr, positionCurrW, v, a, b, tCurr);
        writeLerp4(positionNext, positionNextW, v, a, b, tNext);
        side[v] = s;
        color[v * 3] = lerp(ca[0], cb[0], tCurr);
        color[v * 3 + 1] = lerp(ca[1], cb[1], tCurr);
        color[v * 3 + 2] = lerp(ca[2], cb[2], tCurr);
        vertexCursor++;
      }
    }

    for (let k = 0; k < level; k++) {
      const v = base + k * 2;
      index[indexCursor++] = v;
      index[indexCursor++] = v + 2;
      index[indexCursor++] = v + 1;
      index[indexCursor++] = v + 1;
      index[indexCursor++] = v + 2;
      index[indexCursor++] = v + 3;
    }
  }

  return {
    positionPrev,
    positionPrevW,
    positionCurr,
    positionCurrW,
    positionNext,
    positionNextW,
    side,
    color,
    index,
    pointCount,
    vertexCount,
    triangleCount,
  };
}

function writeLerp4(
  xyz: Float32Array,
  w: Float32Array,
  vertex: number,
  a: Vec4,
  b: Vec4,
  t: number,
): void {
  xyz[vertex * 3] = lerp(a[0], b[0], t);
  xyz[vertex * 3 + 1] = lerp(a[1], b[1], t);
  xyz[vertex * 3 + 2] = lerp(a[2], b[2], t);
  w[vertex] = lerp(a[3], b[3], t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
