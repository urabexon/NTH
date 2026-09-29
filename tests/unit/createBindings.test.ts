import { describe, expect, test, vi } from 'vitest';

import { WIDE_DOLLY_DISTANCE } from '@/core/config';
import { createBindings, type BindingTargets } from '@/ui/createBindings';
import { Keybinds } from '@/ui/Keybinds';

function stubTargets(random = () => 0.1) {
  const deform = {
    effect: 'none',
    slitScanEnabled: false,
    lensEnabled: false,
    triggerTurbulence: vi.fn(),
  };
  const composite = { isInverted: false };
  const targets = {
    polytopes: { showRandom: vi.fn(() => 'pentatope') },
    rotor: { reseed: vi.fn() },
    orbit: { reseed: vi.fn(), isMagnified: false, dollyDistance: 0 },
    pipeline: { deform, composite },
    random,
  };
  return { targets, deform, composite };
}

function attach(random?: () => number) {
  const target = new EventTarget();
  const stubs = stubTargets(random);
  const keybinds = new Keybinds(createBindings(stubs.targets as unknown as BindingTargets), target);
  const press = (code: string) =>
    target.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  const release = (code: string) =>
    target.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  return { ...stubs, keybinds, press, release };
}

describe('createBindings', () => {
  test('covers the documented keys', () => {
    const { keybinds } = attach();
    expect(keybinds.bindings.map((b) => b.key)).toEqual([
      'Space',
      'A',
      'S',
      'R',
      'T',
      'Q',
      'W',
      'E',
      'Z',
      'Shift',
    ]);
  });

  test('Space, A and S call their targets', () => {
    const { targets, deform, press } = attach();
    press('Space');
    press('KeyA');
    press('KeyS');
    expect(targets.polytopes.showRandom).toHaveBeenCalledTimes(1);
    expect(deform.triggerTurbulence).toHaveBeenCalledTimes(1);
    expect(targets.rotor.reseed).toHaveBeenCalledTimes(1);
    expect(targets.orbit.reseed).toHaveBeenCalledTimes(1);
  });

  test('R, T and Z toggle their flags', () => {
    const { targets, deform, composite, press } = attach();
    press('KeyR');
    press('KeyT');
    press('KeyZ');
    expect(deform.slitScanEnabled).toBe(true);
    expect(targets.orbit.isMagnified).toBe(true);
    expect(deform.lensEnabled).toBe(true);
    expect(composite.isInverted).toBe(true);
    press('KeyR');
    press('KeyT');
    press('KeyZ');
    expect(deform.slitScanEnabled).toBe(false);
    expect(targets.orbit.isMagnified).toBe(false);
    expect(composite.isInverted).toBe(false);
  });

  test('W toggles repeat, E alternates mirror sides, Q resets', () => {
    const { deform, press } = attach(() => 0.1);
    press('KeyW');
    expect(deform.effect).toBe('repeat');
    press('KeyW');
    expect(deform.effect).toBe('none');
    press('KeyE');
    expect(deform.effect).toBe('mirror-left');
    press('KeyE');
    expect(deform.effect).toBe('mirror-right');
    press('KeyE');
    expect(deform.effect).toBe('mirror-left');
    press('KeyQ');
    expect(deform.effect).toBe('none');
  });

  test('E starts on the right when the random draw says so', () => {
    const { deform, press } = attach(() => 0.9);
    press('KeyE');
    expect(deform.effect).toBe('mirror-right');
  });

  test('Shift dollies out while held and back on release', () => {
    const { targets, press, release } = attach();
    press('ShiftLeft');
    expect(targets.orbit.dollyDistance).toBe(WIDE_DOLLY_DISTANCE);
    release('ShiftLeft');
    expect(targets.orbit.dollyDistance).toBe(0);
  });
});
