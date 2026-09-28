import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as z from 'zod/mini';

import { polytopeSourceSchema, type GraphsFile } from '../src/geometry/schema.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'data', 'polytopes');
const OUTPUT_FILE = join(ROOT, 'public', 'data', 'graphs.json');
const DECIMALS = 6;

const manifestSchema = z.array(
  z.object({
    slug: z.string().check(z.regex(/^[a-z0-9-]+$/)),
    name: z.string().check(z.minLength(1)),
  }),
);

function round(value: number): number {
  return Number(value.toFixed(DECIMALS));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function build(): void {
  const manifest = manifestSchema.parse(readJson(join(SOURCE_DIR, 'manifest.json')));
  const graphs: GraphsFile = {};

  for (const { slug, name } of manifest) {
    const source = polytopeSourceSchema.parse(readJson(join(SOURCE_DIR, `${slug}.json`)));
    graphs[slug] = {
      name,
      vertices: source.vertices.map(([x, y, z, w]) => [round(x), round(y), round(z), round(w)]),
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
