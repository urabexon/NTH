import { WebGPURenderer } from 'three/webgpu';

import { CLEAR_COLOR, MAX_PIXEL_RATIO } from './config';

export type BackendName = 'webgpu' | 'webgl2';

export interface RendererOptions {
  forceWebGL?: boolean;
}

export interface RendererHandle {
  renderer: WebGPURenderer;
  backend: BackendName;
}

export async function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions = {},
): Promise<RendererHandle> {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    forceWebGL: options.forceWebGL ?? false,
  });

  await renderer.init();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearColor(CLEAR_COLOR, 1);

  const backend: BackendName = isWebGPUBackend(renderer.backend) ? 'webgpu' : 'webgl2';
  return { renderer, backend };
}

function isWebGPUBackend(backend: unknown): boolean {
  return typeof backend === 'object' && backend !== null && 'isWebGPUBackend' in backend;
}
