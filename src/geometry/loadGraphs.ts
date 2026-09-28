import { Graph } from './Graph';
import { graphsFileSchema } from './schema';

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
  const file = graphsFileSchema.parse(raw);
  return new Map(Object.entries(file).map(([slug, data]) => [slug, new Graph(data)]));
}
