# BiRefNet Runtime Wrapper

This experiment turns BiRefNet into a reusable local runtime wrapper for graphics workflow evaluation.

The result is intentionally split into two tracks:

1. `run_birefnet_onnx_poc.py`
   Uses the official ONNX release models and writes mask + cutout artifacts locally. This is the path that currently works.
2. `attempt_birefnet_coreml_export.py`
   Attempts the direct `PyTorch -> Core ML -> FxCore Model Importer` route and captures the exact blocker in a report.

## Why This Split Exists

The official BiRefNet Hugging Face checkpoint loads and runs locally, but `coremltools 9.0` fails when exporting it because the graph contains `torchvision::deform_conv2d`.

That means:

- BiRefNet is a good candidate for a **custom plugin runtime**
- BiRefNet is **not** a drop-in `Model Importer` candidate today without model surgery or a new conversion path

## Environment

This experiment uses a local venv at:

- `/Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc/.venv`

Installed there:

- `onnxruntime`
- `onnx`
- `coremltools`
- `torch`
- `transformers`
- BiRefNet support deps (`timm`, `kornia`, `einops`)

## Working Runtime POC

Run the smaller model first:

```bash
cd /Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc
.venv/bin/python run_birefnet_onnx_poc.py --provider cpu
```

From the repo root, the same entrypoint is available as:

```bash
npm run birefnet:run -- --provider cpu
```

That defaults to:

- preset: `tiny-general`
- sample image: `dog`
- provider mode: `cpu`

Outputs land under:

- `artifacts/inputs`
- `artifacts/masks`
- `artifacts/cutouts`
- `artifacts/reports`
- `artifacts/cache`

Try the heavier matte-focused model:

```bash
.venv/bin/python run_birefnet_onnx_poc.py --model matting --provider cpu
```

Use your own image:

```bash
.venv/bin/python run_birefnet_onnx_poc.py --model tiny-general --provider cpu /absolute/path/to/image.png
```

Process a binary matte with cleanup:

```bash
.venv/bin/python run_birefnet_onnx_poc.py \
  --model tiny-general \
  --provider cpu \
  --threshold 0.5 \
  --grow 2 \
  --feather 1.5 \
  /absolute/path/to/image.png
```

Write only the mask:

```bash
.venv/bin/python run_birefnet_onnx_poc.py --mask-only /absolute/path/to/image.png
```

Use a separate output root:

```bash
.venv/bin/python run_birefnet_onnx_poc.py \
  --output-root /Users/dalebradshaw/graphics_research/artifacts/birefnet-runtime-run \
  /absolute/path/to/image.png
```

For this local install, ONNX Runtime also exposes `CoreMLExecutionProvider`. That is promising for a plugin runtime on Apple hardware, but Core ML session creation is still exploratory for this model family. The stable path right now is `--provider cpu`. The wrapper supports:

- `--provider cpu|coreml|auto`
- `--cache-dir <path>`
- `--threshold <0-1>`
- `--grow <pixels>`
- `--feather <radius>`
- `--mask-only`
- `--output-root <path>`
- `--tag <string>`

## Core ML Export Probe

```bash
cd /Users/dalebradshaw/graphics_research/experiments/2026-04-21-birefnet-fxcore-poc
.venv/bin/python attempt_birefnet_coreml_export.py
```

On the current Mac, that writes a report to:

- `artifacts/reports/birefnet-coreml-export-report.json`

The expected failure is:

- `NotImplementedError: PyTorch convert function for op 'torchvision::deform_conv2d' not implemented.`

## Local Read On Packaging

Official ONNX asset sizes from the BiRefNet `v1` GitHub release:

- `BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx`: about `224 MB`
- `BiRefNet-matting-epoch_100.onnx`: about `973 MB`

That makes the tiny model the better first plugin target, even if the matte-specific checkpoint is stronger visually.

## Recommendation After This POC

If the goal is a real plugin:

1. Start with `tiny-general` ONNX runtime integration to get the host/plugin architecture working.
2. Add the `matting` ONNX variant as an opt-in higher-quality preset.
3. Treat direct FxCore `Model Importer` integration as blocked until the deformable-convolution conversion issue is solved.
