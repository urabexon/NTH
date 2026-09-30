import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, NormalBlending } from 'three';
import { mrt, output } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import type { Projector4D } from '@/core/Projector4D';
import { previousDistanceNode, previousMatrix4dNode } from '@/core/motion';
import { clipNow, clipPrevious, screenVelocity } from '@/shaders/screenVelocity';
import { glassOpacity } from '@/shaders/glassSurface';
import { stereographicProjection } from '@/shaders/stereographicProjection';

import type { Graph } from './Graph';
import { subdivide } from './subdivide';
import type { Rgb } from './vertexColors';

export interface PolytopeMeshOptions {
  readonly projector: Projector4D;
  readonly subdivision: number;
  readonly colors: readonly Rgb[];
}

export class PolytopeMesh extends Mesh<BufferGeometry, MeshBasicNodeMaterial> {
  readonly graph: Graph;

  constructor(graph: Graph, options: PolytopeMeshOptions) {
    const mesh = subdivide(graph.vertices, options.colors, graph.triangles, options.subdivision);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(mesh.position, 3));
    geometry.setAttribute('positionW', new BufferAttribute(mesh.positionW, 1));
    geometry.setAttribute('color', new BufferAttribute(mesh.color, 3));
    geometry.setIndex(new BufferAttribute(mesh.index, 1));

    const material = new MeshBasicNodeMaterial({
      vertexColors: true,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    material.opacityNode = glassOpacity(graph.triangles.length);
    const projected = stereographicProjection(
      options.projector.matrixNode,
      options.projector.distanceNode,
    );
    const projectedPrevious = stereographicProjection(previousMatrix4dNode, previousDistanceNode);
    material.positionNode = projected;
    material.mrtNode = mrt({
      output,
      velocity: screenVelocity(clipNow(projected), clipPrevious(projectedPrevious)),
    });

    super(geometry, material);
    this.graph = graph;
    this.name = graph.name;
  }

  override dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
