import { describe, expect, test, vi } from 'vitest';

import { Keybinds, type Binding } from '@/ui/Keybinds';

function press(target: EventTarget, code: string, repeat = false): void {
  target.dispatchEvent(Object.assign(new Event('keydown'), { code, repeat }));
}

function release(target: EventTarget, code: string): void {
  target.dispatchEvent(Object.assign(new Event('keyup'), { code }));
}

function setup(mode: Binding['mode']) {
  const target = new EventTarget();
  const onPress = vi.fn();
  const onRelease = vi.fn();
  const binding: Binding = { code: 'KeyX', key: 'X', label: 'Test', mode, onPress, onRelease };
  const keybinds = new Keybinds([binding], target);
  return { target, keybinds, onPress, onRelease };
}

describe('Keybinds', () => {
  test('trigger fires on every press and never stays active', () => {
    const { target, keybinds, onPress } = setup('trigger');
    press(target, 'KeyX');
    press(target, 'KeyX');
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(keybinds.isActive('KeyX')).toBe(false);
  });

  test('toggle flips on each press and reports the new state', () => {
    const { target, keybinds, onPress } = setup('toggle');
    press(target, 'KeyX');
    expect(keybinds.isActive('KeyX')).toBe(true);
    expect(onPress).toHaveBeenLastCalledWith(true);
    press(target, 'KeyX');
    expect(keybinds.isActive('KeyX')).toBe(false);
    expect(onPress).toHaveBeenLastCalledWith(false);
  });

  test('hold is active between keydown and keyup and fires release once', () => {
    const { target, keybinds, onPress, onRelease } = setup('hold');
    press(target, 'KeyX');
    press(target, 'KeyX');
    expect(keybinds.isActive('KeyX')).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(1);
    release(target, 'KeyX');
    expect(keybinds.isActive('KeyX')).toBe(false);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  test('ignores auto-repeat and unknown keys', () => {
    const { target, onPress } = setup('trigger');
    press(target, 'KeyX', true);
    press(target, 'KeyY');
    expect(onPress).not.toHaveBeenCalled();
  });

  test('press() and release() drive bindings without DOM events', () => {
    const { keybinds, onPress, onRelease } = setup('hold');
    keybinds.press('KeyX');
    expect(keybinds.isActive('KeyX')).toBe(true);
    keybinds.release('KeyX');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
    keybinds.press('Nope');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('notifies listeners and stops after dispose', () => {
    const { target, keybinds, onPress } = setup('toggle');
    const listener = vi.fn();
    keybinds.onChange(listener);
    press(target, 'KeyX');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ code: 'KeyX' }), true);
    keybinds.dispose();
    press(target, 'KeyX');
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
