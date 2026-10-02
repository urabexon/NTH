import type { ControlPanel, PanelPresets, PanelStats, PanelToggles } from './ControlPanel';
import type { PanelLike } from './createBindings';
import type { Parameters } from './Parameters';

export class LazyControlPanel implements PanelLike {
  private panel: ControlPanel | null = null;
  private loading: Promise<ControlPanel> | null = null;
  private wantVisible = false;

  constructor(
    private readonly parameters: Parameters,
    private readonly container: HTMLElement,
    private readonly toggles: PanelToggles,
    private readonly onToggle: (key: keyof PanelToggles, value: boolean) => void,
    private readonly stats: PanelStats,
    private readonly presets: PanelPresets,
  ) {}

  get visible(): boolean {
    return this.wantVisible;
  }

  set visible(value: boolean) {
    this.wantVisible = value;
    if (this.panel) {
      this.panel.visible = value;
      return;
    }
    if (value) void this.load();
  }

  async load(): Promise<ControlPanel> {
    if (this.panel) return this.panel;
    this.loading ??= import('./ControlPanel').then(({ ControlPanel }) => {
      const panel = new ControlPanel(
        this.parameters,
        this.container,
        this.toggles,
        this.onToggle,
        this.stats,
        this.presets,
      );
      panel.visible = this.wantVisible;
      this.panel = panel;
      return panel;
    });
    return this.loading;
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
  }
}
