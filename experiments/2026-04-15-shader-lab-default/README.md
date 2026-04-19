# Shader Lab default effect reconstruction

Date: 2026-04-15

Continuation note:

- Read `HANDOFF.md` first when resuming this work in a new Codex thread.

Source:

- Shader Lab homepage: <https://eng.basement.studio/tools/shader-lab/>
- Repository: <https://github.com/basementstudio/shader-lab>
- Default preset source: `src/lib/editor/default-project.json`
- Runtime package: `packages/shader-lab-react`

## What the effect is

The homepage effect is a layered Shader Lab composition, not a single shader. The default project stores five layers in UI order:

1. `CRT` effect
2. `Dithering` effect
3. `Text` source used as a luminance stencil mask
4. `Pattern` effect
5. `Gradient` source

The runtime reverses that exported layer array before it syncs the render pipeline, so the effective build order is:

1. `Gradient` source
2. `Pattern` effect
3. `Text` source as a luminance stencil mask
4. `Dithering` effect
5. `CRT` effect

The runtime schema is small: `composition`, `layers`, and `timeline`. Each layer has `kind`, `type`, `params`, blend/composite state, mask settings, hue, saturation, opacity, and visibility. The portable runtime package is `@basementstudio/shader-lab`, currently published from the repo package as version `1.3.4`.

## Runtime architecture

The renderer builds a ping-pong render pipeline. `createWebGPURenderer` reverses the frame layers, then `PipelineManager` creates two color render targets and executes that ordered pass list. Each pass reads the current texture, writes to the other target, then the manager swaps targets. The common `PassNode` path handles opacity, blend mode, composite mode, masks, hue, and saturation.

Important implementation files:

- `packages/shader-lab-react/src/types.ts`
- `packages/shader-lab-react/src/renderer/pipeline-manager.ts`
- `packages/shader-lab-react/src/renderer/pass-node.ts`
- `packages/shader-lab-react/src/renderer/blend-modes.ts`
- `packages/shader-lab-react/src/renderer/gradient-pass.ts`
- `packages/shader-lab-react/src/renderer/pattern-pass.ts`
- `packages/shader-lab-react/src/renderer/text-pass.ts`
- `packages/shader-lab-react/src/renderer/dithering-pass.ts`
- `packages/shader-lab-react/src/renderer/crt-pass.ts`

The pass code is written against Three.js WebGPU and TSL, so it is not directly copy-paste portable to FxCore, Core Image, Metal, Blender, or WebGL. It is, however, a good algorithmic source of truth.

## Layer notes

### Gradient

The gradient layer is the base visual source. It uses two active color points:

- `#3D2020` at `[0, 0]`, weight `0.6`
- `#FF0000` at `[-0.7, -0.5]`, weight `1.3`

It then adds procedural Voronoi-style warping, vortex rotation, motion, tonemapping, and a soft vignette. This is the first layer to port because it gives us a stable source image for all downstream comparisons.

### Pattern

The pattern layer uses the `bars` preset with `cellSize: 8`, `colorMode: source`, and `bgOpacity: 0.16`. It samples source luminance per tile, maps luminance into an atlas pattern, and mixes the pattern with the source color. Bloom is enabled and materially contributes to the look.

### Text mask

The text layer draws `basement` into a canvas using a heavy sans font at size `201`, white on black. It is configured as `compositeMode: mask` with `maskConfig.mode: stencil`, so it keeps the underlying image only where text luminance passes the mask threshold.

This maps well to FxCore and Blender because it can be represented as a separate matte.

### Dithering

The dithering layer uses `algorithm: bayer-4x4`, `pixelSize: 2`, `spread: 0.5`, `levels: 3`, and `colorMode: source`. It snaps UVs to a logical pixel grid, samples the source at that snapped coordinate, samples the Bayer threshold texture, and quantizes RGB channels.

This is the cleanest custom-kernel candidate for FxCore because it has no temporal feedback dependency.

### CRT

The CRT layer is the most complex pass. It combines:

- slot-mask sampling
- scanline envelope
- barrel distortion
- chromatic aberration
- brightness and highlight response
- shadow lift
- vignette
- bloom
- flicker
- glitch/signal artifacts
- persistence via history render targets

The static spatial subset can be ported first. The persistence and flicker parts require temporal state, which may be difficult or host-dependent inside FxCore and Blender compositor workflows.

## Practical build path

1. Reproduce the canonical effect in a small WebGPU browser harness using `@basementstudio/shader-lab` and `shader-lab-default-config.json`.
2. Capture golden frames at fixed times, at least `t = 0`, `2`, `4`, and `6` seconds, using the same composition size `1512 x 949`.
3. Build a minimal pass-by-pass clone in plain Three.js or React Three Fiber:
   - gradient only
   - gradient plus pattern
   - text stencil mask
   - dithering
   - static CRT spatial effects
   - temporal CRT feedback effects
4. Port individual passes to FxCore:
   - text mask: native text/matte nodes
   - gradient: generator shader or Core Image/Metal kernel
   - pattern: atlas or procedural tile kernel
   - dithering: Bayer kernel
   - CRT: static kernel first, temporal feedback later only if host state is available
5. Port the same visual logic to Blender:
   - gradient/pattern/dither/CRT as compositor or shader node groups
   - text as a text object rendered to alpha or compositor matte
   - use Geometry Nodes mainly for structural analogs, such as pattern grids or instanced glyph/pixel cells

## Porting implications for our graphics workflow

Shader Lab gives us a useful bridge format for effect research because it separates a composition into named, parameterized passes. For our FxCore experiments, this suggests a discipline:

- Treat Shader Lab configs as effect recipes.
- Capture reference frames before porting.
- Port one layer at a time.
- Keep each port measurable against the same golden frames.
- Prefer static image kernels before temporal/video-state effects.

The best first FxCore experiment is a `BayerDither4x4` node that accepts a source image plus `pixelSize`, `spread`, and `levels`. The second is a `TextStencil` workflow that verifies whether FxCore's built-in text and mask nodes can recreate the Shader Lab mask behavior. The CRT pass should wait until the static layers match because it can hide errors in the upstream passes.

## Programmatic FxCore prototype

Generated file:

- `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_5Layer.fxcore`

Generator source:

- `create_fxcore_shader_lab_default.py`
- `shader_lab_default_composite.metal`
- `shader_lab_default_5layer.metal` is retained for the older pass-chain/procedural fallback.

Current default path:

```text
Root
  Output -> Shader Lab Animated Field -> Glow Field Over Black -> Sharp Field Through Text -> 2D Output
  Time   -> Shader Lab Animated Field
  White Text Matte -> Native Text Matte -> Text Glow Mask
  Opaque Black Background -> mask blends
```

The default composition uses FxCore's native text/matte nodes for the `basement` text and a source-style CIShader field for the animated gradient/pattern/dither/CRT approximation. This replaced the older procedural glyph mask as the working baseline.

Validation performed:

- `xcrun -sdk macosx metal -c shader_lab_default_composite.metal` passes syntax validation.
- SQLite `PRAGMA integrity_check` returns `ok`.
- Strict raw native-text baseline has 11 nodes, 47 inputs, 12 outputs, and 12 connections.
- Default published-input native graph has 11 nodes, 64 inputs, 12 outputs, and 12 connections.
- Visual pass on 2026-04-17: the output window opens with an opaque black background and visible red Shader Lab text/field output. Pulsing red output should be treated as an error state.

Repeatable test loop:

```bash
python3 experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py --open
```

The command validates the Metal source, regenerates `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_5Layer.fxcore`, checks SQLite integrity and graph counts, then opens the file in FxCore. Use `--output path/to/file.fxcore` to write a separate variant.

Host slider UI is handled through FxFactory, not raw CIShader input ranges. The proven non-hack path is:

```text
FxFactory Slider -> published root inputDouble -> FxCore Splitter inputDouble0 -> shader float input
```

Verified POC files:

- `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_SplitterPOC_DefaultDouble.fxcore`
- `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_SplitterControls_All.fxcore`
- `/Users/dalebradshaw/Library/Application Support/ShaderLabSliderPOC.fxpack`

The earlier five-node sampled-CIShader chain remains available for debugging only:

```bash
python3 experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py --experimental-chain --open
```

That path is currently expected to be fragile because FxCore appears to accept source-style CIShader kernels more reliably than sampled image-filter CIShader kernels.

Known compromises:

- The text mask is now native FxCore text, but exact Shader Lab/browser canvas glyph fidelity still needs more tuning.
- CRT persistence is approximated as static/timed distortion, scanlines, slot mask, chromatic aberration, vignette, and flicker. It does not yet use frame history.
- Pattern and bloom are approximations, not a direct TSL port.
- FxCore editor sliders for raw CIShader inputs remain unsupported; use typed published ports in an FxPack for host controls.

## Risks

- Shader Lab uses Three.js WebGPU/TSL. FxCore and Blender ports need algorithmic translation, not direct code reuse.
- The CRT pass has frame history. Some hosts may not expose stable temporal state.
- Bloom and color management can cause large visual differences even when the core math is correct.
- The exported JSON is in UI layer order; runtime execution is reversed before the pipeline runs.
- Browser support is WebGPU-dependent.
