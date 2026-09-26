# NTH

A VJ tool that renders stereographic projections of 4D polytopes with WebGPU.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript + pnpm |
| Rendering | three.js WebGPURenderer (WebGL2 fallback) |
| Shaders | TSL (Three Shading Language) |
| GPU compute | WebGPU compute shaders |
| Post-processing | three.js PostProcessing nodes + custom nodes |
| Input | Keyboard, Web MIDI API, Web Audio API |
| UI | Tweakpane |
| Testing | Vitest, Playwright |

## Requirements

- Node.js 20 or later
- pnpm 9 or later
- A browser with WebGPU enabled (Chrome or Edge recommended). Falls back to WebGL2 with limited effects.

## Development

```sh
pnpm install
pnpm dev
```
