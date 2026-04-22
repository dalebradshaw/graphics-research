# FxCore ML Probe Results

Date: 2026-04-21
Workspace: `/Users/dalebradshaw/graphics_research`

## What Was Built

Experiment folder:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes`

Generated Core ML probe models:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models/probe_image_passthrough_rgb.mlpackage`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models/probe_image_mask_grayscale.mlpackage`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models/probe_image_channel_means.mlmodel`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models/probe_image_dominant_color_classifier.mlmodel`

Generated FxCore seed documents:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_passthrough_rgb.fxcore`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_mask_grayscale.fxcore`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_channel_means.fxcore`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_dominant_color_classifier.fxcore`

Model manifest:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/probe-models-manifest.json`

## Core ML Surfaces Confirmed On Our Side

From the generated model specs and local predictions:

1. `probe_image_passthrough_rgb.mlpackage`
   - input: RGB image
   - output: RGB image

2. `probe_image_mask_grayscale.mlpackage`
   - input: RGB image
   - output: grayscale image

3. `probe_image_channel_means.mlmodel`
   - input: RGB image
   - output: `MLMultiArray(3)`

4. `probe_image_dominant_color_classifier.mlmodel`
   - input: RGB image
   - outputs:
     - dictionary probabilities
     - string class label

## FxCore Behavior

## 1. Safe seeded documents open cleanly

The seeded `.fxcore` documents that preserve the original `DepthAnything` importer metadata open reliably in FxCore.

However, they keep the stale cached importer surface:

- inputs remain `URL`, `Image`, `Image Resampling`
- output remains `Depth`

This means **changing `modelName` and `inputURL` alone is not enough** to make FxCore regenerate model-specific ports.

## 2. Blank importer seeds are the useful path

I created stripped variants by deleting:

- the importer `modelPorts` KVP
- all importer inputs except `inputURL`
- all importer outputs

This produced valid documents that still opened in FxCore:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_channel_means_blank.fxcore`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_dominant_color_classifier_blank.fxcore`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore/probe_image_mask_grayscale_blank.fxcore`

On first open, these blank seeds show only:

- `URL`

That is the correct starting state for re-import.

## 3. Re-import inside FxCore regenerates the ports

Using FxCore live UI, I selected the model again through the importer Settings panel.

### Verified live in FxCore

`probe_image_channel_means.mlmodel`

- regenerated inputs:
  - `URL`
  - `Image`
  - `Image Resampling`
- regenerated output:
  - `Channel Means`

`probe_image_dominant_color_classifier.mlmodel`

- regenerated inputs:
  - `URL`
  - `Image`
  - `Image Resampling`
- regenerated outputs:
  - `Probs`
  - `Dominant Color`

This is the strongest result from the session. It demonstrates that FxCore's `Model Importer` is not limited to image-to-image or depth-style outputs. It can surface:

- tensor-style outputs
- classifier dictionary outputs
- classifier string outputs

### Partially verified live

`probe_image_mask_grayscale.mlpackage`

- the blank seed imported and the node visibly switched from URL-only to a populated importer state after re-selection
- the right-side accessibility tree did not remain stable long enough to capture the exact regenerated label text in this pass

Given the successful multiarray and classifier cases, plus the Core ML manifest proving the output is an image type, the remaining uncertainty here is about the exact UI label text, not whether the model loads.

## 4. Save behavior caveat

After re-importing a model in a stripped seed document, attempting to save back onto the same externally patched `.fxcore` file produced:

- `The document “probe_image_channel_means_blank.fxcore” could not be saved. Could not merge changes.`

Inference:

- FxCore is maintaining CoreData-style merge state internally
- externally patching the SQLite store and then trying to save over the same file can trip a merge conflict

Operationally, this means the best loop is:

1. generate or patch the seed document externally
2. open it in FxCore
3. re-import the model
4. save to a fresh file path from inside FxCore rather than overwriting the patched seed

## Practical Boundary Map

This pass gives us a much clearer answer about what "bring your own model" means in FxCore:

### Works in principle

- Core ML image input
- Core ML `MLMultiArray` output
- Core ML classifier outputs:
  - dictionary
  - string label
- likely Core ML image output as well, based on the generated model surface and successful re-import path

### Does not happen automatically

- FxCore does **not** automatically regenerate importer ports just because `inputURL` points at a different model
- cached `modelPorts` metadata must be replaced by an explicit re-import workflow

### Best repeatable harness

For ongoing experiments, the useful loop is:

1. generate a Core ML model
2. seed a blank importer `.fxcore` doc
3. open in FxCore
4. use Settings -> Model to re-import
5. save as a new document
6. inspect the saved `.fxcore` file with `fxcore-inspect`

## Implication For MLX

This materially strengthens the case for the **MLX -> Core ML -> FxCore** path.

Because FxCore successfully surfaced:

- `MLMultiArray`
- classifier outputs

we are not limited to pure image-to-image models. That opens the door to:

- embedding-like outputs
- classification heads
- segmentation / mask outputs
- other converted image-conditioned MLX models, as long as the Core ML export is valid

## Related Files

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/README.md`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/generate_probe_models.py`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/seed_fxcore_ml_probes.py`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/probe-models-manifest.json`
