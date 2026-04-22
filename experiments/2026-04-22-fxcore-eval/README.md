# FxCore Evaluation Harness

This experiment prepares a repeatable **FxCore `Model Importer` evaluation loop** for real Core ML models.

Current first-pass target:

- `MobileViT_DeepLabV3.mlpackage`

The harness does two things:

1. inspects the Core ML schema with `coremltools`
2. emits a seeded blank `.fxcore` document based on `DepthAnything.fxcore`

The generated `.fxcore` document is intentionally still a **seed**. FxCore does not regenerate importer ports just because `inputURL` points at a different model. The working loop is still:

1. generate the seed document
2. open it in FxCore
3. click `Settings -> Model`
4. re-import the model from disk
5. save to a fresh `.fxcore` path
6. inspect the saved result with `fxcore-inspect`

## Files

- `bootstrap_imports.py`
  Locates `coremltools` from a local or sibling experiment venv.
- `prepare_fxcore_eval.py`
  Writes the schema report and seeded `.fxcore` document.
- `build_static_preview.py`
  Clones the DepthAnything graph, swaps in Eagly's embedded image source, and points the importer at a chosen Core ML model so the preview path does not depend on the camera.
- `LIVE_RESULTS.md`
  Captures the 2026-04-22 live FxCore import behavior and save-boundary findings.

## Usage

```bash
cd /Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval
python3 prepare_fxcore_eval.py \
  models/mobilevit-xxs/MobileViT_DeepLabV3.mlpackage \
  --title MobileViT_DeepLabV3 \
  --open
```

To keep the full `DepthAnything.fxcore` graph for saveability experiments:

```bash
python3 prepare_fxcore_eval.py \
  models/mobilevit-xxs/MobileViT_DeepLabV3.mlpackage \
  --title MobileViT_DeepLabV3_full \
  --no-prune \
  --open
```

To build a static-source preview composition with the embedded Eagly image source:

```bash
python3 build_static_preview.py \
  /Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models/probe_image_mask_grayscale.mlpackage \
  --title EaglyMaskPreview \
  --open
```

To route the imported image output directly into the viewport for easier verification:

```bash
python3 build_static_preview.py \
  /Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models/probe_image_mask_grayscale.mlpackage \
  --title EaglyMaskDirectPreview \
  --direct-preview \
  --open
```

Outputs land under:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/reports`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-22-fxcore-eval/artifacts/fxcore`

## Expected Current Schema

For `MobileViT_DeepLabV3.mlpackage`:

- input: image `512x512`
- output: `MLMultiArray` named `classLabels` with shape `[1, 512, 512]`

That makes this a useful first test for FxCore's tensor-output path, even though it is not yet a directly viewable image mask.
