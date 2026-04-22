#!/usr/bin/env python3
"""Prepare a repeatable FxCore evaluation document for a Core ML model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import plistlib
import shutil
import sqlite3
import subprocess
import sys

from bootstrap_imports import ensure_local_site_packages, require_dependency


LOCAL_SITE_PACKAGES = ensure_local_site_packages()
require_dependency("coremltools")

import coremltools as ct
from coremltools.proto import FeatureTypes_pb2


ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
REPORTS_DIR = ARTIFACTS_DIR / "reports"
FXCORE_DIR = ARTIFACTS_DIR / "fxcore"
SEED_FXCORE = Path("/Users/dalebradshaw/Documents/fxcore/sample_plugins/DepthAnything.fxcore")

IMPORTER_IDENTIFIER = "com.fxfactory.FxCore.FxCorePlugInMLModelImporter"
ROOT_IDENTIFIER = "com.fxfactory.FxCore.FxCorePlugInCIContainer"


def encode_string(value: str) -> bytes:
    archive = {
        "$archiver": "NSKeyedArchiver",
        "$version": 100000,
        "$top": {"root": plistlib.UID(1)},
        "$objects": ["$null", value],
    }
    return plistlib.dumps(archive, fmt=plistlib.FMT_BINARY)


def encode_url(value: str) -> bytes:
    archive = {
        "$archiver": "NSKeyedArchiver",
        "$version": 100000,
        "$top": {"root": plistlib.UID(1)},
        "$objects": [
            "$null",
            {"NS.base": plistlib.UID(0), "$class": plistlib.UID(3), "NS.relative": plistlib.UID(2)},
            value,
            {"$classname": "NSURL", "$classes": ["NSURL", "NSObject"]},
        ],
    }
    return plistlib.dumps(archive, fmt=plistlib.FMT_BINARY)


def sanitize_stem(value: str) -> str:
    keep = []
    for char in value.lower():
        if char.isalnum():
            keep.append(char)
        elif char in {"-", "_"}:
            keep.append(char)
        else:
            keep.append("_")
    stem = "".join(keep).strip("_")
    while "__" in stem:
        stem = stem.replace("__", "_")
    return stem or "model"


def feature_description_to_dict(feature) -> dict:
    feature_type = feature.type.WhichOneof("Type")
    record = {
        "name": feature.name,
        "type": feature_type,
        "shortDescription": feature.shortDescription,
        "isOptional": feature.type.isOptional,
    }

    if feature_type == "imageType":
        image_type = feature.type.imageType
        color_space_name = FeatureTypes_pb2.ImageFeatureType.ColorSpace.Name(image_type.colorSpace)
        record["image"] = {
            "width": image_type.width,
            "height": image_type.height,
            "colorSpace": int(image_type.colorSpace),
            "colorSpaceName": color_space_name,
        }
    elif feature_type == "multiArrayType":
        array_type = feature.type.multiArrayType
        data_type_name = FeatureTypes_pb2.ArrayFeatureType.ArrayDataType.Name(array_type.dataType)
        record["multiArray"] = {
            "shape": list(array_type.shape),
            "dataType": int(array_type.dataType),
            "dataTypeName": data_type_name,
        }
    elif feature_type == "dictionaryType":
        dict_type = feature.type.dictionaryType
        key_type = dict_type.WhichOneof("KeyType")
        record["dictionary"] = {"keyType": key_type}
    elif feature_type == "stringType":
        record["string"] = {}
    elif feature_type == "int64Type":
        record["int64"] = {}
    elif feature_type == "doubleType":
        record["double"] = {}

    return record


def inspect_model(model_path: Path) -> dict:
    model = ct.models.MLModel(str(model_path))
    spec = model.get_spec()
    metadata = dict(spec.description.metadata.userDefined)

    return {
        "modelPath": str(model_path),
        "modelType": spec.WhichOneof("Type"),
        "localSitePackages": str(LOCAL_SITE_PACKAGES) if LOCAL_SITE_PACKAGES else None,
        "coremltoolsVersion": ct.__version__,
        "inputs": [feature_description_to_dict(feature) for feature in spec.description.input],
        "outputs": [feature_description_to_dict(feature) for feature in spec.description.output],
        "metadata": metadata,
    }


def prune_to_root_and_importer(db: sqlite3.Connection, importer_pk: int, root_pk: int) -> None:
    keep_nodes = (root_pk, importer_pk)
    db.execute("DELETE FROM ZCONNECTION")
    db.execute(
        f"DELETE FROM ZNODEKEYVALUEPAIR WHERE ZNODE NOT IN ({','.join('?' for _ in keep_nodes)})",
        keep_nodes,
    )
    db.execute(
        f"DELETE FROM ZINPUT WHERE ZNODE NOT IN ({','.join('?' for _ in keep_nodes)})",
        keep_nodes,
    )
    db.execute(
        f"DELETE FROM ZOUTPUT WHERE ZNODE NOT IN ({','.join('?' for _ in keep_nodes)})",
        keep_nodes,
    )
    db.execute(
        f"DELETE FROM ZNODE WHERE Z_PK NOT IN ({','.join('?' for _ in keep_nodes)})",
        keep_nodes,
    )


def update_primary_keys(db: sqlite3.Connection) -> None:
    counts = {
        1: db.execute("SELECT COUNT(*) FROM ZCOMPOSITION").fetchone()[0],
        2: db.execute("SELECT COUNT(*) FROM ZCOMPOSITIONKEYVALUEPAIR").fetchone()[0],
        3: db.execute("SELECT COUNT(*) FROM ZCONNECTION").fetchone()[0],
        4: db.execute("SELECT COUNT(*) FROM ZINPUT").fetchone()[0],
        6: db.execute("SELECT COUNT(*) FROM ZNODE").fetchone()[0],
        7: db.execute("SELECT COUNT(*) FROM ZNODEKEYVALUEPAIR").fetchone()[0],
        8: db.execute("SELECT COUNT(*) FROM ZOUTPUT").fetchone()[0],
    }
    for entity, count in counts.items():
        db.execute("UPDATE Z_PRIMARYKEY SET Z_MAX=? WHERE Z_ENT=?", (count, entity))


def seed_fxcore_document(
    model_path: Path,
    *,
    node_title: str,
    clear_model_ports: bool,
    prune: bool,
) -> Path:
    FXCORE_DIR.mkdir(parents=True, exist_ok=True)
    output_path = FXCORE_DIR / f"{sanitize_stem(node_title)}_blank.fxcore"
    if output_path.exists():
        output_path.unlink()
    shutil.copy2(SEED_FXCORE, output_path)

    file_url = model_path.resolve().as_uri()
    if model_path.is_dir() and not file_url.endswith("/"):
        file_url += "/"

    with sqlite3.connect(output_path) as db:
        importer_pk = db.execute(
            "SELECT Z_PK FROM ZNODE WHERE ZIDENTIFIER=?",
            (IMPORTER_IDENTIFIER,),
        ).fetchone()[0]
        root_pk = db.execute(
            "SELECT Z_PK FROM ZNODE WHERE ZIDENTIFIER=?",
            (ROOT_IDENTIFIER,),
        ).fetchone()[0]

        if prune:
            prune_to_root_and_importer(db, importer_pk, root_pk)

        db.execute(
            "UPDATE ZNODE SET ZTITLE=? WHERE Z_PK=?",
            (node_title, importer_pk),
        )
        db.execute(
            "UPDATE ZNODEKEYVALUEPAIR SET ZVALUE=? WHERE ZNODE=? AND ZKEY='modelName'",
            (encode_string(model_path.name), importer_pk),
        )
        if clear_model_ports:
            db.execute(
                "DELETE FROM ZNODEKEYVALUEPAIR WHERE ZNODE=? AND ZKEY='modelPorts'",
                (importer_pk,),
            )
        db.execute(
            "UPDATE ZINPUT SET ZASSIGNEDVALUE=? WHERE ZNODE=? AND ZKEY='inputURL'",
            (encode_url(file_url), importer_pk),
        )

        update_primary_keys(db)
        integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity check failed for {output_path}: {integrity}")
        db.commit()

    return output_path


def open_in_fxcore(path: Path) -> None:
    subprocess.run(["open", "-a", "FxCore", str(path)], check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare a seeded FxCore importer document and schema report for a Core ML model."
    )
    parser.add_argument("model", type=Path, help="Path to a .mlmodel or .mlpackage")
    parser.add_argument(
        "--title",
        help="Custom importer node title and document stem. Defaults to the model stem.",
    )
    parser.add_argument(
        "--keep-model-ports",
        action="store_true",
        help="Keep the cached modelPorts payload from the DepthAnything seed.",
    )
    parser.add_argument(
        "--no-prune",
        action="store_true",
        help="Keep the full DepthAnything graph instead of pruning to root + importer.",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the generated .fxcore document in FxCore.",
    )
    args = parser.parse_args()

    model_path = args.model.expanduser().resolve()
    if not model_path.exists():
        raise SystemExit(f"Model path does not exist: {model_path}")
    if model_path.suffix not in {".mlmodel", ".mlpackage"}:
        raise SystemExit("Expected a .mlmodel or .mlpackage path.")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    node_title = args.title or model_path.stem

    report = inspect_model(model_path)
    report["nodeTitle"] = node_title
    report["seedTemplate"] = str(SEED_FXCORE)

    seeded_path = seed_fxcore_document(
        model_path,
        node_title=node_title,
        clear_model_ports=not args.keep_model_ports,
        prune=not args.no_prune,
    )
    report["seededFxCorePath"] = str(seeded_path)

    report_path = REPORTS_DIR / f"{sanitize_stem(node_title)}.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")

    print(seeded_path)
    print(report_path)

    if args.open:
        open_in_fxcore(seeded_path)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
