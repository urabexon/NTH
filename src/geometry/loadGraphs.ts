import { Graph } from './Graph';
import type { PolytopeGraphData, Vec4 } from './types';

export const GRAPHS_URL = '/data/graphs.json';

export type GraphSet = ReadonlyMap<string, Graph>;

export async function loadGraphs(url: string = GRAPHS_URL): Promise<GraphSet> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${String(response.status)} ${response.statusText}`);
  }
  return parseGraphs(await response.json());
}

export function parseGraphs(raw: unknown): GraphSet {
  if (!isRecord(raw)) {
    throw new Error('graphs.json must be an object keyed by slug');
  }
  const graphs = new Map<string, Graph>();
  for (const [slug, entry] of Object.entries(raw)) {
    graphs.set(slug, new Graph(toGraphData(slug, entry)));
  }
  return graphs;
}

function toGraphData(slug: string, entry: unknown): PolytopeGraphData {
  if (!isRecord(entry)) throw new Error(`${slug}: entry is not an object`);
  const { name, vertices, faces } = entry;
  if (typeof name !== 'string') throw new Error(`${slug}: missing name`);
  if (!Array.isArray(vertices) || !vertices.every(isVec4)) {
    throw new Error(`${slug}: vertices must be [x, y, z, w] arrays`);
  }
  if (!Array.isArray(faces) || !faces.every((face) => isIndexList(face, vertices.length))) {
    throw new Error(`${slug}: faces must be index lists within the vertex range`);
  }
  return { name, vertices, faces };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVec4(value: unknown): value is Vec4 {
  return Array.isArray(value) && value.length === 4 && value.every(Number.isFinite);
}

function isIndexList(value: unknown, vertexCount: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.every((i) => Number.isInteger(i) && i >= 0 && i < vertexCount)
  );
}
