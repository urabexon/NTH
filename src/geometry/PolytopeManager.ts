import { Group } from 'three';

import type { Projector4D } from '@/core/Projector4D';
import { createRandom, type Random } from '@/core/random';

import type { GraphSet } from './loadGraphs';
import { EdgeStyle } from './EdgeStyle';
import { Polytope } from './Polytope';
import { subdivisionLevelFor } from './subdivisionLevels';

export interface PolytopeManagerOptions {
  readonly projector: Projector4D;
  readonly seed?: number;
  readonly colorSeed?: number;
  readonly subdivisionFor?: (slug: string) => number;
}

export type ProgressCallback = (built: number, total: number) => void;
export type ChangeListener = (slug: string, polytope: Polytope) => void;

export class PolytopeManager extends Group {
  readonly slugs: readonly string[];

  private readonly graphs: GraphSet;
  private readonly projector: Projector4D;
  private readonly random: Random;
  private readonly colorSeed: number;
  private readonly subdivisionFor: (slug: string) => number;
  readonly edgeStyle = new EdgeStyle();

  private readonly meshes = new Map<string, Polytope>();
  private facesShown = true;
  private currentSlug: string | null = null;
  private readonly listeners = new Set<ChangeListener>();

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

  get facesVisible(): boolean {
    return this.facesShown;
  }

  set facesVisible(value: boolean) {
    this.facesShown = value;
    for (const polytope of this.meshes.values()) polytope.faces.visible = value;
  }

  get currentMesh(): Polytope | null {
    return this.currentSlug === null ? null : (this.meshes.get(this.currentSlug) ?? null);
  }

  async build(onProgress?: ProgressCallback, yieldBetween?: () => Promise<void>): Promise<void> {
    let built = 0;
    for (const [slug, graph] of this.graphs) {
      const mesh = new Polytope(graph, {
        projector: this.projector,
        style: this.edgeStyle,
        subdivision: this.subdivisionFor(slug),
        colorSeed: this.colorSeed + built,
      });
      mesh.faces.visible = this.facesShown;
      mesh.visible = false;
      this.meshes.set(slug, mesh);
      this.add(mesh);
      built++;
      onProgress?.(built, this.slugs.length);
      if (yieldBetween) await yieldBetween();
    }
  }

  get maxEdgeCount(): number {
    let max = 0;
    for (const graph of this.graphs.values()) max = Math.max(max, graph.edges.length);
    return max;
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  show(slug: string): void {
    const mesh = this.meshes.get(slug);
    if (!mesh) throw new Error(`Unknown polytope: ${slug}`);
    for (const other of this.meshes.values()) other.visible = false;
    mesh.visible = true;
    const changed = this.currentSlug !== slug;
    this.currentSlug = slug;
    if (changed) for (const listener of this.listeners) listener(slug, mesh);
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
