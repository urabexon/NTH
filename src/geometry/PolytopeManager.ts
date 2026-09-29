import { Group } from 'three';

import type { Projector4D } from '@/core/Projector4D';
import { createRandom, type Random } from '@/core/random';

import type { GraphSet } from './loadGraphs';
import { PolytopeMesh } from './PolytopeMesh';
import { subdivisionLevelFor } from './subdivisionLevels';

export interface PolytopeManagerOptions {
  readonly projector: Projector4D;
  readonly seed?: number;
  readonly colorSeed?: number;
  readonly subdivisionFor?: (slug: string) => number;
}

export type ProgressCallback = (built: number, total: number) => void;

export class PolytopeManager extends Group {
  readonly slugs: readonly string[];

  private readonly graphs: GraphSet;
  private readonly projector: Projector4D;
  private readonly random: Random;
  private readonly colorSeed: number;
  private readonly subdivisionFor: (slug: string) => number;
  private readonly meshes = new Map<string, PolytopeMesh>();
  private currentSlug: string | null = null;

  constructor(graphs: GraphSet, options: PolytopeManagerOptions) {
    super();
    this.graphs = graphs;
    this.slugs = [...graphs.keys()];
    this.projector = options.projector;
    this.random = createRandom(options.seed ?? 1);
    this.colorSeed = options.colorSeed ?? 1;
    this.subdivisionFor = options.subdivisionFor ?? subdivisionLevelFor;
  }

  get current(): string | null {
    return this.currentSlug;
  }

  get currentMesh(): PolytopeMesh | null {
    return this.currentSlug === null ? null : (this.meshes.get(this.currentSlug) ?? null);
  }

  async build(onProgress?: ProgressCallback, yieldBetween?: () => Promise<void>): Promise<void> {
    let built = 0;
    for (const [slug, graph] of this.graphs) {
      const mesh = new PolytopeMesh(graph, {
        projector: this.projector,
        subdivision: this.subdivisionFor(slug),
        colorSeed: this.colorSeed + built,
      });
      mesh.visible = false;
      this.meshes.set(slug, mesh);
      this.add(mesh);
      built++;
      onProgress?.(built, this.slugs.length);
      if (yieldBetween) await yieldBetween();
    }
  }

  show(slug: string): void {
    const mesh = this.meshes.get(slug);
    if (!mesh) throw new Error(`Unknown polytope: ${slug}`);
    for (const other of this.meshes.values()) other.visible = false;
    mesh.visible = true;
    this.currentSlug = slug;
  }

  showRandom(): string {
    const candidates = this.slugs.filter((slug) => slug !== this.currentSlug);
    const pick = candidates[Math.floor(this.random() * candidates.length)];
    if (pick === undefined) throw new Error('No polytopes to choose from');
    this.show(pick);
    return pick;
  }

  setAllVisible(visible: boolean): void {
    for (const mesh of this.meshes.values()) mesh.visible = visible;
    if (!visible && this.currentSlug !== null) this.show(this.currentSlug);
  }

  override dispose(): void {
    for (const mesh of this.meshes.values()) mesh.dispose();
    this.meshes.clear();
    this.clear();
  }
}
