import { Scene } from 'three';

import { OrbitalCamera } from './camera/OrbitalCamera';
import { Projector4D } from './core/Projector4D';
import { createRenderer } from './core/renderer';
import { Rotor4D } from './core/Rotor4D';
import { Ticker } from './core/Ticker';
import { Viewport } from './core/Viewport';
import { loadGraphs } from './geometry/loadGraphs';
import { PolytopeMesh } from './geometry/PolytopeMesh';
import { subdivisionLevelFor } from './geometry/subdivisionLevels';

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
  const hypercube = graphs.get('hypercube');
  if (hypercube) {
    scene.add(
      new PolytopeMesh(hypercube, {
        projector,
        subdivision: subdivisionLevelFor('hypercube'),
        colorSeed: 1,
      }),
    );
  }
  const orbit = new OrbitalCamera({ seed: readNumber(params, 'seed') ?? Date.now() });
  orbit.dollyDistance = readNumber(params, 'dolly') ?? 0;
  orbit.isMagnified = params.has('magnify');
  scene.add(orbit);

  const viewport = new Viewport(renderer);

  const ticker = new Ticker((dt) => {
    rotor.update(dt);
    orbit.update(dt);
    renderer.render(scene, orbit.camera);
  });
  ticker.start();

  window.addEventListener('beforeunload', () => {
    ticker.stop();
    viewport.dispose();
    void renderer.dispose();
  });
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

void bootstrap();
