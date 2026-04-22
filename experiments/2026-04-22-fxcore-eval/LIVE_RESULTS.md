# Live Results

Date: 2026-04-22

## MobileViT DeepLabV3

Model:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/models/mobilevit-xxs/MobileViT_DeepLabV3.mlpackage`

Schema report:

- input: `image` (`512x512`, BGR)
- output: `classLabels` (`MLMultiArray`, shape `[1, 512, 512]`, `INT32`)

## What FxCore Did Live

Starting from the pruned seed:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/fxcore/mobilevit_deeplabv3_blank.fxcore`

After `Settings -> Model` re-import in FxCore, the node regenerated live ports and showed:

- inputs:
  - `URL`
  - `Image`
  - `Image Resampling`
- outputs:
  - `Class Labels`

That confirms a real third-party Core ML segmentation model can be loaded into FxCore's `Model Importer` and surfaced as a tensor-output node.

## Save Behavior

### Pruned seed

Attempting `File -> Save As…` from the pruned seed failed with:

`The document "mobilevit_deeplabv3_blank.fxcore" could not be saved as "mobilevit_deeplabv3_imported.fxcore". Attempt to access an object not found in store.`

### Full-graph seed

Starting from the non-pruned seed:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/fxcore/mobilevit_deeplabv3_full_blank.fxcore`

Live re-import also regenerated the node UI and showed the same `Image` / `Image Resampling` inputs plus `Class Labels` output.

`Save As…` no longer raised the immediate store-object error, but FxCore still did **not** materialize a new imported document on disk, and inspection of the underlying SQLite store still shows the stale DepthAnything-style importer output:

- `outputPredictionDepth` / `Depth`

The `modelPorts` KVP also remained absent in the saved store.

## Current Boundary

What works:

- external patching of `inputURL` and `modelName`
- live re-import of the Core ML model in FxCore
- live synthesis of tensor outputs for a real segmentation model
- static-source preview compositions using Eagly's embedded `CGImageSourcePlugIn`
- visible output in the FxCore preview viewport without relying on the camera

What still does not work:

- reliably serializing the regenerated importer schema back into the `.fxcore` file
- producing a stable saved document whose SQLite store matches the live imported node state

## Next Likely Path

1. Diff a known-good saved importer document against the externally seeded variants with more focus on object graph identity, not just visible rows.
2. Test whether FxCore only persists regenerated importer ports when the source document was originally authored entirely inside FxCore.
3. Try starting from a full DepthAnything document, re-import the model, then remove or rewire downstream nodes after FxCore has committed the importer state.

## Output Viewport Work

Two static-source preview compositions were generated from the DepthAnything graph by replacing the camera node with Eagly's embedded animation source:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/fxcore/eaglypassthroughpreview_static_preview.fxcore`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/fxcore/eaglymaskpreview_static_preview.fxcore`

Verified live:

- `eaglypassthroughpreview_static_preview.fxcore` opens in FxCore and renders the embedded eagle animation in the output viewport.
- `eaglymaskpreview_static_preview.fxcore` also opens and renders to the output viewport, but the imported mask effect is not visually obvious because it is still routed through the original DepthAnything-style blur stack.

Prepared but not yet visually verified in-app:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/fxcore/eaglymaskdirectpreview_static_preview.fxcore`

That file rewires the graph so the imported image output goes directly to `2D`, which should make the grayscale model result easier to verify than the blur-stack variant.
