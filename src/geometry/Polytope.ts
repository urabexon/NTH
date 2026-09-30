import { Group } from 'three';

import type { Projector4D } from '@/core/Projector4D';

import type { EdgeStyle } from './EdgeStyle';
import type { Graph } from './Graph';
import { PolytopeEdges } from './PolytopeEdges';
import { PolytopeMesh } from './PolytopeMesh';
import { generateVertexColors } from './vertexColors';

export interface PolytopeOptions {
  readonly projector: Projector4D;
  readonly style: EdgeStyle;
  readonly subdivision: number;
  readonly colorSeed: number;
}

export class Polytope extends Group {
  readonly graph: Graph;
  readonly edges: PolytopeEdges;
  readonly faces: PolytopeMesh;

  constructor(graph: Graph, options: PolytopeOptions) {
    super();
    this.graph = graph;
    this.name = graph.name;
    const colors = generateVertexColors(graph.vertices.length, options.colorSeed);
    this.edges = new PolytopeEdges(graph, {
      projector: options.projector,
      style: options.style,
      colors,
      subdivision: options.subdivision,
    });
    this.faces = new PolytopeMesh(graph, {
      projector: options.projector,
      subdivision: options.subdivision,
      colors,
    });
    this.add(this.edges, this.faces);
  }

  override dispose(): void {
    this.edges.dispose();
    this.faces.dispose();
  }
}
