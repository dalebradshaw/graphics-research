# FxCore Shader Lab Default Handoff

Last updated: 2026-04-17

## Sandbox Status

Historical note: this handoff was originally created because an older Codex thread was still running under the old sandbox environment even though the Codex UI showed:

- Approval policy: `Never`
- Sandbox settings: `Full access`

Inside this thread, `printenv` still reports:

```text
CODEX_SANDBOX=seatbelt
CODEX_SANDBOX_NETWORK_DISABLED=1
```

That prevented reliable autonomous GUI verification with FxCore/Computer Use.

Current 2026-04-17 session check:

```text
printenv | rg 'CODEX_SANDBOX|CODEX_SANDBOX_NETWORK|PWD'
PWD=/Users/dalebradshaw/graphics_research
```

No stale `CODEX_SANDBOX` or `CODEX_SANDBOX_NETWORK_DISABLED` variables are present, so this thread can regenerate files and run Computer Use checks autonomously.

## First New-Thread Prompt

Use this prompt in the new thread:

```text
Continue the FxCore Shader Lab default output-window loop. Read /Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/HANDOFF.md first, verify the sandbox, then regenerate/open/check the FxCore output window with Computer Use until it works.
```

## Verify New Session

First command:

```bash
printenv | rg 'CODEX_SANDBOX|CODEX_SANDBOX_NETWORK|PWD'
```

Bad state:

```text
CODEX_SANDBOX=seatbelt
CODEX_SANDBOX_NETWORK_DISABLED=1
```

Expected good state is full access/no approval behavior. If those old values still appear, the thread did not pick up the Codex UI config.

## Important Files

Generated FxCore output:

- `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_5Layer.fxcore`

Experiment directory:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/`

Core files:

- `create_fxcore_shader_lab_default.py`
- `shader_lab_default_composite.metal`
- `shader_lab_default_5layer.metal`
- `shader-lab-default-config.json`
- `README.md`

Generator dependency:

- `/Users/dalebradshaw/Documents/fxcore/fxcore_gen.py`

Obsidian note used as research basis:

- `Graphics Research/FxCore Programmatic Composition Generation 2026-04-16`

## Current Generator Behavior

Default command:

```bash
python3 /Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py --open
```

Default path now generates a source-style `CIShader` composition, not the earlier malformed sampled-CIShader chain.

Expected graph:

```text
Root
Output
Time
Shader Lab 5-Layer Composite
2D Output
```

Expected database counts:

```text
nodes: 5
inputs: 4
outputs: 5
connections: 3
```

The composite shader internally applies the five Shader Lab-inspired stages:

1. Gradient
2. Pattern
3. Text stencil
4. Bayer dither
5. CRT finish

## Known Bad Path

The earlier five-node sampled-CIShader chain opened malformed/no-output in FxCore. It is still available only for debugging:

```bash
python3 /Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py --experimental-chain --open
```

Do not treat that as the default working path. FxCore appears to accept source-style `CIShader` kernels more reliably than sampled image-filter `CIShader` kernels. Sampled image filters should likely move to `CIKernel` or native FxCore nodes later.

## Verified Working State

User reported:

> there is not an output window in your .fxcore docs

This was fixed on 2026-04-16. The root cause was the generated `outputWindowFrame` KVP using the flat numeric frame encoding. FxCore accepts flat strings for `editingWindowFrame`, but the output window samples use CoreGraphics-style strings.

The generator now opens the default file with two useful windows:

```text
Generated_ShaderLab_Default_5Layer.fxcore output: 960, 180, 960, 540
Generated_ShaderLab_Default_5Layer.fxcore editor: 40, 460, 1400, 900
```

Computer Use visually verified the initial procedural graph and rendered output: `Output -> Shader Lab 5-Layer Composite -> 2D Output`, with the red CRT/text shader visible in the output window.

The shader was then visually tuned against the Shader Lab reference screenshots:

- Replaced the seven-segment toy text mask with procedural lowercase glyph geometry. This was later superseded by the native text matte graph.
- Pinned the text matte scale to a 16:9 composition aspect instead of FxCore's reported render target aspect, which was compressing the word.
- Removed global post-CRT red noise leakage so the field outside the matte stays black.
- Added local red matte/glow energy so the output reads closer to the Shader Lab homepage reference.

Current visual gap: glyph fidelity and centering still need tuning against the Shader Lab browser reference. The active path uses FxCore's `ImageWithStringPlugIn` native text matte rather than the old procedural glyph fallback.

## Current Window Metadata

The generator now calls:

```python
def configure_window_state(comp):
    comp.set_aspect_ratio(16, 9)
    comp.add_comp_kvp("outputSampleCount", _bplist_int(1))
    comp.add_comp_kvp("outputWindowFrame", _bplist_string("{{960, 720}, {960, 540}}"))
    comp.add_comp_kvp("editingWindowFrame", _bplist_string("40 80 1400 900 0 0 2560 1415 "))
```

Reasoning:

- Sample FxCore files use CoreGraphics-style strings for `outputWindowFrame`, e.g. `{{1124, 1050}, {640, 360}}`.
- The flat numeric `outputWindowFrame` reopened as a malformed output window at height `0`.
- The editor frame still uses the flat window/screen encoding seen in samples.

## Recheck Command

To regenerate and visually recheck the working default:

```bash
python3 /Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py --open
```

Use Computer Use on `FxCore` after opening. The expected visible result is the node graph in the editor and a separate 16:9 output window rendering the red CRT/text shader.

## Native Text Work In Progress

User feedback after the procedural-glyph pass:

> This is closer but the output should be centered,adjustable by scale and animated.Yes,we should use FxCore text plugins. You should do a survey of available plugins to see if it will make your task easier.

Obsidian continuation note persisted:

- `Graphics Research/FxCore Shader Lab Native Text Survey 2026-04-16`

Relevant FxCore plugin survey results from installed samples:

- `com.fxfactory.FxCore.ImageWithStringPlugIn`
  - Best native text matte candidate.
  - Found in `Baseline Anchored Text.fxcore`.
  - Inputs include `inputString`, `inputBaseline`, `inputTextAlignment`, `inputVerticalAlignment`, `inputVerticalShift`, `inputColor`, `inputFontName`, `inputFontSize`, `inputPaddingX`, `inputPaddingY`.
  - Outputs `outputImage` and `outputStableExtent`.
- `com.fxfactory.FxCore.FxCorePlugInImageWithString`
  - More UI-style text image generator with width/height and scroll/crawl/roll variants.
- `com.fxfactory.FxCore.FxCorePlugInImageWithStyledText` plus `StyledTextWithString`
  - Better future path for styled/weighted text if plain `ImageWithStringPlugIn` is insufficient.
- `com.fxfactory.FxCore.FxCorePlugInSystemFont`
  - Can generate font names from weight/width/variant.
- `com.fxfactory.FxCore.FxCorePlugInCIBlendWithMask`
  - Built-in image/background/mask compositor.
- `com.fxfactory.FxCore.FxCorePlugInCIGaussianBlur`
  - Useful for glow/soft mask.
- `WaveGenerator`, `Interpolation`, and `MathExpression`
  - Useful for graph-level animation of scale, opacity, glow radius, and offsets.

Current code state:

- `shader_lab_default_composite.metal` now contains:
  - `slComposite`: procedural text-mask fallback.
  - `slField`: animated Shader Lab field without text masking, intended for native text masking.
- `create_fxcore_shader_lab_default.py` now has a native text builder with this graph:

```text
Root
Output
Time
Shader Lab Animated Field (CIShader slField)
White Text Matte (RGBValuesToColor)
Native Text Matte (ImageWithStringPlugIn)
Text Glow Mask (Gaussian Blur)
Opaque Black Background (CIShader slBlack)
Glow Field Over Black (CIBlendWithMask)
Sharp Field Through Text (CIBlendWithMask)
2D Output
```

Native-text test generation succeeded:

```bash
python3 /Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py \
  --text-scale 1.0 \
  --text-glow-radius 18 \
  --output /Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_NativeText.fxcore
```

Native-text graph counts:

```text
nodes: 11
inputs: 47
outputs: 12
connections: 12
```

The old 28-node / 149-input Interpolation value-control graph is obsolete and should not be used as the default baseline. The current proven host-control path is the FxPack Splitter Decimal adapter path documented below.

The `Shader Lab Animated Field` node now exposes value inputs for the main visual sections:

- Gradient: `Gradient Warp`, `Gradient Scale`, `Motion Speed`, `Vortex Amount`, `Saturation`
- Pattern: `Pattern Cell Size`, `Pattern Background`, `Pattern Boost`
- Dither: `Dither Pixel Size`, `Dither Spread`, `Dither Levels`
- CRT: `CRT Scanlines`, `CRT Mask`, `CRT Brightness`, `CRT Vignette`, `CRT Flicker`, `CRT Noise`

Default behavior keeps those shader inputs as raw assigned values directly on the `Shader Lab Animated Field` node. This is the known-good render path.

On 2026-04-17, the default native-text build also publishes those same raw field inputs to the root container using FxCore's parent/child input relationship. This adds host-facing root inputs without adding value nodes or rewiring shader parameters:

```text
nodes: 11
inputs: 64
outputs: 12
connections: 12
published root inputs: 17
generated slider/interpolation/splitter nodes: 0
```

Use `--raw-values` or `--no-publish-field-inputs` to regenerate the strict raw baseline with 11 nodes, 47 inputs, 12 outputs, and 12 connections.

Experimental slider/value-control behavior is available only with:

```bash
python3 /Users/dalebradshaw/graphics_research/experiments/2026-04-15-shader-lab-default/create_fxcore_shader_lab_default.py \
  --experimental-value-controls \
  --output /tmp/Generated_ShaderLab_Default_ExperimentalControls.fxcore
```

Do not promote the Interpolation path to the default. It was superseded by the FxPack Splitter Decimal adapter path.

Resolved regression note from 2026-04-17: scalar shader parameters must not use the generic Splitter key family (`inputValue0` / `outputValue0`) or the older `float` key style. FxFactory recognizes Decimal Splitter controls when they serialize as `inputDouble0` / `outputDouble0`, published at the root as `inputDouble`, `inputDouble1`, etc. That path has been verified in `ShaderLabSliderPOC.fxpack`.

Regression note from 2026-04-17: the Interpolation scalar-control variant can still introduce visible output instability/flashing compared with the raw shader inputs. Treat external value-node wiring as experimental until each parameter is added and visually checked one at a time from the raw baseline.

Important visual failure signal: a pulsing red output in FxCore is an error state, not an acceptable Shader Lab approximation. Automated checks must treat pulsing red as failed output even if the graph opens and the node ports are present.

Current native-text visual state: FxCore opens the generated file and the editor shows the raw exposed Animated Field value inputs. The red node state was fixed by spacing the tall Animated Field node away from the White Text Matte node; the earlier layout overlapped node frames. The checkerboard transparency was fixed by adding an explicit opaque black CIShader background and using two mask blends: blurred text for glow over black, then sharp text over that result.

Verified on 2026-04-17:

- `xcrun -sdk macosx metal -c shader_lab_default_composite.metal` passes.
- `python3 -m py_compile create_fxcore_shader_lab_default.py` passes.
- SQLite integrity check returns `ok`.
- Strict raw baseline graph counts are 11 nodes, 47 inputs, 12 outputs, 12 connections.
- Published-input native graph counts are 11 nodes, 64 inputs, 12 outputs, 12 connections.
- FxCore opens `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_NativeText.fxcore` with grey nodes, an opaque black output window background, and visible red Shader Lab text/field output.
- Repeated screenshot samples of the output-window region were stable across five captures; red pixel counts were identical, so the raw baseline did not show the flashing-red regression.
- After publishing raw field inputs, repeated editor-window captures had zero red-error pixels, and repeated output-window captures stayed mostly black with a small animated red text/field region rather than a full red error flash.
- Unified logging is available through `/usr/bin/log show --predicate 'process == "FxCore"'` or `/usr/bin/log stream --predicate 'process == "FxCore"'`. FxCore did not emit useful shader-specific errors for this issue; the visible red state was the reliable signal.
- FxCore's bundled Core Data model only includes `Input`, `AssignableInput`, `Node`, `Output`, `Connection`, and node/composition key-value entities. There is no input key-value entity for per-port slider ranges. The visible `minimumValue`, `maximumValue`, `sliderMinimumValue`, and `sliderMaximumValue` strings are plugin/node metadata, not a discovered per-input persistence schema for arbitrary `CIShader` parameters.

Remaining visual work: the text is native and scale-adjustable, but it still needs a stronger centering/fidelity pass against the Shader Lab reference.

The older procedural fallback remains available with `--procedural-text`.

## Useful Inspection Commands

Decode composition KVPs:

```bash
python3 - <<'PY'
import sqlite3, plistlib
path='/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_5Layer.fxcore'
conn=sqlite3.connect(path)
print(conn.execute('PRAGMA integrity_check').fetchone()[0])
for key,blob in conn.execute('SELECT ZKEY,ZVALUE FROM ZCOMPOSITIONKEYVALUEPAIR ORDER BY ZKEY'):
    obj=plistlib.loads(blob)
    print(key, repr(obj['$objects'][obj['$top']['root'].data]))
PY
```

Inspect graph:

```bash
sqlite3 /Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_5Layer.fxcore \
  "SELECT Z_PK,ZTITLE,ZIDENTIFIER FROM ZNODE ORDER BY Z_PK;
   SELECT Z_PK,ZNODE,ZKEY,ZTITLE,ZINDEX,ZLASTKNOWNTYPE,ZCONNECTION FROM ZINPUT ORDER BY ZNODE,ZINDEX;
   SELECT Z_PK,ZNODE,ZKEY,ZTITLE,ZINDEX FROM ZOUTPUT ORDER BY ZNODE,ZINDEX;
   SELECT Z_PK,ZINPUT,ZOUTPUT FROM ZCONNECTION ORDER BY Z_PK;"
```

Compare sample composition KVPs:

```bash
python3 - <<'PY'
import sqlite3, plistlib
paths=[
  '/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_5Layer.fxcore',
  '/Users/dalebradshaw/Documents/fxcore/sample_plugins/Fire.fxcore',
  '/Users/dalebradshaw/Documents/fxcore/sample_plugins/Baseline Anchored Text.fxcore',
]
for path in paths:
    print('\\n---', path)
    conn=sqlite3.connect(path)
    for key,blob in conn.execute('SELECT ZKEY,ZVALUE FROM ZCOMPOSITIONKEYVALUEPAIR ORDER BY ZKEY'):
        obj=plistlib.loads(blob)
        print(key, repr(obj['$objects'][obj['$top']['root'].data]))
PY
```

## Research Findings To Preserve

- `CIShader` from-scratch source pipeline works in existing notes: `CIContainer -> CIShader -> Billboard`, with `Time` and `OutputInfo` wired to `u_time` and `u_resolution`.
- `CIShader` inside 3D RTT was observed blank/fragile in prior research.
- A red/pulsing node state can come from overlapping generated node frames. It should still be treated as a failed visual check until the graph is regenerated with separated frames and verified in FxCore.
- `.fxcore` files are SQLite/CoreData stores with `Z_METADATA` and `Z_MODELCACHE`; the generator copies/constructs valid metadata through `fxcore_gen.py`.
- Output/window behavior appears partly independent from SQLite integrity.

## Raw FxCore Editor Slider Findings (2026-04-17)

**Conclusion: raw FxCore editor sliders are plugin-class behavior. No composition schema mechanism was found that can make an arbitrary `FxCorePlugInCIShader` float parameter render as a bounded slider inside the FxCore editor.**

### What was tested

1. **`[[range_min(N), range_max(N)]]` Metal attribute syntax** on a kernel parameter.
   - Metal compiler accepts with `warning: unknown attribute ignored` — correct for framework-layer annotations.
   - FxCore completely ignores the attributes. The input renders as `-∞ ▶ ∞` (unbounded raw numeric). No slider.

2. **`kernelArgumentOptions` node KVP** with `{ "u_pattern_cell_size": { "inputRangeMin": 1.0, "inputRangeMax": 32.0 } }`.
   - FxCore rejects the document on open with `NSInvalidUnarchiveOperationException`. The value shape was wrong.
   - This key does not appear in any `.fxcore` file in the sample_plugins corpus — not in Fire, Feedback, or any other CIShader example.

3. **`minimumValue` / `maximumValue` / `sliderMinimumValue` / `sliderMaximumValue` node KVPs** on the CIShader node.
   - These keys do not exist anywhere in the full 18-file sample corpus.
   - Adding them to a CIShader node in a prior session caused render graph corruption.

4. **SQLite diff approach (Phase 2)** — blocked. FxCore's UI provides no way to set a range on a CIShader float input. The `-∞ ▶ ∞` widget is read-only.

5. **`FxCorePlugInInterpolation` node** wired to a CIShader float input (via `outputValue → inputU_gradient_warp`).
   - Wiring is live: the Interpolation node correctly drives the CIShader parameter.
   - The Interpolation node's `Start Value` / `End Value` inputs still show `-∞ ▶ ∞`, not a slider.
   - **The Interpolation node does not provide slider UI for its own inputs.**

6. **`FxCorePlugInSprite` Rotation X vs Position X comparison** (ground truth).
   - Both are `ZLASTKNOWNTYPE=4` (FLOAT), `Z_ENT=5` (AssignableInput). Schema is byte-for-byte identical.
   - Rotation X renders as a slider; Position X does not.
   - **No SQLite data distinguishes them.** The slider is hard-coded in `FxCorePlugInSprite`'s plugin class binary.

### What this means for FxCore editor inputs

The `.fxcore` composition schema (ZINPUT, ZNODEKEYVALUEPAIR, ZCOMPOSITIONKEYVALUEPAIR) has **no per-input range metadata table**. Range confinement is a property of the plugin implementation, not the composition file.

- Built-in plugin nodes (Sprite Rotation, GaussianBlur Radius, etc.) have sliders because their ObjC/Swift plugin class hard-codes `inputRangeMin`/`inputRangeMax` in the plugin descriptor.
- `FxCorePlugInCIShader` exposes all float kernel parameters as unbounded raw numerics. This is a deliberate design choice — the CIShader node is a generic passthrough and has no knowledge of semantic ranges.
- There is no documented or undocumented composition-file path currently known to override this for raw CIShader editor ports.

This finding does **not** block host-facing FxFactory controls. The working path is an editable FxPack with typed published ports, especially Decimal Splitters serialized as `inputDouble*` for sliders.

### Current baseline (clean, post-investigation)

File: `Generated_ShaderLab_Default_NativeText.fxcore`
- Nodes: 11, Inputs: 64, Outputs: 12, Connections: 12
- SQLite integrity: ok
- Metal shader: clean compile, no annotations
- Control mode: `raw` + `publish_field_inputs=True` (parameters exposed at root, editable as raw floats)
- Visual: field + text renders correctly in FxCore output window

## FxPack Slider POC Success (2026-04-17)

The "sliders are only plugin-class behavior" conclusion is true for raw FxCore CIShader editor inputs, but it is no longer true for the host-facing FxPack path.

Working non-hack path:

- Add `FxCorePlugInSplitter` Decimal controls for shader scalar values.
- Wire each Splitter output to the target `Shader Lab Animated Field` float input.
- Publish the Splitter input to the root container.
- Import the `.fxcore` into FxFactory as an editable FxPack.

The crucial serialization detail is the Splitter key family:

```text
splitter input:  inputDouble0
root input:      inputDouble, inputDouble1, inputDouble2, ...
splitter output: outputDouble0
dynamic port:    ZDYNAMICPORTTYPE=4
```

The earlier failed generated POC used `inputValue0` / `outputValue0`. FxFactory did not recognize that as a compatible slider target. FxCore's own save normalization of an unpublished Decimal Splitter revealed the correct `Double` key convention.

Verified files:

- `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_SplitterPOC_DefaultDouble.fxcore`
- `/Users/dalebradshaw/Documents/fxcore/Generated_ShaderLab_Default_SplitterControls_All.fxcore`
- `/Users/dalebradshaw/Library/Application Support/ShaderLabSliderPOC.fxpack`

FxFactory verification:

- The saved FxPack has exactly one working Slider parameter, `Gradient Warp`, mapped to `inputDouble`.
- `Definitions.plist` has `parameterCompositionInputAName=inputDouble` and `parameterCompositionPortAType=2`.
- Slider range is finite: min `0.0`, max `1.5`, default `0.3`, delta `0.01`.

Generator state:

- `--experimental-splitter-controls` now defaults to `--splitter-key-style double`.
- One-control verification: 12 nodes, 49 inputs, 13 outputs, 13 connections.
- All-control verification: 28 nodes, 81 inputs, 29 outputs, 29 connections, and 17 published root `inputDouble*` ports.

## Standard FxFactory Controls Follow-Up

Persisted detailed matrix in Obsidian:

- `/Users/dalebradshaw/Documents/obsidian/Graphics Research/FxCore CIShader Slider Ranges.md`

Practical rule for future automated runs:

```text
FxFactory parameter UI -> published FxCore root port -> typed adapter node -> shader/native graph input
```

Do not restart the raw CIShader-slider investigation. For host controls, the supported path is typed published ports inside an editable FxPack.

Current control-family assumptions:

| Control | Likely path | Status |
|---|---|---|
| Slider | Splitter Decimal `inputDouble0` / `outputDouble0`, published as `inputDouble*` | Proven |
| Color Picker | Published `PortType.COLOR` input, native color adapter if shader needs RGB floats | Needs POC |
| Popup | Published integer/string input plus choices in FxPack `Definitions.plist` | Needs POC |
| Checkbox | Published Bool input, convert to scalar if shader needs float/int | Needs POC |
| Text | Published String input into native text node | Likely, verify |
| Font | Published font-name string plus FxFactory font parameter metadata | Needs POC |
| Point | Geometry/vector input or paired double sliders | Needs POC |
| File/Image | FxPack file/image parameter metadata plus URL/image adapter node | Needs POC |

For every new control type, run a one-control FxPack POC, save, then inspect `Definitions.plist` for:

- `parameterCompositionInputAName`
- `parameterCompositionPortAType`
- `parameterType`
- family-specific metadata such as popup entries, color defaults, string/font metadata, or range fields

Only generalize the generator after the exact metadata is known.
