import { describe, expect, test, vi } from 'vitest';

import { MidiController } from '@/midi/MidiController';
import { MidiInput, type ControlChange } from '@/midi/MidiInput';
import nanokontrol2 from '@/midi/nanokontrol2.json';
import { midiMappingSchema } from '@/midi/schema';
import type { Parameters } from '@/ui/Parameters';

type MessageHandler = ((event: MIDIMessageEvent) => void) | null;

function fakeAccess(names: string[]) {
  const inputs = new Map(
    names.map((name, i) => [
      String(i),
      { id: String(i), name, onmidimessage: null as MessageHandler },
    ]),
  );
  const access = { inputs, onstatechange: null as (() => void) | null };
  return {
    access: access as unknown as MIDIAccess,
    send(id: string, bytes: number[]) {
      inputs.get(id)?.onmidimessage?.({ data: new Uint8Array(bytes) } as MIDIMessageEvent);
    },
    plug(name: string) {
      const id = String(inputs.size);
      inputs.set(id, { id, name, onmidimessage: null });
      access.onstatechange?.();
    },
  };
}

describe('MidiInput', () => {
  test('reports unsupported when the API is missing', async () => {
    const input = new MidiInput();
    await input.connect(undefined);
    expect(input.current.status).toBe('unsupported');
  });

  test('reports denied when access is refused', async () => {
    const input = new MidiInput();
    await input.connect(() => Promise.reject(new Error('nope')));
    expect(input.current.status).toBe('denied');
  });

  test('attaches to inputs, parses control changes and follows hot-plug', async () => {
    const fake = fakeAccess(['nanoKONTROL2']);
    const input = new MidiInput();
    const seen: ControlChange[] = [];
    input.onMessage((m) => seen.push(m));
    await input.connect(() => Promise.resolve(fake.access));
    expect(input.current).toEqual({ status: 'connected', inputs: ['nanoKONTROL2'] });

    fake.send('0', [0xb0, 7, 100]);
    fake.send('0', [0xb3, 1, 2]);
    fake.send('0', [0x90, 60, 127]);
    expect(seen).toEqual([
      { channel: 0, cc: 7, value: 100 },
      { channel: 3, cc: 1, value: 2 },
    ]);

    fake.plug('Launchpad');
    expect(input.current.inputs).toEqual(['nanoKONTROL2', 'Launchpad']);
    fake.send('1', [0xb0, 2, 3]);
    expect(seen).toHaveLength(3);
  });

  test('is waiting when access exists but no device is connected', async () => {
    const fake = fakeAccess([]);
    const input = new MidiInput();
    await input.connect(() => Promise.resolve(fake.access));
    expect(input.current.status).toBe('waiting');
  });
});

describe('nanoKONTROL2 mapping', () => {
  test('parses and has unique control-change numbers', () => {
    const mapping = midiMappingSchema.parse(nanokontrol2);
    const ccs = mapping.controls.map((c) => c.cc);
    expect(new Set(ccs).size).toBe(ccs.length);
    expect(mapping.channel).toBe(0);
  });

  test('rejects a control-change number outside 0..127', () => {
    expect(() =>
      midiMappingSchema.parse({ device: 'x', controls: [{ cc: 200, type: 'key', code: 'KeyA' }] }),
    ).toThrow();
  });
});

describe('MidiController', () => {
  function setup() {
    const parameters = { setNormalized: vi.fn() };
    const keys = { press: vi.fn(), release: vi.fn() };
    const controller = new MidiController(
      midiMappingSchema.parse(nanokontrol2),
      parameters as unknown as Parameters,
      keys,
    );
    return { controller, parameters, keys };
  }

  test('maps faders to normalized parameter values', () => {
    const { controller, parameters } = setup();
    expect(controller.handle({ channel: 0, cc: 0, value: 127 })).toBe(true);
    expect(parameters.setNormalized).toHaveBeenCalledWith('distance', 1);
    controller.handle({ channel: 0, cc: 4, value: 0 });
    expect(parameters.setNormalized).toHaveBeenLastCalledWith('bloomStrength', 0);
  });

  test('buttons press on the rising edge and release on the falling edge', () => {
    const { controller, keys } = setup();
    controller.handle({ channel: 0, cc: 41, value: 127 });
    controller.handle({ channel: 0, cc: 41, value: 127 });
    expect(keys.press).toHaveBeenCalledTimes(1);
    expect(keys.press).toHaveBeenCalledWith('Space');
    controller.handle({ channel: 0, cc: 41, value: 0 });
    expect(keys.release).toHaveBeenCalledWith('Space');
    controller.handle({ channel: 0, cc: 41, value: 0 });
    expect(keys.release).toHaveBeenCalledTimes(1);
  });

  test('ignores other channels and unmapped controls', () => {
    const { controller, parameters, keys } = setup();
    expect(controller.handle({ channel: 1, cc: 0, value: 127 })).toBe(false);
    expect(controller.handle({ channel: 0, cc: 99, value: 127 })).toBe(false);
    expect(parameters.setNormalized).not.toHaveBeenCalled();
    expect(keys.press).not.toHaveBeenCalled();
  });
});
