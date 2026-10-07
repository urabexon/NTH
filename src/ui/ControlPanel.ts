import { Pane } from 'tweakpane';

import {
  EDGE_WIDTH_MAX_PX,
  DOF_BOKEH_MAX,
  EDGE_WIDTH_MIN_PX,
  HOPF_MAX_FIBERS,
  MOTION_BLUR_MAX,
  LENS_RADIUS_MAX_PX,
  LENS_RADIUS_MIN_PX,
  POLYTOPE_SCALE_MAX,
  POLYTOPE_SCALE_MIN,
  RENDER_SCALE_MAX,
  RENDER_SCALE_MIN,
  TRAIL_DAMP_MAX,
} from '@/core/config';

import { PARAMETER_KEYS, type ParameterKey, type Parameters } from './Parameters';

interface SliderSpec {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

const SLIDERS: Readonly<Record<ParameterKey, SliderSpec>> = {
  distance: { label: 'distance', min: 0, max: 1, step: 0.001 },
  rotationSpeed: { label: 'rotation', min: 0, max: 1, step: 0.001 },
  scale: { label: 'scale', min: POLYTOPE_SCALE_MIN, max: POLYTOPE_SCALE_MAX, step: 0.01 },
  lensRadius: { label: 'lens radius', min: LENS_RADIUS_MIN_PX, max: LENS_RADIUS_MAX_PX, step: 1 },
  bloomStrength: { label: 'bloom', min: 0, max: 1, step: 0.001 },
  edgeWidth: { label: 'edge width', min: EDGE_WIDTH_MIN_PX, max: EDGE_WIDTH_MAX_PX, step: 0.1 },
  trails: { label: 'trails', min: 0, max: TRAIL_DAMP_MAX, step: 0.001 },
  fibers: { label: 'fibers', min: 0, max: HOPF_MAX_FIBERS, step: 1 },
  motionBlur: { label: 'motion blur', min: 0, max: MOTION_BLUR_MAX, step: 0.01 },
  dof: { label: 'depth of field', min: 0, max: DOF_BOKEH_MAX, step: 0.01 },
  dust: { label: 'dust', min: 0, max: 1, step: 0.01 },
  audioSensitivity: { label: 'audio sens.', min: 0, max: 1, step: 0.01 },
  audioSmoothing: { label: 'audio smooth', min: 0, max: 1, step: 0.01 },
  renderScale: { label: 'render scale', min: RENDER_SCALE_MIN, max: RENDER_SCALE_MAX, step: 0.05 },
};

export interface PanelStats {
  fps: number;
  cpuMs: number;
  gpuMs: number;
  drawCalls: number;
  triangles: number;
  vramMb: number;
}

export interface PanelPresets {
  slot: number;
  link: string;
  save(slot: number): void;
  recall(slot: number): void;
  share(): string;
}

export interface PanelToggles {
  faces: boolean;
  particles: boolean;
  audio: boolean;
}

export class ControlPanel {
  readonly element: HTMLElement;

  private readonly pane: Pane;
  private readonly model: Record<ParameterKey, number>;

  constructor(
    private readonly parameters: Parameters,
    container: HTMLElement,
    toggles: PanelToggles,
    onToggle: (key: keyof PanelToggles, value: boolean) => void,
    stats: PanelStats,
    presets: PanelPresets,
  ) {
    this.pane = new Pane({ container, title: 'NTH' });
    this.element = this.pane.element;
    this.element.classList.add('control-panel');
    this.pane.addBinding(stats, 'fps', { readonly: true, format: (v: number) => v.toFixed(0) });
    const perf = this.pane.addFolder({ title: 'perf', expanded: false });
    perf.addBinding(stats, 'cpuMs', {
      readonly: true,
      label: 'cpu ms',
      format: (v: number) => v.toFixed(2),
    });
    perf.addBinding(stats, 'gpuMs', {
      readonly: true,
      label: 'gpu ms',
      format: (v: number) => v.toFixed(2),
    });
    perf.addBinding(stats, 'drawCalls', {
      readonly: true,
      label: 'draw calls',
      format: (v: number) => v.toFixed(0),
    });
    perf.addBinding(stats, 'triangles', {
      readonly: true,
      label: 'triangles',
      format: (v: number) => v.toFixed(0),
    });
    perf.addBinding(stats, 'vramMb', {
      readonly: true,
      label: 'vram MB',
      format: (v: number) => v.toFixed(1),
    });
    this.addPresetControls(presets);

    this.model = Object.fromEntries(
      PARAMETER_KEYS.map((key) => [key, parameters.values[key].target]),
    ) as Record<ParameterKey, number>;

    for (const key of PARAMETER_KEYS) {
      const spec = SLIDERS[key];
      this.pane
        .addBinding(this.model, key, {
          label: spec.label,
          min: spec.min,
          max: spec.max,
          step: spec.step,
        })
        .on('change', (event) => {
          parameters.set(key, event.value);
        });
    }
    for (const key of ['faces', 'particles', 'audio'] as const) {
      this.pane.addBinding(toggles, key, { label: key }).on('change', (event) => {
        onToggle(key, event.value);
      });
    }
    this.visible = false;
  }

  private addPresetControls(presets: PanelPresets): void {
    const folder = this.pane.addFolder({ title: 'presets', expanded: false });
    folder.addBinding(presets, 'slot', { label: 'slot', min: 1, max: 9, step: 1 });
    folder.addButton({ title: 'save' }).on('click', () => {
      presets.save(presets.slot);
    });
    folder.addButton({ title: 'recall' }).on('click', () => {
      presets.recall(presets.slot);
      this.sync();
    });
    const link = folder.addBinding(presets, 'link', { label: 'link', readonly: true });
    folder.addButton({ title: 'copy link' }).on('click', () => {
      presets.link = presets.share();
      link.refresh();
      void navigator.clipboard.writeText(presets.link).catch(() => undefined);
    });
  }

  get visible(): boolean {
    return !this.pane.hidden;
  }

  set visible(value: boolean) {
    this.pane.hidden = !value;
    this.element.dataset.visible = String(value);
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  sync(): void {
    for (const key of PARAMETER_KEYS) this.model[key] = this.parameters.values[key].target;
    this.pane.refresh();
  }

  dispose(): void {
    this.pane.dispose();
  }
}
