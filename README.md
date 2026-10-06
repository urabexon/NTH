# NTH

A VJ tool that renders stereographic projections of 4D polytopes with WebGPU.

## Stack

| Layer           | Choice                                       |
| --------------- | -------------------------------------------- |
| Build           | Vite + TypeScript + pnpm                     |
| Rendering       | three.js WebGPURenderer (WebGL2 fallback)    |
| Shaders         | TSL (Three Shading Language)                 |
| GPU compute     | WebGPU compute shaders                       |
| Post-processing | three.js PostProcessing nodes + custom nodes |
| Input           | Keyboard, Web MIDI API, Web Audio API        |
| UI              | Tweakpane                                    |
| Testing         | Vitest, Playwright                           |

## Requirements

- Node.js 22.12 or later (see `.nvmrc`)
- pnpm 10 or later
- A browser with WebGPU enabled (Chrome or Edge recommended). Falls back to WebGL2 with limited effects.

## Development

```sh
pnpm install
pnpm dev
```

## Build and deploy

```sh
pnpm build            # static site in dist/
pnpm preview          # serve dist/ locally (pass the same BASE_PATH used for the build)
```

The site must be served over HTTPS (WebGPU, Web MIDI and microphone input require it).

- **GitHub Pages**: the `Deploy` workflow builds with `BASE_PATH=/<repo>/` and publishes `dist/` on every push to `main`. Enable Pages with source "GitHub Actions" in the repository settings. Pages on a private repository needs a paid GitHub plan; public repositories work on the free plan.
- **Vercel or any static host**: import the repository, build command `pnpm build`, output directory `dist`. Leave `BASE_PATH` unset when the site is served from the domain root.
