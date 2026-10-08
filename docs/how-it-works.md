# How NTH works

## The idea in one picture

A globe is a 3D object. To print it on paper you project it onto a 2D sheet, and the familiar "stereographic" way to do that puts a lamp at the north pole and traces every point's shadow onto a plane: nearby shapes stay round, shapes near the pole blow up toward infinity.

NTH does the same thing one dimension up. The polytopes live on the 3-sphere, the 4D equivalent of a globe. We rotate them in 4D, then shine the lamp from a point on the w axis and trace each point's shadow into ordinary 3D space, where a normal camera looks at it. When a part of the shape swings close to the lamp, its shadow flies outward and the shape seems to turn inside out. That is the whole trick; everything else is about making it look good and run fast.

![flow](/docs/flow.jpeg)

## 1. Where the shapes come from

The 24 polytopes are stored as plain numbers: a list of 4D points on the unit 3-sphere and a list of faces that connect them (`public/data/graphs.json`). Computing them is hard (it needs group theory), so they were generated once with Jenn3d and we only read the file. `scripts/build-data.ts` checks and bundles the data; `src/geometry/schema.ts` describes its shape for both the script and the app.

## 2. Rotating in four dimensions

In 3D you rotate around an axis. In 4D there is no single axis; you rotate within a plane, and there are six of them (xy, xz, yz, xw, yw, zw). Any mix of the six gives a rotation, and mixing them is what makes the motion feel unlike anything in 3D.

`src/core/Rotor4D.ts` keeps a speed for each plane and nudges those speeds toward random targets over a second or two, so the motion changes character smoothly instead of jumping. Every frame it rebuilds the 4×4 matrix from scratch, which keeps it an exact rotation no matter how long the app runs.

## 3. The projection, in four lines

Every vertex goes through the same steps on the GPU (`src/shaders/stereographicProjection.ts`):

```
p   = M4 · (x, y, z, w)     rotate in 4D
p   = p / |p|                put it back on the 3-sphere
s   = d / (d − p.w)          distance from the lamp at (0, 0, 0, d)
xyz = p.xyz · s              the 3D point the camera sees
```

`d` is the "distance" slider. Close to 1 the lamp sits on the sphere and shadows near it stretch to infinity; larger values move the lamp away and the view flattens toward an ordinary 3D model.

A straight edge becomes a curve after projection, but the GPU can only draw straight segments between the points it is given. So each edge is split into many short pieces (8 to 60 per edge depending on the shape, `src/geometry/subdivisionLevels.ts`) and each face triangle into a fine mesh (`src/geometry/subdivide.ts`). The GPU interpolates the 4D coordinates along those pieces, and the curvature appears for free.

## 4. Drawing edges as glowing tubes

Neither WebGL nor WebGPU can draw a thick line, so every edge is built as a ribbon of small rectangles (`src/geometry/edgeStrips.ts`). Each corner of the ribbon knows the previous, current and next point of its edge; the vertex shader (`src/shaders/thickEdge.ts`) projects all three, works out which way the edge runs on screen, and pushes the corner sideways by the line width. Because neighbouring rectangles share corners, there are no gaps or overlaps where the edge bends.

Each tube has a white core fading into a coloured halo (`src/shaders/neonEdge.ts`). Where tubes cross, the brighter one wins instead of the two adding up, so dense shapes like the 120-cell do not wash out to white. Faces are drawn as faint glass whose opacity drops for shapes with many faces (`src/shaders/glassSurface.ts`).

## 5. Particles that live in 4D

Two particle systems run entirely on the GPU with compute shaders. `src/particles/EdgeParticles.ts` keeps 4096 sparks, each sitting somewhere along an edge; every frame they slide along it and hop to a new edge at the end. `src/particles/DustParticles.ts` lets 6000 motes drift on the 3-sphere itself. Both are projected with the same four lines as the polytope, so they turn inside out together with it. On browsers without WebGPU they are skipped.

## 6. The post-processing chain

After the scene is drawn, `src/post/Pipeline.ts` runs these passes in order:

1. **Motion streak**: each pixel also records how fast it moved; bright lines are smeared along that direction. Thin lines on a dark background would only get darker with a normal blur, so the streak keeps the brightest value instead of averaging (`src/post/motionStreak.ts`).
2. **Depth of field**: focus stays on the shape's centre; what is far in front or behind softens.
3. **Deform**: the performance effects, turbulence, slit-scan, repeat, mirror and the lens for the wormhole (`src/post/DeformEffect.ts`). They all move pixels around and read the image back.
4. **Trails**: a fraction of the previous frame is kept, so movement leaves a tail.
5. **Bloom**: the glow around bright edges. This is the single most expensive pass; see `docs/perf.md`.
6. **Color**: chromatic aberration (the colour fringes), the invert toggle, a vignette and a touch of film grain (`src/post/CompositeEffect.ts`).
7. **FXAA**: anti-aliasing.

Sizes that are given in pixels (line width, lens radius) are scaled by the display's pixel ratio, so a 4 px line looks the same on a Retina screen. "Render scale" lowers the internal resolution to save GPU time; on hi-DPI displays it defaults to 0.75.

## 7. The Hopf fibration

The rings you can turn on with the "fibers" slider are a famous structure on the 3-sphere: it can be filled completely with circles that never touch, one circle for every point of an ordinary sphere. `src/geometry/hopf.ts` builds each circle directly from its base point (in complex form, `(r1·e^{it}, r2·e^{i(t−α)})`), and they are drawn with the same tube renderer, so they are rotated and projected exactly like the polytopes. Under projection the circles become linked rings.

## 8. Controls, audio and presets

All ways of controlling the app end up in two places: `src/ui/Keybinds.ts` for things you trigger or toggle, and `src/ui/Parameters.ts` for slider values, which ease toward their targets so nothing jumps. The keyboard, MIDI controllers (`src/midi/`) and the demo timeline all drive those two.

Audio reactivity (`src/audio/`) measures the energy between 30 and 180 Hz, smooths it, and pushes the projection distance down with the bass; a sudden rise above the recent average counts as a hit and picks a new rotation. A snapshot of every setting is what the preset slots and the share URL store (`src/state/`).
