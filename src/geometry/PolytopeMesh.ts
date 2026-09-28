import { BufferAttribute, BufferGeometry, DoubleSide, Mesh } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import type { Projector4D } from '@/core/Projector4D';
import { stereographicProjection } from '@/shaders/stereographicProjection';

import type { Graph } from './Graph';
import { subdivide } from './subdivide';
import { generateVertexColors } from './vertexColors';

export interface PolytopeMeshOptions {
  readonly projector: Projector4D;
  readonly subdivision: number;
  readonly colorSeed: number;
}

export class PolytopeMesh extends Mesh<BufferGeometry, MeshBasicNodeMaterial> {
  readonly graph: Graph;

  constructor(graph: Graph, options: PolytopeMeshOptions) {
    const colors = generateVertexColors(graph.vertices.length, options.colorSeed);
    const mesh = subdivide(graph.vertices, colors, graph.triangles, options.subdivision);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(mesh.position, 3));
    geometry.setAttribute('positionW', new BufferAttribute(mesh.positionW, 1));
    geometry.setAttribute('color', new BufferAttribute(mesh.color, 3));
    geometry.setIndex(new BufferAttribute(mesh.index, 1));

    const material = new MeshBasicNodeMaterial({
      vertexColors: true,
      wireframe: true,
      side: DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    material.positionNode = stereographicProjection(
      options.projector.matrixNode,
      options.projector.distanceNode,
    );

    super(geometry, material);
    this.graph = graph;
    this.name = graph.name;
  }

  override dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
