import type { OrbitalCamera } from '@/camera/OrbitalCamera';
import {
  BLOOM_STRENGTH_DEFAULT,
  BLOOM_STRENGTH_MAX,
  DOF_BOKEH_DEFAULT,
  DOF_BOKEH_MAX,
  DUST_DENSITY_DEFAULT,
  MOTION_BLUR_DEFAULT,
  MOTION_BLUR_MAX,
  EDGE_WIDTH_DEFAULT_PX,
  EDGE_WIDTH_MAX_PX,
  EDGE_WIDTH_MIN_PX,
  HOPF_FIBERS_DEFAULT,
  HOPF_MAX_FIBERS,
  LENS_RADIUS_DEFAULT_PX,
  LENS_RADIUS_MAX_PX,
  LENS_RADIUS_MIN_PX,
  POLYTOPE_SCALE_MAX,
  POLYTOPE_SCALE_MIN,
  PROJECTION_DISTANCE_DEFAULT,
  PROJECTION_DISTANCE_MAX,
  PROJECTION_DISTANCE_MIN,
  ROTATION_SPEED_MAX,
  TRAIL_DAMP_DEFAULT,
  TRAIL_DAMP_MAX,
} from '@/core/config';
import type { Projector4D } from '@/core/Projector4D';
import type { Rotor4D } from '@/core/Rotor4D';
import type { HopfFibration } from '@/geometry/HopfFibration';
import type { DustParticles } from '@/particles/DustParticles';
import type { PolytopeManager } from '@/geometry/PolytopeManager';
import type { Pipeline } from '@/post/Pipeline';

import { EasedValue } from './EasedValue';

export interface ParameterTargets {
  readonly projector: Projector4D;
  readonly rotor: Rotor4D;
  readonly polytopes: PolytopeManager;
  readonly pipeline: Pipeline;
  readonly orbit: OrbitalCamera;
  readonly hopf: HopfFibration;
  readonly dust: DustParticles | null;
}

export const PARAMETER_KEYS = [
  'distance',
  'rotationSpeed',
  'scale',
  'lensRadius',
  'bloomStrength',
  'edgeWidth',
  'trails',
  'fibers',
  'motionBlur',
  'dof',
  'dust',
] as const;
export type ParameterKey = (typeof PARAMETER_KEYS)[number];

export function distanceFromSlider(slider: number): number {
  const t = Math.pow(slider, 3);
  return PROJECTION_DISTANCE_MIN + (PROJECTION_DISTANCE_MAX - PROJECTION_DISTANCE_MIN) * t;
}

export function sliderFromDistance(distance: number): number {
  const t =
    (distance - PROJECTION_DISTANCE_MIN) / (PROJECTION_DISTANCE_MAX - PROJECTION_DISTANCE_MIN);
  return Math.cbrt(Math.min(1, Math.max(0, t)));
}

export class Parameters {
  readonly values: Readonly<Record<ParameterKey, EasedValue>>;

  constructor(private readonly targets: ParameterTargets) {
    this.values = {
      distance: new EasedValue(sliderFromDistance(PROJECTION_DISTANCE_DEFAULT), 0, 1),
      rotationSpeed: new EasedValue(1 / ROTATION_SPEED_MAX, 0, 1),
      scale: new EasedValue(1, POLYTOPE_SCALE_MIN, POLYTOPE_SCALE_MAX),
      lensRadius: new EasedValue(LENS_RADIUS_DEFAULT_PX, LENS_RADIUS_MIN_PX, LENS_RADIUS_MAX_PX),
      bloomStrength: new EasedValue(BLOOM_STRENGTH_DEFAULT, 0, BLOOM_STRENGTH_MAX),
      edgeWidth: new EasedValue(EDGE_WIDTH_DEFAULT_PX, EDGE_WIDTH_MIN_PX, EDGE_WIDTH_MAX_PX),
      trails: new EasedValue(TRAIL_DAMP_DEFAULT, 0, TRAIL_DAMP_MAX),
      fibers: new EasedValue(HOPF_FIBERS_DEFAULT, 0, HOPF_MAX_FIBERS),
      motionBlur: new EasedValue(MOTION_BLUR_DEFAULT, 0, MOTION_BLUR_MAX),
      dof: new EasedValue(DOF_BOKEH_DEFAULT, 0, DOF_BOKEH_MAX),
      dust: new EasedValue(DUST_DENSITY_DEFAULT, 0, 1),
    };
    this.applyAll();
  }

  set(key: ParameterKey, target: number): void {
    this.values[key].target = target;
  }

  jumpTo(key: ParameterKey, value: number): void {
    this.values[key].jumpTo(value);
    this.apply(key);
  }

  update(dt: number): void {
    for (const key of PARAMETER_KEYS) {
      if (this.values[key].update(dt)) this.apply(key);
    }
  }

  private applyAll(): void {
    for (const key of PARAMETER_KEYS) this.apply(key);
  }

  private apply(key: ParameterKey): void {
    const value = this.values[key].value;
    const { projector, rotor, polytopes, pipeline, hopf, dust } = this.targets;
    switch (key) {
      case 'distance':
        projector.distance = distanceFromSlider(value);
        break;
      case 'rotationSpeed':
        rotor.speedMultiplier = value * ROTATION_SPEED_MAX;
        break;
      case 'scale':
        polytopes.scale.setScalar(value);
        break;
      case 'lensRadius':
        pipeline.deform.lensRadiusPx = value;
        break;
      case 'bloomStrength':
        pipeline.bloomStrength = value;
        break;
      case 'edgeWidth':
        polytopes.edgeStyle.widthPx = value;
        break;
      case 'trails':
        pipeline.trailDamp = value;
        break;
      case 'fibers':
        hopf.fiberCount = value;
        break;
      case 'motionBlur':
        pipeline.motionBlur = value;
        break;
      case 'dof':
        pipeline.bokeh = value;
        break;
      case 'dust':
        if (dust) dust.density = value;
        break;
    }
  }
}
