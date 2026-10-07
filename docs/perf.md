# Performance baseline

## How to run

```sh
pnpm install
pnpm bench > bench.md
```

Needs Google Chrome installed (the bundled Chromium has no WebGPU on macOS) and a real GPU; software rendering gives numbers that cannot be compared. The script starts and stops its own dev server and takes about three minutes.

Measured with `pnpm bench` (headless Google Chrome, WebGPU, 1440×900 viewport, seed 1, 2.6 s settle).
GPU ms is the per-frame average of the WebGPU render-pass timestamps; fps is capped by the 60 Hz headless clock, so GPU ms is the number to compare.

## 2026-10-07 — MacBook Air, Apple M2 (10 cores), macOS 14.8.9, Chrome 154.0.8037.58

| DPR | polytope  | variant      | render scale | fps | cpu ms | gpu ms | draw calls | triangles | VRAM MB |
| --- | --------- | ------------ | ------------ | --- | ------ | ------ | ---------- | --------- | ------- |
| 1   | hypercube | all on       | 1            | 60  | 1.56   | 9.81   | 33         | 170380    | 205.5   |
| 1   | 24-cell   | all on       | 1            | 60  | 1.11   | 10.08  | 33         | 192780    | 205.5   |
| 1   | 120-cell  | all on       | 1            | 60  | 1.83   | 11.64  | 33         | 309900    | 205.5   |
| 1   | 120-cell  | dof=0        | 1            | 60  | 1.42   | 11.19  | 33         | 309900    | 205.5   |
| 1   | 120-cell  | motionBlur=0 | 1            | 60  | 1.27   | 11.87  | 33         | 309900    | 205.5   |
| 1   | 120-cell  | trails=0     | 1            | 60  | 1.59   | 11.92  | 33         | 309900    | 205.5   |
| 1   | 120-cell  | particles=0  | 1            | 60  | 1.53   | 11.71  | 32         | 301708    | 205.3   |
| 1   | 120-cell  | dust=0       | 1            | 60  | 1.73   | 12.08  | 32         | 303900    | 205.3   |
| 1   | 120-cell  | faces=0      | 1            | 60  | 1.77   | 8.82   | 31         | 33420     | 205.5   |
| 1   | 120-cell  | bloom=0      | 1            | 60  | 1.54   | 5.72   | 21         | 309888    | 180.8   |
| 1   | 600-cell  | all on       | 1            | 60  | 1.37   | 14.06  | 33         | 268620    | 205.5   |
| 2   | hypercube | all on       | 0.75         | 60  | 1.78   | 12.86  | 33         | 170380    | 343.6   |
| 2   | 24-cell   | all on       | 0.75         | 60  | 1.44   | 15.31  | 33         | 192780    | 343.6   |
| 2   | 120-cell  | all on       | 0.75         | 60  | 1.90   | 15.80  | 33         | 309900    | 343.6   |
| 2   | 120-cell  | dof=0        | 0.75         | 60  | 1.65   | 17.06  | 33         | 309900    | 343.6   |
| 2   | 120-cell  | motionBlur=0 | 0.75         | 60  | 1.60   | 16.23  | 33         | 309900    | 343.6   |
| 2   | 120-cell  | trails=0     | 0.75         | 60  | 1.50   | 16.43  | 33         | 309900    | 343.6   |
| 2   | 120-cell  | particles=0  | 0.75         | 60  | 1.48   | 16.10  | 32         | 301708    | 343.4   |
| 2   | 120-cell  | dust=0       | 0.75         | 60  | 1.42   | 16.21  | 32         | 303900    | 343.4   |
| 2   | 120-cell  | faces=0      | 0.75         | 60  | 1.76   | 14.88  | 31         | 33420     | 343.6   |
| 2   | 120-cell  | bloom=0      | 0.75         | 60  | 1.96   | 8.81   | 21         | 309888    | 329.7   |
| 2   | 600-cell  | all on       | 0.75         | 60  | 1.92   | 17.44  | 33         | 268620    | 343.6   |

### Reading the numbers

- Bloom is the single largest cost: turning it off saves about 6 ms at DPR 1 and 7 ms at DPR 2, roughly half of the frame. It is the first place to optimize if a target machine falls below 60 fps.
- The glass faces cost about 3 ms on the 120-cell (276k of its 310k triangles). Edges, particles, dust, DOF, motion streak and trails are each about 1 ms or less.
- CPU time is 1–2 ms per frame; the app is GPU-bound everywhere.
- At DPR 2 with render scale 0.75 (the default on hi-DPI screens) the 120-cell sits at about 16 ms and the 600-cell at 17 ms, right at the 60 Hz budget. Larger windows or render scale 1.0 will drop frames on this GPU; render scale 0.5 or bloom off restores headroom.
- VRAM: about 205 MB at DPR 1 and 344 MB at DPR 2 ×0.75, dominated by the post-processing render targets (bloom off removes 25 MB and 12 draw calls).
