export type BindingMode = 'trigger' | 'toggle' | 'hold';

export interface Binding {
  readonly code: string;
  readonly key: string;
  readonly label: string;
  readonly mode: BindingMode;
  readonly hidden?: boolean;
  readonly onPress: (active: boolean) => void;
  readonly onRelease?: () => void;
}

export type BindingListener = (binding: Binding, active: boolean) => void;

interface KeyEventLike {
  readonly code: string;
  readonly repeat?: boolean;
  readonly target?: EventTarget | null;
  preventDefault?: () => void;
}

export class Keybinds {
  private readonly byCode = new Map<string, Binding>();
  private readonly active = new Set<string>();
  private readonly listeners = new Set<BindingListener>();

  constructor(
    readonly bindings: readonly Binding[],
    private readonly target: EventTarget,
  ) {
    for (const binding of bindings) this.byCode.set(binding.code, binding);
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  isActive(code: string): boolean {
    return this.active.has(code);
  }

  onChange(listener: BindingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.listeners.clear();
  }

  press(code: string): void {
    const binding = this.byCode.get(code);
    if (binding) this.activate(binding);
  }

  release(code: string): void {
    const binding = this.byCode.get(code);
    if (binding) this.deactivate(binding);
  }

  private readonly onKeyDown = (event: Event): void => {
    const key = event as unknown as KeyEventLike;
    if (key.repeat === true || isTextInput(key.target)) return;
    const binding = this.byCode.get(key.code);
    if (!binding) return;
    key.preventDefault?.();
    this.activate(binding);
  };

  private readonly onKeyUp = (event: Event): void => {
    const key = event as unknown as KeyEventLike;
    const binding = this.byCode.get(key.code);
    if (binding?.mode !== 'hold') return;
    this.deactivate(binding);
  };

  private activate(binding: Binding): void {
    if (binding.mode === 'toggle') {
      const next = !this.active.has(binding.code);
      binding.onPress(next);
      this.setActive(binding, next);
      return;
    }
    if (binding.mode === 'hold' && this.active.has(binding.code)) return;
    binding.onPress(true);
    this.setActive(binding, true);
    if (binding.mode === 'trigger') this.setActive(binding, false);
  }

  private deactivate(binding: Binding): void {
    if (binding.mode !== 'hold') return;
    binding.onRelease?.();
    this.setActive(binding, false);
  }

  private setActive(binding: Binding, active: boolean): void {
    if (active) this.active.add(binding.code);
    else this.active.delete(binding.code);
    for (const listener of this.listeners) listener(binding, active);
  }
}

function isTextInput(target: EventTarget | null | undefined): boolean {
  if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}
