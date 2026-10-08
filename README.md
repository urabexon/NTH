# NTH

English | [日本語](README.ja.md) | [Français](README.fr.md)

**NTH is a VJ tool for four-dimensional shapes.** It runs in the browser and renders 4D polytopes live on the GPU, projected down into 3D so they turn inside out as they rotate.  
Made for live sets; fun to just watch.

- **Watch**: open **[nth-blue.vercel.app](https://nth-blue.vercel.app/)** in Chrome on a Mac or PC and press **Demo** in the bar at the bottom. One minute, no setup.
- **Perform**: drive it from the keyboard, a MIDI controller or a microphone, and keep a set in nine preset slots. See [Controls](#controls).
- **Read**: the math and the rendering pipeline are in [docs/how-it-works.md](docs/how-it-works.md); frame costs in [docs/perf.md](docs/perf.md).

![rendered in NTH](public/screenshots/120-cell.jpg)

NTH takes the 24 regular and semi-regular 4D polytopes, rotates them in all six planes of 4D space, and projects them onto the 3-sphere and down into 3D every frame.  
Edges are drawn as glowing tubes, faces as glass, with particles that ride the edges, dust that drifts through the space, and a post-processing chain built for live performance.

## Controls

Move the mouse to show the key legend at the bottom of the screen.

| Key       | Action                                            |
| --------- | ------------------------------------------------- |
| Space     | next polytope (random)                            |
| A         | turbulence burst                                  |
| S         | new 4D rotation and camera orbit                  |
| R         | slit-scan                                         |
| T         | wormhole (camera magnify + lens)                  |
| Q / W / E | no effect / repeat / mirror                       |
| Z         | invert colors                                     |
| Shift     | hold to dolly out                                 |
| M         | microphone audio reactivity                       |
| 1–9       | recall a preset slot                              |
| H         | control panel (sliders, presets, perf, share URL) |

**MIDI**: plug in a KORG nanoKONTROL2 (a small USB box with eight faders and knobs) and its default mapping works right away: faders for distance, rotation and the effect amounts, buttons for the keys above (`src/midi/nanokontrol2.json`).  
Any other controller works too: copy that file and change the control-change numbers to match yours.

**Sharing a look**: **copy link** in the panel gives you a URL that reopens NTH exactly as it is now.

## Requirements

- A desktop browser with WebGPU (Chrome or Edge). Safari and Firefox fall back to WebGL2 without particles and dust.
- Phones and tablets get a static gallery.
- For development: Node.js 22.12 or later (see `.nvmrc`) and pnpm 10.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # browser tests (Playwright, uses installed Chrome)
pnpm build        # static site in dist/
```

CI runs lint, type checks, unit tests, the build, and a smoke subset of the browser tests on software WebGL.

## Performance

`pnpm bench` measures CPU and GPU time, draw calls and VRAM per polytope and effect on your machine.  
See [docs/perf.md](docs/perf.md) for requirements and the current baseline.

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

## Deploy

Any static host works; the site must be served over HTTPS.  
The live site is on Vercel (build `pnpm build`, output `dist`).  
For hosting under a subpath, build with `BASE_PATH=/subpath/`.

## Credits

- Demo track: "Ricochet" by Rob Gasser [NCS Release], [NoCopyrightSounds](https://ncs.io/Ricochet).  
See [public/demo/LICENSE.txt](public/demo/LICENSE.txt).
- [three.js](https://threejs.org/), [Tweakpane](https://tweakpane.github.io/docs/).

## License

MIT for the code ([LICENSE](LICENSE)).  
The demo track and third-party dependencies have their own licenses;  
see [NOTICE.md](NOTICE.md).
