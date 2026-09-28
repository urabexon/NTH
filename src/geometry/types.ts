export type Vec4 = readonly [x: number, y: number, z: number, w: number];

export type Triangle = readonly [a: number, b: number, c: number];

export type Edge = readonly [a: number, b: number];

export interface PolytopeGraphData {
  readonly name: string;
  readonly vertices: readonly Vec4[];
  readonly faces: readonly (readonly number[])[];
}
