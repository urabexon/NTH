import type { Triangle } from './Graph';
import type { Vec4 } from './schema';
import type { Rgb } from './vertexColors';

export interface SubdividedMesh {
  readonly position: Float32Array;
  readonly positionW: Float32Array;
  readonly color: Float32Array;
  readonly index: Uint32Array;
  readonly vertexCount: number;
  readonly triangleCount: number;
}

export function verticesPerTriangle(level: number): number {
  return ((level + 1) * (level + 2)) / 2;
}

export function trianglesPerTriangle(level: number): number {
  return level * level;
}

export function subdivide(
  vertices: readonly Vec4[],
  colors: readonly Rgb[],
  triangles: readonly Triangle[],
  level: number,
): SubdividedMesh {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Subdivision level must be a positive integer, got ${String(level)}`);
  }

  const vertexCount = triangles.length * verticesPerTriangle(level);
  const triangleCount = triangles.length * trianglesPerTriangle(level);

  const position = new Float32Array(vertexCount * 3);
  const positionW = new Float32Array(vertexCount);
  const color = new Float32Array(vertexCount * 3);
  const index = new Uint32Array(triangleCount * 3);

  let vertexCursor = 0;
  let indexCursor = 0;

  for (const [ia, ib, ic] of triangles) {
    const offset = vertexCursor;
    const [a, b, c] = [vertices[ia], vertices[ib], vertices[ic]];
    const [ca, cb, cc] = [colors[ia], colors[ib], colors[ic]];
    if (!a || !b || !c || !ca || !cb || !cc) {
      throw new Error(`Triangle references a missing vertex: ${String([ia, ib, ic])}`);
    }

    for (let row = 0; row <= level; row++) {
      for (let column = 0; column <= row; column++) {
        const tb = (row - column) / level;
        const tc = column / level;
        const ta = 1 - tb - tc;

        position[vertexCursor * 3] = ta * a[0] + tb * b[0] + tc * c[0];
        position[vertexCursor * 3 + 1] = ta * a[1] + tb * b[1] + tc * c[1];
        position[vertexCursor * 3 + 2] = ta * a[2] + tb * b[2] + tc * c[2];
        positionW[vertexCursor] = ta * a[3] + tb * b[3] + tc * c[3];

        color[vertexCursor * 3] = ta * ca[0] + tb * cb[0] + tc * cc[0];
        color[vertexCursor * 3 + 1] = ta * ca[1] + tb * cb[1] + tc * cc[1];
        color[vertexCursor * 3 + 2] = ta * ca[2] + tb * cb[2] + tc * cc[2];
        vertexCursor++;
      }
    }

    for (let row = 0; row < level; row++) {
      for (let column = 0; column <= row; column++) {
        const here = offset + rowStart(row) + column;
        const below = offset + rowStart(row + 1) + column;

        index[indexCursor++] = here;
        index[indexCursor++] = below;
        index[indexCursor++] = below + 1;

        if (column < row) {
          index[indexCursor++] = below + 1;
          index[indexCursor++] = here + 1;
          index[indexCursor++] = here;
        }
      }
    }
  }

  return { position, positionW, color, index, vertexCount, triangleCount };
}

function rowStart(row: number): number {
  return (row * (row + 1)) / 2;
}
