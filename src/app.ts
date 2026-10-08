import { Color, Scene, Vector3 } from 'three';

import { AudioInput } from './audio/AudioInput';
import { AudioReactor } from './audio/AudioReactor';
import { OrbitalCamera } from './camera/OrbitalCamera';
import { Projector4D } from './core/Projector4D';
import {
  CLEAR_COLOR,
  DUST_DENSITY_DEFAULT,
  EDGE_WIDTH_DEFAULT_PX,
  HIDPI_THRESHOLD,
  RENDER_SCALE_HIDPI_DEFAULT,
  TRAIL_DAMP_DEFAULT,
} from './core/config';
import { FpsMeter } from './core/FpsMeter';
import { PerfMeter } from './core/PerfMeter';
import { captureMotion } from './core/motion';
import { defaultRenderScale } from './core/screen';
import { createRenderer } from './core/renderer';
import { Rotor4D } from './core/Rotor4D';
import { Ticker } from './core/Ticker';
import { Viewport } from './core/Viewport';
import { loadGraphs } from './geometry/loadGraphs';
import { HopfFibration } from './geometry/HopfFibration';
import { PolytopeManager } from './geometry/PolytopeManager';
import { EFFECT_KINDS, type EffectKind } from './post/DeformEffect';
import { DustParticles } from './particles/DustParticles';
import { EdgeParticles } from './particles/EdgeParticles';
import { MidiController } from './midi/MidiController';
import { MidiInput } from './midi/MidiInput';
import nanokontrol2 from './midi/nanokontrol2.json';
import { midiMappingSchema } from './midi/schema';
import { Pipeline } from './post/Pipeline';
import { AppState } from './state/AppState';
import { shareUrl, snapshotFromSearch } from './state/encode';
import { PresetStore } from './state/PresetStore';
import { createBindings } from './ui/createBindings';
import { Keybinds } from './ui/Keybinds';
import { KeyLegend } from './ui/KeyLegend';
import { LazyControlPanel } from './ui/LazyControlPanel';
import { Parameters, sliderFromDistance } from './ui/Parameters';

export async function bootstrap(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#stage');
  if (!canvas) {
    throw new Error('Canvas element #stage was not found');
  }

  const params = new URLSearchParams(window.location.search);
  const { renderer, backend } = await createRenderer(canvas, {
    forceWebGL: params.has('webgl'),
  });
  console.info(`[nth] renderer backend: ${backend}`);
  document.documentElement.dataset.backend = backend;

  const graphs = await loadGraphs();
  console.info(`[nth] loaded ${String(graphs.size)} polytopes`);

  const rotor = new Rotor4D({ seed: readNumber(params, 'seed') ?? Date.now() });
  const projector = new Projector4D(rotor.matrix, readNumber(params, 'd'));

  const scene = new Scene();
  scene.background = new Color(CLEAR_COLOR);
  const polytopes = new PolytopeManager(graphs, {
    projector,
    seed: readNumber(params, 'seed') ?? Date.now(),
  });
  polytopes.scale.setScalar(readNumber(params, 'scale') ?? 1);
  scene.add(polytopes);

  const orbit = new OrbitalCamera({ seed: readNumber(params, 'seed') ?? Date.now() });
  orbit.dollyDistance = readNumber(params, 'dolly') ?? 0;
  orbit.isMagnified = params.has('magnify');
  scene.add(orbit);

  const viewport = new Viewport(renderer);
  const pipeline = new Pipeline(renderer, scene, orbit.camera, {
    bloomEnabled: params.get('bloom') !== '0',
  });
  pipeline.bloomStrength = readNumber(params, 'bloom') ?? pipeline.bloomStrength;
  pipeline.bloomRadius = readNumber(params, 'bloomRadius') ?? pipeline.bloomRadius;
  pipeline.bloomThreshold = readNumber(params, 'bloomThreshold') ?? pipeline.bloomThreshold;
  const effect = params.get('effect');
  if (effect !== null && isEffectKind(effect)) pipeline.deform.effect = effect;
  pipeline.deform.slitScanEnabled = params.has('slitscan');
  pipeline.deform.lensEnabled = params.has('lens');
  if (params.has('turbulence'))
    pipeline.deform.triggerTurbulence(readNumber(params, 'turbulence') ?? 1);
  pipeline.composite.aberrationAmount =
    readNumber(params, 'aberration') ?? pipeline.composite.aberrationAmount;
  pipeline.composite.isInverted = params.has('invert');
  pipeline.composite.vignetteStrength =
    readNumber(params, 'vignette') ?? pipeline.composite.vignetteStrength;
  pipeline.composite.grainAmount = readNumber(params, 'grain') ?? pipeline.composite.grainAmount;

  await polytopes.build((built, total) => {
    document.documentElement.dataset.progress = String(built / total);
  }, nextFrame);
  const requested = params.get('polytope');
  if (requested !== null && polytopes.slugs.includes(requested)) {
    polytopes.show(requested);
  } else {
    polytopes.show('hypercube');
  }
  polytopes.setAllVisible(true);
  pipeline.render();
  polytopes.setAllVisible(false);
  document.documentElement.dataset.polytope = polytopes.current ?? '';
  document.documentElement.dataset.ready = 'true';

  const hopf = new HopfFibration({ projector });
  scene.add(hopf);
  const dust =
    backend === 'webgpu' && params.get('dust') !== '0' ? new DustParticles({ projector }) : null;
  if (dust) scene.add(dust);
  document.documentElement.dataset.dust = String(dust !== null);
  const audioInput = new AudioInput();
  const audioReactor = new AudioReactor(audioInput, {
    onOnset: () => {
      rotor.reseed();
      orbit.reseed();
    },
    setDistanceOffset: (offset) => {
      parameters.setOffset('distance', offset);
    },
  });
  const audioSource = params.get('audio') === 'test' ? 'test-tone' : 'microphone';
  const audio = {
    get enabled() {
      return audioInput.status === 'on' || audioInput.status === 'requesting';
    },
    set enabled(value: boolean) {
      if (value) void audioInput.start(audioSource);
      else {
        audioInput.stop();
        audioReactor.reset();
      }
    },
  };
  audioInput.onStatus((status) => {
    document.documentElement.dataset.audio = status;
  });
  const parameters = new Parameters({
    projector,
    rotor,
    polytopes,
    pipeline,
    orbit,
    hopf,
    dust,
    audio: audioReactor,
    viewport,
    initialRenderScale:
      readNumber(params, 'renderScale') ??
      defaultRenderScale(window.devicePixelRatio, HIDPI_THRESHOLD, RENDER_SCALE_HIDPI_DEFAULT),
  });
  document.documentElement.dataset.renderScale = String(viewport.renderScale);
  if (params.has('dust') && dust)
    parameters.jumpTo('dust', readNumber(params, 'dust') ?? DUST_DENSITY_DEFAULT);
  if (params.has('fibers')) parameters.jumpTo('fibers', readNumber(params, 'fibers') ?? 0);
  if (params.has('motionBlur'))
    parameters.jumpTo('motionBlur', readNumber(params, 'motionBlur') ?? 0);
  if (params.has('dof')) parameters.jumpTo('dof', readNumber(params, 'dof') ?? 0);
  if (params.has('rotationSpeed'))
    parameters.jumpTo('rotationSpeed', readNumber(params, 'rotationSpeed') ?? 0.5);
  if (params.has('d')) parameters.jumpTo('distance', sliderFromDistance(projector.distance));
  if (params.has('scale')) parameters.jumpTo('scale', polytopes.scale.x);
  if (params.has('bloom')) parameters.jumpTo('bloomStrength', pipeline.bloomStrength);
  if (params.has('trails'))
    parameters.jumpTo('trails', readNumber(params, 'trails') ?? TRAIL_DAMP_DEFAULT);
  if (params.has('edge'))
    parameters.jumpTo('edgeWidth', readNumber(params, 'edge') ?? EDGE_WIDTH_DEFAULT_PX);
  polytopes.facesVisible = params.get('faces') !== '0';
  const particles =
    backend === 'webgpu' && params.get('particles') !== '0'
      ? new EdgeParticles({ projector, maxEdges: polytopes.maxEdgeCount })
      : null;
  if (particles) {
    scene.add(particles);
    polytopes.onChange((_slug, polytope) => {
      particles.setGraph(polytope.graph);
    });
    const current = polytopes.currentMesh;
    if (current) particles.setGraph(current.graph);
  }
  document.documentElement.dataset.particles = String(particles !== null);
  const toggles = { faces: polytopes.facesVisible, particles: particles !== null, audio: false };
  const perfMeter = new PerfMeter(renderer, backend === 'webgpu');
  const stats = Object.assign(perfMeter.sample, { fps: 0 });
  const presetStore = new PresetStore(safeStorage());
  let appState: AppState | null = null;
  const presets = {
    slot: 1,
    link: '',
    save(slot: number) {
      if (appState) presetStore.save(slot, appState.capture());
    },
    recall(slot: number) {
      const preset = presetStore.get(slot);
      if (preset && appState) {
        appState.apply(preset.snapshot);
        document.documentElement.dataset.cue = String(slot);
      }
    },
    share() {
      return appState ? shareUrl(window.location.href, appState.capture()) : '';
    },
  };
  const panel = new LazyControlPanel(
    parameters,
    document.body,
    toggles,
    (key, value) => {
      if (key === 'faces') polytopes.facesVisible = value;
      if (key === 'particles' && particles) particles.visible = value;
      if (key === 'audio') audio.enabled = value;
    },
    stats,
    presets,
  );
  if (params.has('panel')) panel.visible = true;

  const keybinds = new Keybinds(
    createBindings({
      polytopes,
      rotor,
      orbit,
      pipeline,
      panel,
      audio,
      presets,
      random: Math.random,
    }),
    window,
  );
  const legend = new KeyLegend(keybinds, document.body);
  appState = new AppState({ parameters, polytopes, pipeline, orbit, keybinds, particles });
  const shared = snapshotFromSearch(window.location.search);
  if (shared) appState.apply(shared, { immediate: true });
  keybinds.onChange(() => {
    mirrorState(polytopes, pipeline, orbit);
  });
  if (params.has('audio')) {
    keybinds.press('KeyM');
    toggles.audio = true;
  }

  const midi = new MidiInput();
  const midiController = new MidiController(
    midiMappingSchema.parse(nanokontrol2),
    parameters,
    keybinds,
  );
  midi.onState((state) => {
    document.documentElement.dataset.midi = state.status;
    document.documentElement.dataset.midiInputs = state.inputs.join(',');
  });
  midi.onMessage((message) => {
    if (midiController.handle(message)) {
      document.documentElement.dataset.midiLast = `${String(message.cc)}:${String(message.value)}`;
    }
  });
  void midi.connect();
  mirrorState(polytopes, pipeline, orbit);

  const focusProbe = new Vector3();
  const fpsMeter = new FpsMeter((fps) => {
    stats.fps = fps;
    const data = document.documentElement.dataset;
    data.fps = fps.toFixed(0);
    data.perfCpu = stats.cpuMs.toFixed(2);
    data.perfGpu = stats.gpuMs.toFixed(2);
    data.perfDraws = String(stats.drawCalls);
    data.perfTriangles = String(stats.triangles);
    data.perfVram = stats.vramMb.toFixed(1);
  });

  const ticker = new Ticker((dt) => {
    perfMeter.beginFrame();
    if (audioInput.status === 'on') {
      audioReactor.update(dt);
      document.documentElement.dataset.audioLevel = audioReactor.currentLevel.toFixed(2);
    }
    parameters.update(dt);
    rotor.update(dt);
    orbit.update(dt);
    particles?.update(renderer, dt);
    dust?.update(renderer, dt);
    pipeline.update(dt);
    orbit.updateMatrixWorld(true);
    pipeline.focusDistance = orbit.camera.getWorldPosition(focusProbe).length();
    pipeline.render();
    captureMotion(rotor.matrix, projector.distance, orbit.camera);
    perfMeter.endFrame();
    fpsMeter.tick(dt);
  });
  ticker.start();

  window.addEventListener('beforeunload', () => {
    ticker.stop();
    keybinds.dispose();
    legend.dispose();
    midi.dispose();
    audioInput.dispose();
    panel.dispose();
    hopf.dispose();
    viewport.dispose();
    void renderer.dispose();
  });
}

function mirrorState(polytopes: PolytopeManager, pipeline: Pipeline, orbit: OrbitalCamera): void {
  const data = document.documentElement.dataset;
  data.polytope = polytopes.current ?? '';
  data.effect = pipeline.deform.effect;
  data.slitscan = String(pipeline.deform.slitScanEnabled);
  data.invert = String(pipeline.composite.isInverted);
  data.magnify = String(orbit.isMagnified);
}

function isEffectKind(value: string): value is EffectKind {
  return (EFFECT_KINDS as readonly string[]).includes(value);
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
