# BiRefNet POC

Date: 2026-04-21
Workspace: `/Users/dalebradshaw/graphics_research`

## Goal

Take BiRefNet from the research shortlist into a concrete local proof of concept and determine which integration path is actually viable for our graphics workflow.

## What Was Built

Experiment folder:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc`

Key scripts:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/run_birefnet_onnx_poc.py`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/attempt_birefnet_coreml_export.py`

Repo entrypoint:

- `npm run birefnet:run -- ...`

Generated artifacts:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/reports/birefnet-onnx-manifest.json`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/reports/birefnet-coreml-export-report.json`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/masks/pytorch-hub-dog__tiny-general.png`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/masks/pytorch-hub-dog__matting.png`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/cutouts/pytorch-hub-dog__tiny-general.png`

Runtime wrapper sample outputs:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/runtime-sample/masks/pytorch-hub-dog__tiny-general__thr-0_50__feather-1_5__grow-2.png`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/runtime-sample/cutouts/pytorch-hub-dog__tiny-general__thr-0_50__feather-1_5__grow-2.png`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/runtime-sample/reports/pytorch-hub-dog__tiny-general__thr-0_50__feather-1_5__grow-2.json`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/runtime-sample/reports/birefnet-onnx-manifest.json`
- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/cutouts/pytorch-hub-dog__matting.png`

## Result

## 0. The wrapper is now implemented

The original ONNX proof-of-concept runner was extended into a small runtime wrapper with:

- model preset selection
- provider mode selection: `cpu`, `coreml`, `auto`
- cache directory support for optimized ONNX sessions and Core ML provider cache artifacts
- image in -> matte out
- optional RGBA cutout export
- optional threshold / feather / grow-shrink controls
- per-run JSON report output

The stable operational path right now is:

```bash
cd /Users/dalebradshaw/graphics_research
npm run birefnet:run -- --provider cpu /absolute/path/to/image.png
```

Example cleanup run:

```bash
npm run birefnet:run -- \
  --provider cpu \
  --threshold 0.5 \
  --grow 2 \
  --feather 1.5 \
  --output-root /Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/runtime-sample
```

## 1. BiRefNet works locally as a plugin-runtime POC

The official ONNX release models run locally on this Mac through ONNX Runtime and produce usable foreground masks and cutouts.

Two presets were validated:

- `tiny-general`
  - model file: `BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx`
  - release size: about `224 MB`
  - sample CPU inference time in this harness: about `20.0 s`
- `matting`
  - model file: `BiRefNet-matting-epoch_100.onnx`
  - release size: about `973 MB`
  - sample CPU inference time in this harness: about `26.2 s`

The matte-specific ONNX output is softer around fur edges, but the tiny general model is already good enough to justify plugin integration work.

## 2. Direct Core ML export is blocked today

The official Hugging Face PyTorch checkpoint loads locally, but direct export through `coremltools 9.0` fails.

The blocking error is:

- `NotImplementedError: PyTorch convert function for op 'torchvision::deform_conv2d' not implemented.`

This is captured in:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/artifacts/reports/birefnet-coreml-export-report.json`

That means the clean `PyTorch -> Core ML -> FxCore Model Importer` path is not available yet for the official model.

## 3. ONNX Runtime sees Apple hardware acceleration hooks

This local ONNX Runtime install reports:

- `CoreMLExecutionProvider`
- `AzureExecutionProvider`
- `CPUExecutionProvider`

The saved benchmark runs in this experiment were pinned to `CPUExecutionProvider` for determinism, because first-run Core ML partitioning/compilation was slow enough to complicate repeatable timing.

This still matters: it suggests a **custom BiRefNet plugin** has a credible Apple-native acceleration path through ONNX Runtime's Core ML execution provider, even though the importer/Core ML model path is blocked.

## Practical Conclusion

BiRefNet is still a strong candidate, but it should be treated as a **runtime plugin** problem, not a `Model Importer` problem.

The new state is:

1. A runtime wrapper exists and is usable today for local testing.
2. The importer/Core ML conversion path is still blocked.
3. The next work is no longer “prove inference”; it is “wrap this in a host/plugin shell.”

The implementation order from here is:

1. Keep `tiny-general` as the default runtime preset.
2. Add the `matting` ONNX model as a higher-quality preset once packaging and caching are under control.
3. Revisit direct FxCore `Model Importer` integration only if:
   - `coremltools` gains support for `torchvision::deform_conv2d`, or
   - we find a BiRefNet variant or export path that avoids deformable convolution.

## Recommended Next Step

Build a real host/plugin shell around the wrapper with:

- image import / drag-drop
- preset and postprocess controls
- cached model and session reuse
- output asset export
- host integration hooks for downstream compositing

That is now the productive path without waiting on Core ML conversion support.

## External References

- Official BiRefNet repo: https://github.com/ZhengPeng7/BiRefNet
- BiRefNet v1 release assets: https://github.com/ZhengPeng7/BiRefNet/releases/tag/v1
- ONNX Runtime Core ML Execution Provider docs: https://onnxruntime.ai/docs/execution-providers/CoreML-ExecutionProvider.html
