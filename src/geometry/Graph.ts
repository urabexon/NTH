import type { Edge, PolytopeGraphData, Triangle, Vec4 } from './types';

export class Graph {
  readonly name: string;
  readonly vertices: readonly Vec4[];
  readonly polygons: readonly (readonly number[])[];
  readonly triangles: readonly Triangle[];
  readonly edges: readonly Edge[];

  constructor(data: PolytopeGraphData) {
    this.name = data.name;
    this.vertices = data.vertices;
    this.polygons = data.faces;
    this.triangles = data.faces.flatMap(fanTriangulate);
    this.edges = collectEdges(data.faces);
  }
}

export function fanTriangulate(polygon: readonly number[]): Triangle[] {
  const [first, second, ...rest] = polygon;
  if (first === undefined || second === undefined || rest.length === 0) {
    throw new Error(`Cannot triangulate a face with ${String(polygon.length)} vertices`);
  }
  const triangles: Triangle[] = [];
  let previous = second;
  for (const current of rest) {
    triangles.push([first, previous, current]);
    previous = current;
  }
  return triangles;
}

export function collectEdges(polygons: readonly (readonly number[])[]): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];

  const add = (a: number, b: number): void => {
    const edge: Edge = a < b ? [a, b] : [b, a];
    const key = `${String(edge[0])}:${String(edge[1])}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };

  for (const polygon of polygons) {
    const [first, ...rest] = polygon;
    if (first === undefined) continue;
    let previous = first;
    for (const current of rest) {
      add(previous, current);
      previous = current;
    }
    add(previous, first);
  }
  return edges;
}
