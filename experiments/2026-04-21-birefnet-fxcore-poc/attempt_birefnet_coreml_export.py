#!/usr/bin/env python3
"""Attempt to export the official BiRefNet checkpoint to Core ML and persist the result."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import sys
import time
import traceback

from bootstrap_imports import ensure_local_site_packages, require_dependency


ensure_local_site_packages()
require_dependency("coremltools")
require_dependency("torch")
require_dependency("transformers")

import coremltools as ct
import torch
from transformers import AutoModelForImageSegmentation


ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
COREML_DIR = ARTIFACTS_DIR / "coreml"
REPORTS_DIR = ARTIFACTS_DIR / "reports"

HF_MODEL_NAME = "ZhengPeng7/BiRefNet"


class WrappedBiRefNet(torch.nn.Module):
    def __init__(self, model: torch.nn.Module) -> None:
        super().__init__()
        self.model = model.float().eval()
        self.register_buffer(
            "mean",
            torch.tensor([0.485, 0.456, 0.406], dtype=torch.float32).view(1, 3, 1, 1),
        )
        self.register_buffer(
            "std",
            torch.tensor([0.229, 0.224, 0.225], dtype=torch.float32).view(1, 3, 1, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = (x - self.mean) / self.std
        return self.model(x)[-1].sigmoid()


def main() -> None:
    parser = argparse.ArgumentParser(description="Attempt official BiRefNet -> Core ML export.")
    parser.add_argument(
        "--width",
        type=int,
        default=1024,
        help="Static export width.",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=1024,
        help="Static export height.",
    )
    parser.add_argument(
        "--precision",
        choices=("float16", "float32"),
        default="float16",
        help="Core ML compute precision.",
    )
    args = parser.parse_args()

    COREML_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    output_path = COREML_DIR / f"BiRefNet-official-{args.width}x{args.height}.mlpackage"
    report_path = REPORTS_DIR / "birefnet-coreml-export-report.json"
    if output_path.exists():
        shutil.rmtree(output_path)

    report = {
        "model": HF_MODEL_NAME,
        "exportInputSize": [args.width, args.height],
        "precision": args.precision,
        "startedAtUnix": time.time(),
        "status": "started",
    }

    try:
        model = AutoModelForImageSegmentation.from_pretrained(HF_MODEL_NAME, trust_remote_code=True)
        wrapped = WrappedBiRefNet(model).eval()
        example = torch.rand(1, 3, args.height, args.width)
        traced = torch.jit.trace(wrapped, example)

        mlmodel = ct.convert(
            traced,
            convert_to="mlprogram",
            minimum_deployment_target=ct.target.macOS13,
            compute_precision=ct.precision.FLOAT16 if args.precision == "float16" else ct.precision.FLOAT32,
            inputs=[
                ct.ImageType(
                    name="x",
                    shape=example.shape,
                    color_layout=ct.colorlayout.RGB,
                    scale=1 / 255.0,
                )
            ],
            outputs=[
                ct.ImageType(
                    name="maskImage",
                    color_layout=ct.colorlayout.GRAYSCALE,
                )
            ],
        )
        mlmodel.save(output_path)

        report.update(
            {
                "status": "success",
                "outputPath": str(output_path.resolve()),
            }
        )
        report_path.write_text(json.dumps(report, indent=2))
        print(output_path.resolve())
        return
    except Exception as exc:
        report.update(
            {
                "status": "failed",
                "exceptionType": type(exc).__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            }
        )
        report_path.write_text(json.dumps(report, indent=2))
        raise


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
