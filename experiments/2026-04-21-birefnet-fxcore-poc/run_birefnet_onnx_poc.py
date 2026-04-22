#!/usr/bin/env python3
"""Run a reusable BiRefNet ONNX runtime wrapper for local graphics tests."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import sys
import time
import urllib.request

from bootstrap_imports import ensure_local_site_packages, require_dependency


ensure_local_site_packages()
require_dependency("numpy")
require_dependency("onnxruntime")
require_dependency("PIL")

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"
INPUTS_DIR = ARTIFACTS_DIR / "inputs"
MASKS_DIR = ARTIFACTS_DIR / "masks"
CUTOUTS_DIR = ARTIFACTS_DIR / "cutouts"
REPORTS_DIR = ARTIFACTS_DIR / "reports"
SESSION_CACHE_DIR = ARTIFACTS_DIR / "cache"
MANIFEST_PATH = REPORTS_DIR / "birefnet-onnx-manifest.json"

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

SAMPLE_IMAGES = {
    "dog": {
        "filename": "pytorch-hub-dog.jpg",
        "url": "https://github.com/pytorch/hub/raw/master/images/dog.jpg",
    }
}

MODEL_PRESETS = {
    "tiny-general": {
        "filename": "BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx",
        "url": "https://github.com/ZhengPeng7/BiRefNet/releases/download/v1/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx",
        "input_size": [1024, 1024],
        "notes": "224 MB ONNX. Best first plugin-runtime target for packaging pressure.",
    },
    "matting": {
        "filename": "BiRefNet-matting-epoch_100.onnx",
        "url": "https://github.com/ZhengPeng7/BiRefNet/releases/download/v1/BiRefNet-matting-epoch_100.onnx",
        "input_size": [1024, 1024],
        "notes": "973 MB ONNX. Better matte behavior, but much heavier for packaging.",
    },
}


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def download_file(url: str, destination: Path) -> Path:
    ensure_dir(destination.parent)
    if destination.exists():
        return destination
    with urllib.request.urlopen(url) as response, destination.open("wb") as handle:
        shutil.copyfileobj(response, handle)
    return destination


def ensure_sample_image(sample_name: str) -> Path:
    sample = SAMPLE_IMAGES[sample_name]
    return download_file(sample["url"], INPUTS_DIR / sample["filename"])


def ensure_model(model_name: str) -> Path:
    model = MODEL_PRESETS[model_name]
    return download_file(model["url"], MODELS_DIR / model["filename"])


def preprocess_image(image: Image.Image, width: int, height: int) -> np.ndarray:
    resized = image.resize((width, height), Image.Resampling.BILINEAR)
    array = np.asarray(resized).astype(np.float32) / 255.0
    normalized = (array - IMAGENET_MEAN) / IMAGENET_STD
    return np.transpose(normalized, (2, 0, 1))[np.newaxis, ...]


def sigmoid(value: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-value))


def mask_to_image(mask: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(mask * 255.0, 0.0, 255.0).astype(np.uint8), mode="L")


def save_mask(mask: np.ndarray, path: Path) -> None:
    ensure_dir(path.parent)
    mask_to_image(mask).save(path)


def save_cutout(source_image: Image.Image, mask: np.ndarray, path: Path) -> None:
    ensure_dir(path.parent)
    alpha = mask_to_image(mask)
    rgba = source_image.convert("RGBA")
    rgba.putalpha(alpha)
    rgba.save(path)


def resize_mask(mask: np.ndarray, width: int, height: int) -> np.ndarray:
    return np.asarray(
        mask_to_image(mask).resize((width, height), Image.Resampling.BILINEAR),
        dtype=np.float32,
    ) / 255.0


def apply_postprocess(mask: np.ndarray, threshold: float | None, feather: float, grow: int) -> np.ndarray:
    image = mask_to_image(mask)

    if threshold is not None:
        image = image.point(lambda value: 255 if (value / 255.0) >= threshold else 0)

    if grow != 0:
        size = abs(grow) * 2 + 1
        if size > 1:
            if grow > 0:
                image = image.filter(ImageFilter.MaxFilter(size=size))
            else:
                image = image.filter(ImageFilter.MinFilter(size=size))

    if feather > 0:
        image = image.filter(ImageFilter.GaussianBlur(radius=feather))

    return np.asarray(image, dtype=np.float32) / 255.0


def safe_stem(path: Path) -> str:
    return path.stem.replace(" ", "_")


def default_output_tag(model_name: str, threshold: float | None, feather: float, grow: int) -> str:
    parts = [model_name]
    if threshold is not None:
        parts.append(f"thr-{threshold:.2f}".replace(".", "_"))
    if feather > 0:
        parts.append(f"feather-{feather:g}".replace(".", "_"))
    if grow != 0:
        parts.append(f"grow-{grow}")
    return "__".join(parts)


def normalized_provider_mode(value: str) -> str:
    lowered = value.lower()
    if lowered not in {"cpu", "coreml", "auto"}:
        raise ValueError(f"Unsupported provider mode '{value}'. Expected one of: cpu, coreml, auto.")
    return lowered


def build_provider_spec(provider_mode: str, coreml_cache_dir: Path | None) -> tuple[list[str | tuple[str, dict[str, str]]], dict]:
    available = ort.get_available_providers()
    metadata = {
        "availableProviders": available,
        "providerMode": provider_mode,
        "coremlCacheDirectory": str(coreml_cache_dir.resolve()) if coreml_cache_dir else None,
    }

    if provider_mode == "cpu" or "CoreMLExecutionProvider" not in available:
        return ["CPUExecutionProvider"], metadata

    provider_options: dict[str, str] = {}
    if coreml_cache_dir is not None:
        ensure_dir(coreml_cache_dir)
        provider_options["ModelCacheDirectory"] = str(coreml_cache_dir.resolve())

    coreml_entry: str | tuple[str, dict[str, str]]
    if provider_options:
        coreml_entry = ("CoreMLExecutionProvider", provider_options)
    else:
        coreml_entry = "CoreMLExecutionProvider"

    if provider_mode == "coreml":
        return [coreml_entry, "CPUExecutionProvider"], metadata
    return [coreml_entry, "CPUExecutionProvider"], metadata


def make_session(
    model_path: Path,
    provider_mode: str,
    cache_dir: Path | None,
) -> tuple[ort.InferenceSession, dict]:
    provider_mode = normalized_provider_mode(provider_mode)
    available = ort.get_available_providers()
    session_cache_dir = None if cache_dir is None else cache_dir / "optimized"
    coreml_cache_dir = None if cache_dir is None else cache_dir / "coreml"

    def create_session(active_mode: str) -> tuple[ort.InferenceSession, dict]:
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED
        optimized_model_path = None
        if session_cache_dir is not None:
            ensure_dir(session_cache_dir)
            optimized_model_path = session_cache_dir / f"{model_path.stem}__{active_mode}.onnx"
            session_options.optimized_model_filepath = str(optimized_model_path)

        providers, provider_metadata = build_provider_spec(active_mode, coreml_cache_dir)
        created_at = time.perf_counter()
        session = ort.InferenceSession(str(model_path), sess_options=session_options, providers=providers)
        session_create_ms = (time.perf_counter() - created_at) * 1000.0
        session_metadata = {
            **provider_metadata,
            "providerRequest": providers,
            "optimizedModelPath": str(optimized_model_path.resolve()) if optimized_model_path else None,
            "sessionCreateMs": round(session_create_ms, 2),
            "activeProviders": session.get_providers(),
        }
        return session, session_metadata

    if provider_mode == "auto":
        if "CoreMLExecutionProvider" in available:
            try:
                return create_session("coreml")
            except Exception as exc:
                session, metadata = create_session("cpu")
                metadata["fallbackFrom"] = "coreml"
                metadata["fallbackReason"] = f"{type(exc).__name__}: {exc}"
                return session, metadata
        return create_session("cpu")

    return create_session(provider_mode)


def infer_image(
    session: ort.InferenceSession,
    session_metadata: dict,
    model_name: str,
    image_path: Path,
    output_root: Path,
    output_tag: str,
    threshold: float | None,
    feather: float,
    grow: int,
    write_cutout: bool,
) -> dict:
    source_image = Image.open(image_path).convert("RGB")
    original_width, original_height = source_image.size

    model_info = MODEL_PRESETS[model_name]
    input_width, input_height = model_info["input_size"]
    input_tensor = preprocess_image(source_image, input_width, input_height)

    session_input = session.get_inputs()[0]
    session_output = session.get_outputs()[0]

    started = time.perf_counter()
    output_value = session.run(None, {session_input.name: input_tensor})[0]
    inference_ms = (time.perf_counter() - started) * 1000.0

    mask = sigmoid(output_value[0, 0])
    restored_mask = resize_mask(mask, original_width, original_height)
    processed_mask = apply_postprocess(restored_mask, threshold=threshold, feather=feather, grow=grow)

    masks_dir = output_root / "masks"
    cutouts_dir = output_root / "cutouts"
    reports_dir = output_root / "reports"

    stem = safe_stem(image_path)
    mask_path = masks_dir / f"{stem}__{output_tag}.png"
    cutout_path = cutouts_dir / f"{stem}__{output_tag}.png"
    report_path = reports_dir / f"{stem}__{output_tag}.json"

    save_mask(processed_mask, mask_path)
    if write_cutout:
        save_cutout(source_image, processed_mask, cutout_path)

    report = {
        "modelPreset": model_name,
        "modelFile": str((MODELS_DIR / MODEL_PRESETS[model_name]["filename"]).resolve()),
        "modelNotes": MODEL_PRESETS[model_name]["notes"],
        "imagePath": str(image_path.resolve()),
        "originalSize": [original_width, original_height],
        "modelInputSize": [input_width, input_height],
        "session": session_metadata,
        "inputName": session_input.name,
        "inputType": session_input.type,
        "inputShape": session_input.shape,
        "outputName": session_output.name,
        "outputType": session_output.type,
        "outputShape": session_output.shape,
        "postprocess": {
            "threshold": threshold,
            "feather": feather,
            "grow": grow,
        },
        "maskStats": {
            "raw": {
                "min": float(restored_mask.min()),
                "max": float(restored_mask.max()),
                "mean": float(restored_mask.mean()),
            },
            "processed": {
                "min": float(processed_mask.min()),
                "max": float(processed_mask.max()),
                "mean": float(processed_mask.mean()),
            },
        },
        "timingMs": {
            "inference": round(inference_ms, 2),
        },
        "artifacts": {
            "mask": str(mask_path.resolve()),
            "cutout": str(cutout_path.resolve()) if write_cutout else None,
        },
    }
    ensure_dir(report_path.parent)
    report_path.write_text(json.dumps(report, indent=2))
    return report


def write_manifest(output_root: Path, model_path: Path, sample_path: Path, reports: list[dict]) -> None:
    manifest_path = output_root / "reports" / "birefnet-onnx-manifest.json"
    ensure_dir(manifest_path.parent)

    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
    else:
        manifest = {"runs": []}

    runs = {
        (run["modelPreset"], run["imagePath"], json.dumps(run.get("postprocess", {}), sort_keys=True)): run
        for run in manifest.get("runs", [])
    }
    for report in reports:
        runs[
            (
                report["modelPreset"],
                report["imagePath"],
                json.dumps(report.get("postprocess", {}), sort_keys=True),
            )
        ] = report

    manifest = {
        "updatedAtUnix": time.time(),
        "availableProviders": ort.get_available_providers(),
        "modelCache": str(MODELS_DIR.resolve()),
        "outputRoot": str(output_root.resolve()),
        "sampleImage": str(sample_path.resolve()),
        "runs": sorted(
            runs.values(),
            key=lambda item: (
                item["modelPreset"],
                item["imagePath"],
                item.get("postprocess", {}).get("threshold") or -1,
                item.get("postprocess", {}).get("feather") or -1,
                item.get("postprocess", {}).get("grow") or 0,
            ),
        ),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run BiRefNet ONNX locally and write mask/cutout artifacts.")
    parser.add_argument(
        "images",
        nargs="*",
        type=Path,
        help="Input image paths. If omitted, downloads and uses a repeatable sample dog image.",
    )
    parser.add_argument(
        "--model",
        choices=sorted(MODEL_PRESETS.keys()),
        default="tiny-general",
        help="Model preset to use.",
    )
    parser.add_argument(
        "--sample",
        choices=sorted(SAMPLE_IMAGES.keys()),
        default="dog",
        help="Sample image to use when no input paths are provided.",
    )
    parser.add_argument(
        "--provider",
        choices=("auto", "cpu", "coreml"),
        default="cpu",
        help="Execution provider strategy. 'cpu' is deterministic, 'coreml' is exploratory, 'auto' tries Core ML then falls back to CPU on session-creation failure.",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=SESSION_CACHE_DIR,
        help="Directory for optimized-session cache files and Core ML provider cache artifacts.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=ARTIFACTS_DIR,
        help="Root directory for masks, cutouts, and reports.",
    )
    parser.add_argument(
        "--tag",
        help="Optional output tag override. Defaults to model + postprocess settings.",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        help="Optional threshold in the 0-1 range. Values at or above the threshold become fully opaque.",
    )
    parser.add_argument(
        "--feather",
        type=float,
        default=0.0,
        help="Optional Gaussian blur radius to soften mask edges after threshold/grow processing.",
    )
    parser.add_argument(
        "--grow",
        type=int,
        default=0,
        help="Optional edge grow/shrink in pixels. Positive expands the matte, negative contracts it.",
    )
    parser.add_argument(
        "--mask-only",
        action="store_true",
        help="Write only the matte image and skip RGBA cutout generation.",
    )
    parser.add_argument(
        "--download-only",
        action="store_true",
        help="Only fetch the selected model and sample image, then exit.",
    )
    args = parser.parse_args()

    ensure_dir(MODELS_DIR)
    ensure_dir(INPUTS_DIR)
    ensure_dir(args.output_root / "masks")
    ensure_dir(args.output_root / "cutouts")
    ensure_dir(args.output_root / "reports")
    ensure_dir(args.cache_dir)

    if args.threshold is not None and not 0.0 <= args.threshold <= 1.0:
        raise SystemExit("--threshold must be between 0 and 1.")
    if args.feather < 0:
        raise SystemExit("--feather must be >= 0.")

    model_path = ensure_model(args.model)
    sample_path = ensure_sample_image(args.sample)
    if args.download_only:
        print(model_path)
        print(sample_path)
        return

    image_paths = [path.expanduser().resolve() for path in args.images] if args.images else [sample_path.resolve()]
    missing = [path for path in image_paths if not path.exists()]
    if missing:
        raise SystemExit(f"Missing input image(s): {', '.join(str(path) for path in missing)}")

    session, session_metadata = make_session(model_path, args.provider, args.cache_dir)

    output_tag = args.tag or default_output_tag(args.model, args.threshold, args.feather, args.grow)
    reports = [
        infer_image(
            session,
            session_metadata,
            args.model,
            image_path,
            args.output_root,
            output_tag,
            threshold=args.threshold,
            feather=args.feather,
            grow=args.grow,
            write_cutout=not args.mask_only,
        )
        for image_path in image_paths
    ]
    write_manifest(args.output_root, model_path, sample_path, reports)

    for report in reports:
        print(report["artifacts"]["mask"])
        if report["artifacts"]["cutout"]:
            print(report["artifacts"]["cutout"])


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
