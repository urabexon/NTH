import type { OrbitalCamera } from '@/camera/OrbitalCamera';
import { WIDE_DOLLY_DISTANCE } from '@/core/config';
import type { Rotor4D } from '@/core/Rotor4D';
import type { PolytopeManager } from '@/geometry/PolytopeManager';
import type { Pipeline } from '@/post/Pipeline';

import type { Binding } from './Keybinds';

export interface PanelLike {
  visible: boolean;
}

export interface BindingTargets {
  readonly polytopes: PolytopeManager;
  readonly rotor: Rotor4D;
  readonly orbit: OrbitalCamera;
  readonly pipeline: Pipeline;
  readonly panel: PanelLike;
  readonly random: () => number;
}

export function createBindings(targets: BindingTargets): Binding[] {
  const { polytopes, rotor, orbit, pipeline, panel, random } = targets;
  const { deform, composite } = pipeline;
  let mirrorSide: 'mirror-left' | 'mirror-right' = random() < 0.5 ? 'mirror-left' : 'mirror-right';

  return [
    {
      code: 'Space',
      key: 'Space',
      label: 'Next',
      mode: 'trigger',
      onPress: () => {
        polytopes.showRandom();
      },
    },
    {
      code: 'KeyA',
      key: 'A',
      label: 'Wave',
      mode: 'trigger',
      onPress: () => {
        deform.triggerTurbulence();
      },
    },
    {
      code: 'KeyS',
      key: 'S',
      label: 'Rot',
      mode: 'trigger',
      onPress: () => {
        rotor.reseed();
        orbit.reseed();
      },
    },
    {
      code: 'KeyR',
      key: 'R',
      label: 'Line',
      mode: 'toggle',
      onPress: (active) => {
        deform.slitScanEnabled = active;
      },
    },
    {
      code: 'KeyT',
      key: 'T',
      label: 'WH',
      mode: 'toggle',
      onPress: (active) => {
        orbit.isMagnified = active;
        deform.lensEnabled = active;
      },
    },
    {
      code: 'KeyQ',
      key: 'Q',
      label: 'Reset',
      mode: 'trigger',
      onPress: () => {
        deform.effect = 'none';
      },
    },
    {
      code: 'KeyW',
      key: 'W',
      label: 'Rep',
      mode: 'trigger',
      onPress: () => {
        deform.effect = deform.effect === 'repeat' ? 'none' : 'repeat';
      },
    },
    {
      code: 'KeyE',
      key: 'E',
      label: 'Sym',
      mode: 'trigger',
      onPress: () => {
        if (deform.effect === mirrorSide) {
          mirrorSide = mirrorSide === 'mirror-left' ? 'mirror-right' : 'mirror-left';
        }
        deform.effect = mirrorSide;
      },
    },
    {
      code: 'KeyZ',
      key: 'Z',
      label: 'Inv',
      mode: 'toggle',
      onPress: (active) => {
        composite.isInverted = active;
      },
    },
    {
      code: 'KeyH',
      key: 'H',
      label: 'Panel',
      mode: 'toggle',
      onPress: (active) => {
        panel.visible = active;
      },
    },
    {
      code: 'ShiftLeft',
      key: 'Shift',
      label: 'Wide',
      mode: 'hold',
      onPress: () => {
        orbit.dollyDistance = WIDE_DOLLY_DISTANCE;
      },
      onRelease: () => {
        orbit.dollyDistance = 0;
      },
    },
  ];
}
