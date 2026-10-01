import { Group } from 'three';

import {
  HOPF_EDGE_WIDTH_PX,
  HOPF_FIBERS_DEFAULT,
  HOPF_MAX_FIBERS,
  HOPF_SAMPLES_PER_FIBER,
} from '@/core/config';
import { clamp } from '@/core/easing';
import type { Projector4D } from '@/core/Projector4D';

import { EdgeStyle } from './EdgeStyle';
import type { Edge } from './Graph';
import { baseColor, hopfFiber, latitudeRings } from './hopf';
import { PolytopeEdges } from './PolytopeEdges';
import type { Vec4 } from './schema';
import type { Rgb } from './vertexColors';

const INDICES_PER_SEGMENT = 6;

export interface HopfFibrationOptions {
  readonly projector: Projector4D;
  readonly maxFibers?: number;
  readonly samples?: number;
}

export class HopfFibration extends Group {
  readonly style = new EdgeStyle();
  readonly maxFibers: number;
  readonly edges: PolytopeEdges;

  private shown = HOPF_FIBERS_DEFAULT;

  constructor(options: HopfFibrationOptions) {
    super();
    this.name = 'Hopf fibration';
    this.maxFibers = options.maxFibers ?? HOPF_MAX_FIBERS;
    const samples = options.samples ?? HOPF_SAMPLES_PER_FIBER;
    this.style.widthPx = HOPF_EDGE_WIDTH_PX;

    const vertices: Vec4[] = [];
    const colors: Rgb[] = [];
    const edges: Edge[] = [];
    latitudeRings(this.maxFibers).forEach((base) => {
      const offset = vertices.length;
      const color = baseColor(base);
      for (const point of hopfFiber(base, samples)) {
        vertices.push(point);
        colors.push(color);
      }
      for (let i = 0; i < samples; i++) {
        edges.push([offset + i, offset + ((i + 1) % samples)]);
      }
    });

    this.edges = new PolytopeEdges(
      { name: this.name, vertices, edges },
      { projector: options.projector, style: this.style, colors, subdivision: 1, intensity: 0.8 },
    );
    this.add(this.edges);
    this.fiberCount = this.shown;
  }

  get fiberCount(): number {
    return this.shown;
  }

  set fiberCount(value: number) {
    this.shown = Math.round(clamp(value, 0, this.maxFibers));
    const samples = this.edges.geometry.getAttribute('side').count / (this.maxFibers * 4);
    this.edges.geometry.setDrawRange(0, this.shown * samples * INDICES_PER_SEGMENT);
    this.edges.visible = this.shown > 0;
  }

  override dispose(): void {
    this.edges.dispose();
  }
}
