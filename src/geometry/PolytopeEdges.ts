import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  MaxEquation,
  Mesh,
  OneFactor,
} from 'three';
import { attribute, mrt, output } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import type { Projector4D } from '@/core/Projector4D';
import { neonEdge, neonIntensityFor } from '@/shaders/neonEdge';
import { thickEdgeVertex } from '@/shaders/thickEdge';

import { buildEdgeStrips } from './edgeStrips';
import type { EdgeStyle } from './EdgeStyle';
import type { Edge } from './Graph';
import type { Vec4 } from './schema';
import type { Rgb } from './vertexColors';

export interface EdgeSource {
  readonly name: string;
  readonly vertices: readonly Vec4[];
  readonly edges: readonly Edge[];
}

export interface PolytopeEdgesOptions {
  readonly projector: Projector4D;
  readonly style: EdgeStyle;
  readonly colors: readonly Rgb[];
  readonly subdivision: number;
  readonly intensity?: number;
}

export class PolytopeEdges extends Mesh<BufferGeometry, MeshBasicNodeMaterial> {
  constructor(graph: EdgeSource, options: PolytopeEdgesOptions) {
    const strips = buildEdgeStrips(
      graph.vertices,
      options.colors,
      graph.edges,
      options.subdivision,
    );

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(strips.positionCurr, 3));
    geometry.setAttribute('positionPrev', new BufferAttribute(strips.positionPrev, 3));
    geometry.setAttribute('positionPrevW', new BufferAttribute(strips.positionPrevW, 1));
    geometry.setAttribute('positionCurr', new BufferAttribute(strips.positionCurr, 3));
    geometry.setAttribute('positionCurrW', new BufferAttribute(strips.positionCurrW, 1));
    geometry.setAttribute('positionNext', new BufferAttribute(strips.positionNext, 3));
    geometry.setAttribute('positionNextW', new BufferAttribute(strips.positionNextW, 1));
    geometry.setAttribute('side', new BufferAttribute(strips.side, 1));
    geometry.setAttribute('color', new BufferAttribute(strips.color, 3));
    geometry.setIndex(new BufferAttribute(strips.index, 1));

    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: false,
      blending: CustomBlending,
      blendEquation: MaxEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
    });
    const nodes = thickEdgeVertex({
      matrix4d: options.projector.matrixNode,
      distance: options.projector.distanceNode,
      widthPx: options.style.widthNode,
    });
    material.vertexNode = nodes.vertex;
    material.mrtNode = mrt({ output, velocity: nodes.velocity });
    const neon = neonEdge(
      attribute('color', 'vec3'),
      nodes.across,
      options.intensity ?? neonIntensityFor(graph.edges.length),
    );
    material.colorNode = neon.color.mul(neon.opacity);

    super(geometry, material);
    this.frustumCulled = false;
    this.name = `${graph.name} edges`;
  }

  override dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
