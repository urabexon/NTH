import { Color, Scene } from 'three';

import { OrbitalCamera } from './camera/OrbitalCamera';
import { Projector4D } from './core/Projector4D';
import { CLEAR_COLOR, EDGE_WIDTH_DEFAULT_PX, TRAIL_DAMP_DEFAULT } from './core/config';
import { FpsMeter } from './core/FpsMeter';
import { createRenderer } from './core/renderer';
import { Rotor4D } from './core/Rotor4D';
import { Ticker } from './core/Ticker';
import { Viewport } from './core/Viewport';
import { loadGraphs } from './geometry/loadGraphs';
import { HopfFibration } from './geometry/HopfFibration';
import { PolytopeManager } from './geometry/PolytopeManager';
import { EFFECT_KINDS, type EffectKind } from './post/DeformEffect';
import { EdgeParticles } from './particles/EdgeParticles';
import { Pipeline } from './post/Pipeline';
import { createBindings } from './ui/createBindings';
import { Keybinds } from './ui/Keybinds';
import { KeyLegend } from './ui/KeyLegend';
import { LazyControlPanel } from './ui/LazyControlPanel';
import { Parameters, sliderFromDistance } from './ui/Parameters';

async function bootstrap(): Promise<void> {
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
  const parameters = new Parameters({ projector, rotor, polytopes, pipeline, orbit, hopf });
  if (params.has('fibers')) parameters.jumpTo('fibers', readNumber(params, 'fibers') ?? 0);
  if (params.has('d')) parameters.jumpTo('distance', sliderFromDistance(projector.distance));
  if (params.has('scale')) parameters.jumpTo('scale', polytopes.scale.x);
  if (params.has('bloom')) parameters.jumpTo('bloomStrength', pipeline.bloomStrength);
  if (params.has('trails'))
    parameters.jumpTo('trails', readNumber(params, 'trails') ?? TRAIL_DAMP_DEFAULT);
  if (params.has('edge'))
    parameters.jumpTo('edgeWidth', readNumber(params, 'edge') ?? EDGE_WIDTH_DEFAULT_PX);
  polytopes.facesVisible = params.has('faces');
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
  const panel = new LazyControlPanel(
    parameters,
    document.body,
    { faces: polytopes.facesVisible, particles: particles !== null },
    (key, value) => {
      if (key === 'faces') polytopes.facesVisible = value;
      if (key === 'particles' && particles) particles.visible = value;
    },
  );
  if (params.has('panel')) panel.visible = true;

  const keybinds = new Keybinds(
    createBindings({ polytopes, rotor, orbit, pipeline, panel, random: Math.random }),
    window,
  );
  const legend = new KeyLegend(keybinds, document.body);
  keybinds.onChange(() => {
    mirrorState(polytopes, pipeline, orbit);
  });
  mirrorState(polytopes, pipeline, orbit);

  const fpsMeter = new FpsMeter((fps) => {
    document.documentElement.dataset.fps = fps.toFixed(0);
  });

  const ticker = new Ticker((dt) => {
    parameters.update(dt);
    rotor.update(dt);
    orbit.update(dt);
    particles?.update(renderer, dt);
    pipeline.update(dt);
    pipeline.render();
    fpsMeter.tick(dt);
  });
  ticker.start();

  window.addEventListener('beforeunload', () => {
    ticker.stop();
    keybinds.dispose();
    legend.dispose();
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

void bootstrap();
