# FxCore Triptychs

This experiment track compares the same graphics idea across three runtimes:

```text
Three.js
  Fast browser prototype and shader/runtime source.

Blender Geometry Nodes
  Procedural geometry, attributes, materials, and offline rendering.

FxCore
  Apple Core Image / Metal / Vision / CoreML / video-host constraints.
```

The goal is not perfect visual parity. The goal is to learn which concepts port cleanly, which need approximation, and which are host-specific.

## Source Materials

- FxCore samples: `/Users/dalebradshaw/Documents/fxcore/sample_plugins`
- FxCore inspector: `tools/fxcore-inspect/fxcore_inspect.py`
- Brainstorm note: `FxCore Sample Plugins Brainstorm 2026-04-15`
- Prior note: `FxCore Graphics Workflow Brainstorm 2026-04-15`

## Local Commands

Inspect all FxCore samples:

```bash
npm run fxcore:inspect
```

Inspect one sample:

```bash
npm run fxcore:inspect -- /Users/dalebradshaw/Documents/fxcore/sample_plugins/Fire.fxcore
```

Emit JSON for tooling:

```bash
npm run fxcore:inspect -- --format json /Users/dalebradshaw/Documents/fxcore/sample_plugins
```

## Experiment 1: Shader Triptych

Reference sample:

- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Fire.fxcore`

Compare:

- Three.js fullscreen shader material
- FxCore Core Image Metal kernel
- Blender material or compositor approximation

Questions:

- How do `iResolution` / `u_resolution` and `iTime` / `u_time` map?
- Where do color-space differences appear?
- Which GLSL conveniences require manual Metal changes?
- Does reduced Core Image output format matter for intermediate masks?

## Experiment 2: Pose / Depth Triptych

Reference samples:

- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/DepthAnything.fxcore`
- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Human.fxcore`

Compare:

- FxCore Vision/CoreML graph
- Blender compositing or geometry overlay
- Web MediaPipe / Three.js overlay

Questions:

- Which outputs are image masks vs structured points?
- Can body-pose points drive particles or text labels consistently?
- How much of the FxCore graph maps to deterministic video plugins?

## Experiment 3: Asset Constellation

Reference samples:

- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Apps in Space.fxcore`
- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Directory Scanner.fxcore`

Compare:

- Three.js instanced sprites or planes
- Blender Geometry Nodes point distribution
- FxCore directory scanner + 3D sprites

Questions:

- What is the common collection model?
- How are random selection, time, and per-item transforms represented?
- Can we use the same manifest for all three runtimes?

## Experiment 4: Iterator / Accumulator Comparison

Reference samples:

- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Iterator.fxcore`
- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Iterator 2.fxcore`
- `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Composite Stack Accumulator.fxcore`

Compare:

- FxCore iterator containers and accumulated composite output
- Blender Geometry Nodes repeat zones / instancing
- Three.js instancing or multi-pass render targets

Questions:

- What is FxCore's equivalent of "instance on points"?
- Which accumulated outputs are deterministic?
- Where does frame history become unsafe for video hosts?

## Working Rule

Each triptych should produce:

- source graph or code
- one rendered still or short capture per runtime
- inspected FxCore Markdown/JSON output
- short comparison note with mapping table and failed assumptions

