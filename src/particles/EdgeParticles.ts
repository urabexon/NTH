import { AdditiveBlending, Color, Vector4 } from 'three';
import {
  floor,
  Fn,
  fract,
  hash,
  If,
  instancedArray,
  instanceIndex,
  length,
  mix,
  mrt,
  output,
  smoothstep,
  uniform,
  uv,
  vec4,
} from 'three/tsl';
import { Sprite, SpriteNodeMaterial, type ComputeNode, type WebGPURenderer } from 'three/webgpu';

import {
  PARTICLE_COLOR,
  PARTICLE_COUNT,
  PARTICLE_OPACITY,
  PARTICLE_SIZE,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
} from '@/core/config';
import { previousDistanceNode, previousMatrix4dNode } from '@/core/motion';
import type { Projector4D } from '@/core/Projector4D';
import { clipNow, clipPrevious, screenVelocity } from '@/shaders/screenVelocity';
import type { Graph } from '@/geometry/Graph';
import { projectPoint4D } from '@/shaders/stereographicProjection';

export interface EdgeParticlesOptions {
  readonly projector: Projector4D;
  readonly maxEdges: number;
  readonly count?: number;
  readonly color?: number;
}

export class EdgeParticles extends Sprite {
  readonly particleCount: number;
  readonly maxEdges: number;

  private readonly edgeA;
  private readonly edgeB;
  private readonly state;
  private readonly edgeCount = uniform(1, 'uint');
  private readonly dt = uniform(0);
  private readonly frame = uniform(0, 'uint');
  private readonly size = uniform(PARTICLE_SIZE);
  private readonly computeInit: ComputeNode;
  private readonly computeUpdate: ComputeNode;
  private needsInit = true;

  constructor(options: EdgeParticlesOptions) {
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    super(material);

    this.particleCount = options.count ?? PARTICLE_COUNT;
    this.maxEdges = Math.max(1, options.maxEdges);
    this.count = this.particleCount;
    this.frustumCulled = false;

    this.edgeA = instancedArray(this.maxEdges, 'vec4');
    this.edgeB = instancedArray(this.maxEdges, 'vec4');
    this.state = instancedArray(this.particleCount, 'vec4');

    const { edgeA, edgeB, state, edgeCount, dt, frame, size } = this;

    this.computeInit = Fn(() => {
      const seed = instanceIndex.toFloat();
      const edge = floor(hash(seed).mul(edgeCount.toFloat()));
      const progress = hash(seed.add(1000));
      const speed = mix(PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX, hash(seed.add(2000)));
      state.element(instanceIndex).assign(vec4(edge, progress, speed, 0));
    })().compute(this.particleCount);

    this.computeUpdate = Fn(() => {
      const current = state.element(instanceIndex).toVar();
      const progress = current.y.add(current.z.mul(dt)).toVar();
      const edge = current.x.toVar();
      If(progress.greaterThanEqual(1), () => {
        progress.assign(fract(progress));
        const seed = instanceIndex.toFloat().add(frame.toFloat().mul(0.618));
        edge.assign(floor(hash(seed).mul(edgeCount.toFloat())));
      });
      state.element(instanceIndex).assign(vec4(edge, progress, current.z, current.w));
    })().compute(this.particleCount);

    const particle = state.element(instanceIndex);
    const edgeIndex = particle.x.toUint();
    const point = mix(edgeA.element(edgeIndex), edgeB.element(edgeIndex), particle.y);
    const projected = projectPoint4D(
      point,
      options.projector.matrixNode,
      options.projector.distanceNode,
    );
    const projectedPrevious = projectPoint4D(point, previousMatrix4dNode, previousDistanceNode);
    material.positionNode = projected;
    material.mrtNode = mrt({
      output,
      velocity: screenVelocity(clipNow(projected), clipPrevious(projectedPrevious)),
    });
    material.scaleNode = size;
    material.colorNode = uniform(new Color(options.color ?? PARTICLE_COLOR));
    material.opacityNode = smoothstep(0.5, 0.1, length(uv().sub(0.5))).mul(PARTICLE_OPACITY);
  }

  get sizeWorld(): number {
    return this.size.value;
  }

  set sizeWorld(value: number) {
    this.size.value = Math.max(0, value);
  }

  setGraph(graph: Graph): void {
    const edges = graph.edges.slice(0, this.maxEdges);
    const a = this.edgeA.value.array as Float32Array;
    const b = this.edgeB.value.array as Float32Array;
    const scratch = new Vector4();
    edges.forEach(([ia, ib], i) => {
      const va = graph.vertices[ia];
      const vb = graph.vertices[ib];
      if (!va || !vb) throw new Error(`Edge references a missing vertex: ${String([ia, ib])}`);
      scratch.set(...va).toArray(a, i * 4);
      scratch.set(...vb).toArray(b, i * 4);
    });
    this.edgeA.value.needsUpdate = true;
    this.edgeB.value.needsUpdate = true;
    this.edgeCount.value = Math.max(1, edges.length);
    this.needsInit = true;
  }

  get activeEdgeCount(): number {
    return this.edgeCount.value;
  }

  readEdge(index: number): { a: number[]; b: number[] } {
    const a = this.edgeA.value.array as Float32Array;
    const b = this.edgeB.value.array as Float32Array;
    return {
      a: Array.from(a.subarray(index * 4, index * 4 + 4)),
      b: Array.from(b.subarray(index * 4, index * 4 + 4)),
    };
  }

  update(renderer: WebGPURenderer, dt: number): void {
    if (!this.visible) return;
    if (this.needsInit) {
      void renderer.compute(this.computeInit);
      this.needsInit = false;
    }
    this.dt.value = dt;
    this.frame.value = (this.frame.value + 1) % 1_000_000;
    void renderer.compute(this.computeUpdate);
  }

  override dispose(): void {
    (this.material as SpriteNodeMaterial).dispose();
  }
}
