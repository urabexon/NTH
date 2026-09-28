import { PerspectiveCamera, Scene } from 'three';

import { CAMERA_DISTANCE, CAMERA_FAR, CAMERA_FOV, CAMERA_NEAR } from './core/config';
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
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  camera.position.z = CAMERA_DISTANCE;

  const viewport = new Viewport(renderer, camera);

  const ticker = new Ticker((dt) => {
    rotor.update(dt);
    renderer.render(scene, camera);
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
