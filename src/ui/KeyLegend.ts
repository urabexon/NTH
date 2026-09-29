import { LEGEND_HIDE_DELAY } from '@/core/config';

import type { Binding, Keybinds } from './Keybinds';

export class KeyLegend {
  readonly element: HTMLElement;

  private readonly items = new Map<string, HTMLElement>();
  private hideTimer: number | null = null;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly keybinds: Keybinds,
    parent: HTMLElement,
    private readonly hideDelay: number = LEGEND_HIDE_DELAY,
  ) {
    this.element = document.createElement('nav');
    this.element.className = 'legend';
    this.element.setAttribute('aria-label', 'Key bindings');

    for (const binding of keybinds.bindings) {
      const item = this.createItem(binding);
      this.items.set(binding.code, item);
      this.element.append(item);
    }
    parent.append(this.element);

    this.unsubscribe = keybinds.onChange((binding, active) => {
      this.items.get(binding.code)?.classList.toggle('is-active', active);
    });
    parent.addEventListener('pointermove', this.reveal);
    this.reveal();
  }

  get isVisible(): boolean {
    return !this.element.classList.contains('is-hidden');
  }

  dispose(): void {
    this.unsubscribe();
    this.element.parentElement?.removeEventListener('pointermove', this.reveal);
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.element.remove();
  }

  private readonly reveal = (): void => {
    this.element.classList.remove('is-hidden');
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.element.classList.add('is-hidden');
      this.hideTimer = null;
    }, this.hideDelay * 1000);
  };

  private createItem(binding: Binding): HTMLElement {
    const item = document.createElement('div');
    item.className = `legend-item mode-${binding.mode}`;
    item.dataset.code = binding.code;
    if (this.keybinds.isActive(binding.code)) item.classList.add('is-active');

    const key = document.createElement('kbd');
    key.textContent = binding.key;
    const label = document.createElement('span');
    label.textContent = binding.label;
    item.append(key, label);
    return item;
  }
}
