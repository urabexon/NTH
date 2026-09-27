import { WebGPURenderer } from 'three/webgpu';

import { CLEAR_COLOR, MAX_PIXEL_RATIO } from './config';

export type BackendName = 'webgpu' | 'webgl2';

export interface RendererOptions {
  /** Use the WebGL2 backend even when WebGPU is available. Handy for testing the fallback. */
  forceWebGL?: boolean;
}

export interface RendererHandle {
  renderer: WebGPURenderer;
  backend: BackendName;
}

/**
 * Creates the renderer and waits for the backend to initialize.
 * WebGPURenderer picks WebGPU when `navigator.gpu` works and silently falls back to WebGL2 otherwise;
 * the returned `backend` reports which one is actually in use.
 */
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
