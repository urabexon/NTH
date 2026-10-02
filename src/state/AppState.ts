import type { OrbitalCamera } from '@/camera/OrbitalCamera';
import type { PolytopeManager } from '@/geometry/PolytopeManager';
import type { Pipeline } from '@/post/Pipeline';
import type { Keybinds } from '@/ui/Keybinds';
import { PARAMETER_KEYS, type Parameters } from '@/ui/Parameters';

import type { Snapshot } from './schema';

export interface AppStateTargets {
  readonly parameters: Parameters;
  readonly polytopes: PolytopeManager;
  readonly pipeline: Pipeline;
  readonly orbit: OrbitalCamera;
  readonly keybinds: Keybinds;
  readonly particles: { visible: boolean } | null;
}

const TOGGLE_CODES = { slitScan: 'KeyR', magnify: 'KeyT', invert: 'KeyZ' } as const;

export class AppState {
  constructor(private readonly targets: AppStateTargets) {}

  capture(): Snapshot {
    const { parameters, polytopes, pipeline, orbit, particles } = this.targets;
    const params = Object.fromEntries(
      PARAMETER_KEYS.map((key) => [key, round(parameters.values[key].target)]),
    ) as Snapshot['params'];
    return {
      v: 1,
      polytope: polytopes.current ?? undefined,
      params,
      effect: pipeline.deform.effect,
      slitScan: pipeline.deform.slitScanEnabled,
      magnify: orbit.isMagnified,
      invert: pipeline.composite.isInverted,
      faces: polytopes.facesVisible,
      particles: particles?.visible ?? false,
    };
  }

  apply(snapshot: Snapshot, options: { immediate?: boolean } = {}): void {
    const { parameters, polytopes, pipeline, keybinds, particles } = this.targets;
    for (const key of PARAMETER_KEYS) {
      const value = snapshot.params[key];
      if (value === undefined) continue;
      if (options.immediate) parameters.jumpTo(key, value);
      else parameters.set(key, value);
    }
    if (snapshot.polytope && polytopes.slugs.includes(snapshot.polytope)) {
      polytopes.show(snapshot.polytope);
    }
    pipeline.deform.effect = snapshot.effect;
    for (const [field, code] of Object.entries(TOGGLE_CODES) as [
      keyof typeof TOGGLE_CODES,
      string,
    ][]) {
      if (keybinds.isActive(code) !== snapshot[field]) keybinds.press(code);
    }
    polytopes.facesVisible = snapshot.faces;
    if (particles) particles.visible = snapshot.particles;
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
