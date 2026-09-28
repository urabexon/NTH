import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'data', 'polytopes');
const OUTPUT_FILE = join(ROOT, 'public', 'data', 'graphs.json');
const DECIMALS = 6;

interface ManifestEntry {
  slug: string;
  name: string;
}

interface PolytopeSource {
  vertices: number[][];
  faces: number[][];
}

interface PolytopeGraph extends PolytopeSource {
  name: string;
}

function round(value: number): number {
  return Number(value.toFixed(DECIMALS));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validate(slug: string, source: PolytopeSource): void {
  const vertexCount = source.vertices.length;
  for (const [i, vertex] of source.vertices.entries()) {
    if (vertex.length !== 4) {
      throw new Error(
        `${slug}: vertex ${String(i)} has ${String(vertex.length)} components, expected 4`,
      );
    }
  }
  for (const [i, face] of source.faces.entries()) {
    if (face.length < 3) {
      throw new Error(`${slug}: face ${String(i)} has fewer than 3 vertices`);
    }
    for (const index of face) {
      if (!Number.isInteger(index) || index < 0 || index >= vertexCount) {
        throw new Error(
          `${slug}: face ${String(i)} references vertex ${String(index)} out of range`,
        );
      }
    }
  }
}

function build(): void {
  const manifest = readJson(join(SOURCE_DIR, 'manifest.json')) as ManifestEntry[];
  const graphs: Record<string, PolytopeGraph> = {};

  for (const { slug, name } of manifest) {
    const source = readJson(join(SOURCE_DIR, `${slug}.json`)) as PolytopeSource;
    validate(slug, source);
    graphs[slug] = {
      name,
      vertices: source.vertices.map((v) => v.map(round)),
      faces: source.faces,
    };
  }

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  const json = JSON.stringify(graphs);
  writeFileSync(OUTPUT_FILE, json);

  const kb = (Buffer.byteLength(json) / 1024).toFixed(0);
  console.info(
    `[build-data] wrote ${String(manifest.length)} polytopes to public/data/graphs.json (${kb} kB)`,
  );
}

build();
