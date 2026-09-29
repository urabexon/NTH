import { Color, Scene } from 'three';

import { OrbitalCamera } from './camera/OrbitalCamera';
import { Projector4D } from './core/Projector4D';
import { CLEAR_COLOR } from './core/config';
import { FpsMeter } from './core/FpsMeter';
import { createRenderer } from './core/renderer';
import { Rotor4D } from './core/Rotor4D';
import { Ticker } from './core/Ticker';
import { Viewport } from './core/Viewport';
import { loadGraphs } from './geometry/loadGraphs';
import { PolytopeManager } from './geometry/PolytopeManager';
import { Pipeline } from './post/Pipeline';

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

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return;
    event.preventDefault();
    document.documentElement.dataset.polytope = polytopes.showRandom();
  });

  const fpsMeter = new FpsMeter((fps) => {
    document.documentElement.dataset.fps = fps.toFixed(0);
  });

  const ticker = new Ticker((dt) => {
    rotor.update(dt);
    orbit.update(dt);
    pipeline.render();
    fpsMeter.tick(dt);
  });
  ticker.start();

  window.addEventListener('beforeunload', () => {
    ticker.stop();
    viewport.dispose();
    void renderer.dispose();
  });
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
