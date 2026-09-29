import { BufferAttribute, BufferGeometry, Mesh, NormalBlending } from 'three';
import { attribute } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import type { Projector4D } from '@/core/Projector4D';
import { thickEdgeVertex } from '@/shaders/thickEdge';

import { buildEdgeSegments } from './edgeSegments';
import type { EdgeStyle } from './EdgeStyle';
import type { Graph } from './Graph';
import type { Rgb } from './vertexColors';

export interface PolytopeEdgesOptions {
  readonly projector: Projector4D;
  readonly style: EdgeStyle;
  readonly colors: readonly Rgb[];
  readonly subdivision: number;
}

export class PolytopeEdges extends Mesh<BufferGeometry, MeshBasicNodeMaterial> {
  constructor(graph: Graph, options: PolytopeEdgesOptions) {
    const segments = buildEdgeSegments(
      graph.vertices,
      options.colors,
      graph.edges,
      options.subdivision,
    );

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(segments.positionA, 3));
    geometry.setAttribute('positionA', new BufferAttribute(segments.positionA, 3));
    geometry.setAttribute('positionAW', new BufferAttribute(segments.positionAW, 1));
    geometry.setAttribute('positionB', new BufferAttribute(segments.positionB, 3));
    geometry.setAttribute('positionBW', new BufferAttribute(segments.positionBW, 1));
    geometry.setAttribute('corner', new BufferAttribute(segments.corner, 2));
    geometry.setAttribute('color', new BufferAttribute(segments.color, 3));
    geometry.setIndex(new BufferAttribute(segments.index, 1));

    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    material.vertexNode = thickEdgeVertex({
      matrix4d: options.projector.matrixNode,
      distance: options.projector.distanceNode,
      widthPx: options.style.widthNode,
    });
    material.colorNode = attribute('color', 'vec3');

    super(geometry, material);
    this.frustumCulled = false;
    this.name = `${graph.name} edges`;
  }

  override dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
