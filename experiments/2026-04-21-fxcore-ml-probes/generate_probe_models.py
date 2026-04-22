#!/usr/bin/env python3
"""Generate small Core ML probe models for FxCore Model Importer experiments."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
import sys

from bootstrap_imports import ensure_local_site_packages, require_dependency


LOCAL_SITE_PACKAGES = ensure_local_site_packages()
require_dependency("coremltools")
require_dependency("torch")

import numpy as np
from PIL import Image
import torch
import coremltools as ct
from coremltools.models import MLModel, datatypes
from coremltools.models.neural_network import NeuralNetworkBuilder, utils as nn_utils


ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"
IMAGES_DIR = ARTIFACTS_DIR / "images"
PREDICTIONS_DIR = ARTIFACTS_DIR / "predictions"
MANIFEST_PATH = ARTIFACTS_DIR / "probe-models-manifest.json"

IMAGE_SIZE = 64


class RGBScale(torch.nn.Module):
    def forward(self, x):
        return torch.clamp(x * 0.75 + 0.1, 0.0, 1.0)


class GrayscaleMask(torch.nn.Module):
    def forward(self, x):
        return 0.299 * x[:, 0:1] + 0.587 * x[:, 1:2] + 0.114 * x[:, 2:3]


def reset_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


def make_probe_image() -> Path:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    height = width = 256
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)
    x = np.linspace(0.0, 1.0, width, dtype=np.float32)
    xx, yy = np.meshgrid(x, y)

    red = np.clip(1.2 - yy * 0.9, 0.0, 1.0)
    green = np.clip(xx * 0.85, 0.0, 1.0)
    blue = np.clip((1.0 - xx) * 0.45 + yy * 0.55, 0.0, 1.0)
    rgb = np.stack([red, green, blue], axis=-1)
    image = Image.fromarray(np.round(rgb * 255.0).astype(np.uint8), mode="RGB")

    path = IMAGES_DIR / "probe_input_gradient.png"
    image.save(path)
    return path


def ml_feature_summary(feature) -> dict:
    feature_type = feature.type.WhichOneof("Type")
    summary = {
        "name": feature.name,
        "type": feature_type,
        "shortDescription": feature.shortDescription,
    }
    if feature_type == "imageType":
        summary["image"] = {
            "width": feature.type.imageType.width,
            "height": feature.type.imageType.height,
            "colorSpace": feature.type.imageType.colorSpace,
        }
    elif feature_type == "multiArrayType":
        summary["multiArray"] = {
            "shape": list(feature.type.multiArrayType.shape),
            "dataType": feature.type.multiArrayType.dataType,
        }
    elif feature_type == "dictionaryType":
        summary["dictionary"] = {
            "keyType": feature.type.dictionaryType.WhichOneof("KeyType"),
        }
    return summary


def save_image_prediction(prediction_value, path: Path) -> dict:
    if isinstance(prediction_value, Image.Image):
        prediction_value.save(path)
        return {
            "kind": "image",
            "path": str(path),
            "size": list(prediction_value.size),
            "mode": prediction_value.mode,
        }
    return {
        "kind": type(prediction_value).__name__,
        "repr": repr(prediction_value),
    }


def save_array_prediction(value, path: Path) -> dict:
    array = np.array(value)
    path.write_text(json.dumps(array.tolist(), indent=2))
    return {
        "kind": "array",
        "path": str(path),
        "shape": list(array.shape),
        "dtype": str(array.dtype),
        "min": float(array.min()),
        "max": float(array.max()),
    }


def summarize_prediction(model: MLModel, input_image_path: Path, stem: str) -> dict:
    PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)
    sample_image = Image.open(input_image_path).resize((IMAGE_SIZE, IMAGE_SIZE))
    input_name = model.get_spec().description.input[0].name
    prediction = model.predict({input_name: sample_image})
    summary: dict[str, dict] = {}

    for output_name, output_value in prediction.items():
        base = PREDICTIONS_DIR / f"{stem}__{output_name}"
        if isinstance(output_value, Image.Image):
            summary[output_name] = save_image_prediction(output_value, base.with_suffix(".png"))
        elif isinstance(output_value, (dict, str, int, float)):
            summary[output_name] = {
                "kind": type(output_value).__name__,
                "value": output_value,
            }
        else:
            summary[output_name] = save_array_prediction(output_value, base.with_suffix(".json"))
    return summary


def build_rgb_passthrough(model_path: Path) -> MLModel:
    example = torch.rand(1, 3, IMAGE_SIZE, IMAGE_SIZE)
    traced = torch.jit.trace(RGBScale().eval(), example)
    model = ct.convert(
        traced,
        convert_to="mlprogram",
        minimum_deployment_target=ct.target.macOS13,
        inputs=[
            ct.ImageType(
                name="x",
                shape=example.shape,
                color_layout=ct.colorlayout.RGB,
            )
        ],
        outputs=[ct.ImageType(name="outputImage", color_layout=ct.colorlayout.RGB)],
    )
    reset_path(model_path)
    model.save(model_path)
    return model


def build_grayscale_mask(model_path: Path) -> MLModel:
    example = torch.rand(1, 3, IMAGE_SIZE, IMAGE_SIZE)
    traced = torch.jit.trace(GrayscaleMask().eval(), example)
    model = ct.convert(
        traced,
        convert_to="mlprogram",
        minimum_deployment_target=ct.target.macOS13,
        inputs=[
            ct.ImageType(
                name="x",
                shape=example.shape,
                color_layout=ct.colorlayout.RGB,
            )
        ],
        outputs=[ct.ImageType(name="maskImage", color_layout=ct.colorlayout.GRAYSCALE)],
    )
    reset_path(model_path)
    model.save(model_path)
    return model


def build_channel_means(model_path: Path) -> MLModel:
    builder = NeuralNetworkBuilder(
        [("image", datatypes.Array(3, IMAGE_SIZE, IMAGE_SIZE))],
        [("channelMeans", datatypes.Array(3))],
    )
    builder.add_pooling(
        name="gap",
        height=IMAGE_SIZE,
        width=IMAGE_SIZE,
        stride_height=IMAGE_SIZE,
        stride_width=IMAGE_SIZE,
        layer_type="AVERAGE",
        padding_type="VALID",
        input_name="image",
        output_name="pooled",
    )
    builder.add_flatten(
        name="flatten",
        mode=0,
        input_name="pooled",
        output_name="channelMeans",
    )
    model = MLModel(builder.spec)
    model = nn_utils.make_image_input(model, "image", image_format="NCHW")
    reset_path(model_path)
    model.save(model_path)
    return model


def build_dominant_color_classifier(model_path: Path) -> MLModel:
    builder = NeuralNetworkBuilder(
        [("image", datatypes.Array(3, IMAGE_SIZE, IMAGE_SIZE))],
        [("probs", datatypes.Array(3))],
        mode="classifier",
    )
    builder.add_pooling(
        name="gap",
        height=IMAGE_SIZE,
        width=IMAGE_SIZE,
        stride_height=IMAGE_SIZE,
        stride_width=IMAGE_SIZE,
        layer_type="AVERAGE",
        padding_type="VALID",
        input_name="image",
        output_name="pooled",
    )
    builder.add_flatten(
        name="flatten",
        mode=0,
        input_name="pooled",
        output_name="avgRGB",
    )
    builder.add_inner_product(
        name="identity_fc",
        W=np.eye(3, dtype=np.float32),
        b=np.zeros(3, dtype=np.float32),
        input_channels=3,
        output_channels=3,
        has_bias=True,
        input_name="avgRGB",
        output_name="scores",
    )
    builder.add_softmax(
        name="softmax",
        input_name="scores",
        output_name="probs",
    )
    builder.set_class_labels(
        ["red", "green", "blue"],
        predicted_feature_name="dominantColor",
        prediction_blob="probs",
    )
    model = MLModel(builder.spec)
    model = nn_utils.make_image_input(model, "image", image_format="NCHW")
    reset_path(model_path)
    model.save(model_path)
    return model


def describe_model(kind: str, model_path: Path, model: MLModel, sample_input: Path) -> dict:
    spec = model.get_spec()
    return {
        "kind": kind,
        "path": str(model_path),
        "modelType": spec.WhichOneof("Type"),
        "localSitePackages": str(LOCAL_SITE_PACKAGES) if LOCAL_SITE_PACKAGES else None,
        "inputFeatures": [ml_feature_summary(feature) for feature in spec.description.input],
        "outputFeatures": [ml_feature_summary(feature) for feature in spec.description.output],
        "predictionSample": summarize_prediction(model, sample_input, model_path.stem),
    }


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    probe_image = make_probe_image()

    builders = [
        ("image_passthrough_rgb", build_rgb_passthrough, MODELS_DIR / "probe_image_passthrough_rgb.mlpackage"),
        ("image_mask_grayscale", build_grayscale_mask, MODELS_DIR / "probe_image_mask_grayscale.mlpackage"),
        ("image_channel_means", build_channel_means, MODELS_DIR / "probe_image_channel_means.mlmodel"),
        (
            "image_dominant_color_classifier",
            build_dominant_color_classifier,
            MODELS_DIR / "probe_image_dominant_color_classifier.mlmodel",
        ),
    ]

    manifest = {
        "imageSize": IMAGE_SIZE,
        "probeImage": str(probe_image),
        "coremltoolsVersion": ct.__version__,
        "torchVersion": torch.__version__,
        "models": [],
    }

    for kind, builder, path in builders:
        model = builder(path)
        manifest["models"].append(describe_model(kind, path, model, probe_image))

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {MANIFEST_PATH}")
    for model_info in manifest["models"]:
        print(
            f"- {Path(model_info['path']).name}: "
            f"{[item['type'] for item in model_info['outputFeatures']]}"
        )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
