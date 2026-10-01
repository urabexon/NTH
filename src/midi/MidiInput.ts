export interface ControlChange {
  readonly channel: number;
  readonly cc: number;
  readonly value: number;
}

export type MidiStatus = 'unsupported' | 'denied' | 'waiting' | 'connected';

export interface MidiInputState {
  readonly status: MidiStatus;
  readonly inputs: readonly string[];
}

type Listener = (message: ControlChange) => void;
type StateListener = (state: MidiInputState) => void;

const CONTROL_CHANGE = 0xb0;

export class MidiInput {
  private access: MIDIAccess | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly stateListeners = new Set<StateListener>();
  private state: MidiInputState = { status: 'waiting', inputs: [] };

  get current(): MidiInputState {
    return this.state;
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  async connect(
    request: (() => Promise<MIDIAccess>) | undefined = browserRequest(),
  ): Promise<void> {
    if (!request) {
      this.setState({ status: 'unsupported', inputs: [] });
      return;
    }
    try {
      this.access = await request();
    } catch {
      this.setState({ status: 'denied', inputs: [] });
      return;
    }
    this.access.onstatechange = () => {
      this.attachAll();
    };
    this.attachAll();
  }

  dispose(): void {
    if (this.access) {
      this.access.onstatechange = null;
      for (const input of this.access.inputs.values()) input.onmidimessage = null;
    }
    this.access = null;
    this.listeners.clear();
    this.stateListeners.clear();
  }

  private attachAll(): void {
    if (!this.access) return;
    const names: string[] = [];
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = this.handleMessage;
      names.push(input.name ?? input.id);
    }
    this.setState({ status: names.length > 0 ? 'connected' : 'waiting', inputs: names });
  }

  private readonly handleMessage = (event: MIDIMessageEvent): void => {
    const data = event.data;
    if (!data || data.length < 3) return;
    const status = data[0] ?? 0;
    if ((status & 0xf0) !== CONTROL_CHANGE) return;
    const message: ControlChange = {
      channel: status & 0x0f,
      cc: data[1] ?? 0,
      value: data[2] ?? 0,
    };
    for (const listener of this.listeners) listener(message);
  };

  private setState(state: MidiInputState): void {
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }
}

function browserRequest(): (() => Promise<MIDIAccess>) | undefined {
  const api = (navigator as Partial<Navigator>).requestMIDIAccess;
  return typeof api === 'function' ? () => api.call(navigator) : undefined;
}
