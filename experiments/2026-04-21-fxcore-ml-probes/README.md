# FxCore ML Probe Harness

This experiment builds a small, repeatable probe set for FxCore's `Model Importer` node.

The goal is not to prove one model architecture. The goal is to map **which Core ML feature surfaces FxCore actually accepts and exposes**:

- RGB image input -> RGB image output
- RGB image input -> grayscale image output
- RGB image input -> `MLMultiArray` output
- RGB image input -> classifier dictionary + string output

## Files

- `generate_probe_models.py`
  Generates Core ML probe models and runs a sample prediction for each.
- `seed_fxcore_ml_probes.py`
  Copies `DepthAnything.fxcore`, retargets the importer to the generated probe models, and prunes the composition to a minimal root + importer seed.
- `bootstrap_imports.py`
  Small helper to locate the experiment-local venv if `coremltools` is not already importable.

## Environment Assumptions

This Mac currently has:

- system `python3` with `torch` available from the local Conda installation
- experiment-local `.venv` with `coremltools`, `numpy<2`, `scipy<1.14`, and `pillow`

That split is deliberate. `coremltools 9` pulled in NumPy 2 by default, which broke the local PyTorch/SciPy stack. The experiment venv is pinned back to NumPy 1.x compatibility so Core ML conversion remains usable.

## Generate Probe Models

```bash
cd /Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes
python3 generate_probe_models.py
```

Outputs land under:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/models`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/images`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/predictions`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/probe-models-manifest.json`

## Seed FxCore Probe Documents

```bash
cd /Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes
python3 seed_fxcore_ml_probes.py
```

That writes `.fxcore` probe documents under:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-fxcore-ml-probes/artifacts/fxcore`

To open the last generated probe directly in FxCore:

```bash
python3 seed_fxcore_ml_probes.py --open
```

## Notes On The FxCore Side

The generated `.fxcore` documents are **seed documents**, not fully introspected final compositions.

They are intentionally derived from `DepthAnything.fxcore` because that is the only shipped importer specimen we have with known-good structure. The seeder:

- preserves the working importer node shape
- repoints `modelName`
- repoints the `inputURL`
- prunes the rest of the graph by default

This gives us a stable document to open in FxCore while we test what happens when the importer sees a new model file.

Two practical expectations:

1. The importer may still need a `Choose…` interaction in FxCore to regenerate model-specific ports.
2. The `--clear-model-ports` option is intentionally experimental. It removes the cached `modelPorts` payload to test whether FxCore will rescan from disk more eagerly.

## Expected Probe Set

`generate_probe_models.py` currently builds:

1. `probe_image_passthrough_rgb.mlpackage`
2. `probe_image_mask_grayscale.mlpackage`
3. `probe_image_channel_means.mlmodel`
4. `probe_image_dominant_color_classifier.mlmodel`

These give us a good first-pass boundary map for:

- image predictions
- grayscale image predictions
- tensor predictions
- dictionary/string classifier predictions

## Next Useful Checks In FxCore

1. Open each seeded `.fxcore` file.
2. Select the importer node and point it at the target model if needed.
3. Confirm which ports FxCore synthesizes for each model.
4. Save the resulting `.fxcore` files and re-run `fxcore-inspect` on them.
5. Compare the saved importer metadata against the Core ML manifest.
