import type { Parameters } from '@/ui/Parameters';

import type { ControlChange } from './MidiInput';
import type { MidiControl, MidiMapping } from './schema';

export interface KeyTarget {
  press(code: string): void;
  release(code: string): void;
}

const BUTTON_THRESHOLD = 64;
const MAX_VALUE = 127;

export class MidiController {
  private readonly byCc = new Map<number, MidiControl>();
  private readonly pressed = new Set<number>();

  constructor(
    readonly mapping: MidiMapping,
    private readonly parameters: Parameters,
    private readonly keys: KeyTarget,
  ) {
    for (const control of mapping.controls) this.byCc.set(control.cc, control);
  }

  handle(message: ControlChange): boolean {
    if (message.channel !== this.mapping.channel) return false;
    const control = this.byCc.get(message.cc);
    if (!control) return false;

    if (control.type === 'parameter') {
      this.parameters.setNormalized(control.parameter, message.value / MAX_VALUE);
      return true;
    }

    const down = message.value >= BUTTON_THRESHOLD;
    const wasDown = this.pressed.has(message.cc);
    if (down && !wasDown) {
      this.pressed.add(message.cc);
      this.keys.press(control.code);
    } else if (!down && wasDown) {
      this.pressed.delete(message.cc);
      this.keys.release(control.code);
    }
    return true;
  }
}
