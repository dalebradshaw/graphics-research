#!/usr/bin/env python3
"""Prepare a repeatable FxCore evaluation document for a Core ML model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import plistlib
import re
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
IMAGE_PORT_TYPE = 7
ENUM_PORT_TYPE = 3
URL_PORT_TYPE = 16


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


def encode_number(value: int | bool) -> bytes:
    archive = {
        "$archiver": "NSKeyedArchiver",
        "$version": 100000,
        "$top": {"root": plistlib.UID(1)},
        "$objects": ["$null", value],
    }
    return plistlib.dumps(archive, fmt=plistlib.FMT_BINARY)


class NSKeyedArchiveBuilder:
    """Minimal keyed-archive builder for NSArray/NSDictionary/NSMutableString payloads."""

    def __init__(self) -> None:
        self.objects: list[object] = ["$null"]
        self.class_cache: dict[tuple[str, tuple[str, ...]], plistlib.UID] = {}

    def _uid(self, index: int) -> plistlib.UID:
        return plistlib.UID(index)

    def add(self, value: object) -> plistlib.UID:
        self.objects.append(value)
        return self._uid(len(self.objects) - 1)

    def add_class(self, classname: str, classes: list[str]) -> plistlib.UID:
        cache_key = (classname, tuple(classes))
        if cache_key not in self.class_cache:
            self.class_cache[cache_key] = self.add(
                {
                    "$classname": classname,
                    "$classes": classes,
                }
            )
        return self.class_cache[cache_key]

    def add_string(self, value: str) -> plistlib.UID:
        return self.add(value)

    def add_number(self, value: int | bool) -> plistlib.UID:
        return self.add(value)

    def add_mutable_string(self, value: str) -> plistlib.UID:
        class_uid = self.add_class("NSMutableString", ["NSMutableString", "NSString", "NSObject"])
        return self.add(
            {
                "$class": class_uid,
                "NS.string": value,
            }
        )

    def add_array(self, items: list[plistlib.UID]) -> plistlib.UID:
        class_uid = self.add_class("NSArray", ["NSArray", "NSObject"])
        return self.add(
            {
                "NS.objects": items,
                "$class": class_uid,
            }
        )

    def add_dict(self, items: list[tuple[str, plistlib.UID]]) -> plistlib.UID:
        class_uid = self.add_class("NSDictionary", ["NSDictionary", "NSObject"])
        key_uids = [self.add_string(key) for key, _ in items]
        value_uids = [value_uid for _, value_uid in items]
        return self.add(
            {
                "NS.keys": key_uids,
                "NS.objects": value_uids,
                "$class": class_uid,
            }
        )

    def dumps(self, root_uid: plistlib.UID) -> bytes:
        archive = {
            "$archiver": "NSKeyedArchiver",
            "$version": 100000,
            "$top": {"root": root_uid},
            "$objects": self.objects,
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


def split_words(value: str) -> list[str]:
    if not value:
        return []
    parts = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value).replace("_", " ").split()
    return [part for part in parts if part]


def humanize_feature_name(name: str) -> str:
    words = split_words(name)
    if words and words[0].lower() in {"input", "output"}:
        words = words[1:]
    return " ".join(word.capitalize() for word in words) or name


def make_port_key(prefix: str, feature_name: str) -> str:
    words = split_words(feature_name)
    if words and words[0].lower() in {"input", "output"}:
        words = words[1:]
    suffix = "".join(word[:1].upper() + word[1:] for word in words) or "Feature"
    return f"{prefix}{suffix}"


def default_feature_description(feature, *, title: str, role: str) -> str:
    if feature.shortDescription:
        return feature.shortDescription

    feature_type = feature.type.WhichOneof("Type")
    if feature_type == "imageType":
        image_type = feature.type.imageType
        return (
            f"{title} supports {image_type.width}x{image_type.height} images by default. "
            f"This is a required {role}."
        )
    if feature_type == "multiArrayType":
        array_type = feature.type.multiArrayType
        shape = "x".join(str(value) for value in array_type.shape)
        return f"{title} exposes a MultiArray prediction with shape {shape}. This is a required {role}."
    return f"{title} is a required {role}."


def make_model_ports_blob(report: dict) -> bytes:
    builder = NSKeyedArchiveBuilder()
    entry_uids: list[plistlib.UID] = []

    for input_feature in report["inputs"]:
        if input_feature["type"] != "imageType":
            continue

        title = humanize_feature_name(input_feature["name"])
        description = default_feature_description(
            _dict_to_feature_like(input_feature),
            title=title,
            role="input feature",
        )
        entry_uids.append(
            builder.add_dict(
                [
                    ("associatedValue", builder.add_string(input_feature["name"])),
                    ("key", builder.add_string(make_port_key("inputFeature", input_feature["name"]))),
                    ("type", builder.add_number(IMAGE_PORT_TYPE)),
                    ("name", builder.add_string(title)),
                    ("description", builder.add_mutable_string(description)),
                ]
            )
        )

        resampling_description = (
            f"Algorithm used to scale the input to {title} to one of the sizes supported by the model."
        )
        entry_uids.append(
            builder.add_dict(
                [
                    (
                        "menuItems",
                        builder.add_array(
                            [
                                builder.add_string("Default"),
                                builder.add_string("Lanczos"),
                                builder.add_string("Bicubic"),
                            ]
                        ),
                    ),
                    (
                        "menuItemsRepresentedObjects",
                        builder.add_array(
                            [
                                builder.add_number(0),
                                builder.add_number(1),
                                builder.add_number(2),
                            ]
                        ),
                    ),
                    (
                        "key",
                        builder.add_string(
                            make_port_key("inputFeature", input_feature["name"]) + "ResamplingFilter"
                        ),
                    ),
                    ("type", builder.add_number(ENUM_PORT_TYPE)),
                    ("name", builder.add_string(f"{title} Resampling")),
                    ("description", builder.add_mutable_string(resampling_description)),
                ]
            )
        )

    for output_feature in report["outputs"]:
        title = humanize_feature_name(output_feature["name"])
        description = default_feature_description(
            _dict_to_feature_like(output_feature),
            title=title,
            role="output prediction",
        )

        port_type = IMAGE_PORT_TYPE if output_feature["type"] == "imageType" else output_feature.get(
            "fxcorePortType",
            IMAGE_PORT_TYPE,
        )
        entry_uids.append(
            builder.add_dict(
                [
                    ("associatedValue", builder.add_string(output_feature["name"])),
                    ("key", builder.add_string(make_port_key("outputPrediction", output_feature["name"]))),
                    ("type", builder.add_number(port_type)),
                    ("name", builder.add_string(title)),
                    ("description", builder.add_mutable_string(description)),
                ]
            )
        )

    root_uid = builder.add_array(entry_uids)
    return builder.dumps(root_uid)


class _FeatureLikeType:
    def __init__(self, feature_dict: dict) -> None:
        self._feature_dict = feature_dict
        self.imageType = type("ImageType", (), feature_dict.get("image", {}))
        self.multiArrayType = type("MultiArrayType", (), feature_dict.get("multiArray", {}))

    def WhichOneof(self, _: str) -> str:
        return self._feature_dict["type"]


class _FeatureLike:
    def __init__(self, feature_dict: dict) -> None:
        self.name = feature_dict["name"]
        self.shortDescription = feature_dict.get("shortDescription", "")
        self.type = _FeatureLikeType(feature_dict)


def _dict_to_feature_like(feature_dict: dict) -> _FeatureLike:
    return _FeatureLike(feature_dict)


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


def report_supports_image_schema_sync(report: dict) -> bool:
    if len(report["inputs"]) != 1 or len(report["outputs"]) != 1:
        return False
    return report["inputs"][0]["type"] == "imageType" and report["outputs"][0]["type"] == "imageType"


def next_primary_key(db: sqlite3.Connection, table: str) -> int:
    return db.execute(f"SELECT COALESCE(MAX(Z_PK), 0) + 1 FROM {table}").fetchone()[0]


def upsert_input_row(
    db: sqlite3.Connection,
    *,
    node_pk: int,
    index: int,
    last_known_type: int,
    key: str,
    title: str,
    assigned_value: bytes | None = None,
) -> None:
    row = db.execute(
        "SELECT Z_PK FROM ZINPUT WHERE ZNODE=? AND ZINDEX=?",
        (node_pk, index),
    ).fetchone()
    if row is None:
        db.execute(
            """
            INSERT INTO ZINPUT
            (Z_PK, Z_ENT, Z_OPT, ZINDEX, ZCHILD, Z4_CHILD, ZCONNECTION, ZNODE, ZPARENT, Z4_PARENT, ZLASTKNOWNTYPE, ZKEY, ZTITLE, ZASSIGNEDVALUE)
            VALUES (?, 5, 1, ?, NULL, NULL, NULL, ?, NULL, NULL, ?, ?, ?, ?)
            """,
            (next_primary_key(db, "ZINPUT"), index, node_pk, last_known_type, key, title, assigned_value),
        )
        return

    db.execute(
        """
        UPDATE ZINPUT
        SET Z_ENT=5, Z_OPT=1, ZCHILD=NULL, Z4_CHILD=NULL, ZCONNECTION=NULL, ZPARENT=NULL, Z4_PARENT=NULL,
            ZLASTKNOWNTYPE=?, ZKEY=?, ZTITLE=?, ZASSIGNEDVALUE=?
        WHERE Z_PK=?
        """,
        (last_known_type, key, title, assigned_value, row[0]),
    )


def upsert_output_row(
    db: sqlite3.Connection,
    *,
    node_pk: int,
    index: int,
    key: str,
    title: str,
) -> None:
    row = db.execute(
        "SELECT Z_PK FROM ZOUTPUT WHERE ZNODE=? AND ZINDEX=?",
        (node_pk, index),
    ).fetchone()
    if row is None:
        db.execute(
            """
            INSERT INTO ZOUTPUT
            (Z_PK, Z_ENT, Z_OPT, ZINDEX, ZCHILD, Z8_CHILD, ZNODE, ZPARENT, Z8_PARENT, ZKEY, ZTITLE)
            VALUES (?, 9, 1, ?, NULL, NULL, ?, NULL, NULL, ?, ?)
            """,
            (next_primary_key(db, "ZOUTPUT"), index, node_pk, key, title),
        )
        return

    db.execute(
        """
        UPDATE ZOUTPUT
        SET Z_ENT=9, Z_OPT=1, ZCHILD=NULL, Z8_CHILD=NULL, ZPARENT=NULL, Z8_PARENT=NULL, ZKEY=?, ZTITLE=?
        WHERE Z_PK=?
        """,
        (key, title, row[0]),
    )


def sync_importer_schema(db: sqlite3.Connection, importer_pk: int, report: dict) -> None:
    image_input = report["inputs"][0]
    image_output = report["outputs"][0]

    input_key = make_port_key("inputFeature", image_input["name"])
    resampling_key = input_key + "ResamplingFilter"
    output_key = make_port_key("outputPrediction", image_output["name"])
    input_title = humanize_feature_name(image_input["name"])
    output_title = humanize_feature_name(image_output["name"])

    model_ports_blob = make_model_ports_blob(report)
    model_ports_row = db.execute(
        "SELECT Z_PK FROM ZNODEKEYVALUEPAIR WHERE ZNODE=? AND ZKEY='modelPorts'",
        (importer_pk,),
    ).fetchone()
    if model_ports_row is None:
        db.execute(
            """
            INSERT INTO ZNODEKEYVALUEPAIR
            (Z_PK, Z_ENT, Z_OPT, ZNODE, ZKEY, ZVALUE)
            VALUES (?, 7, 1, ?, 'modelPorts', ?)
            """,
            (next_primary_key(db, "ZNODEKEYVALUEPAIR"), importer_pk, model_ports_blob),
        )
    else:
        db.execute(
            "UPDATE ZNODEKEYVALUEPAIR SET ZVALUE=? WHERE Z_PK=?",
            (model_ports_blob, model_ports_row[0]),
        )

    upsert_input_row(
        db,
        node_pk=importer_pk,
        index=1,
        last_known_type=IMAGE_PORT_TYPE,
        key=input_key,
        title=input_title,
    )
    upsert_input_row(
        db,
        node_pk=importer_pk,
        index=2,
        last_known_type=ENUM_PORT_TYPE,
        key=resampling_key,
        title=f"{input_title} Resampling",
        assigned_value=encode_number(0),
    )
    upsert_output_row(
        db,
        node_pk=importer_pk,
        index=0,
        key=output_key,
        title=output_title,
    )


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
    report: dict | None = None,
    materialize_schema: bool = False,
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

        if materialize_schema and report is not None:
            sync_importer_schema(db, importer_pk, report)

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
    parser.add_argument(
        "--materialize-image-schema",
        action="store_true",
        help="Write an image-model importer schema directly into the .fxcore store for save-safe documents.",
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
    report["supportsImageSchemaSync"] = report_supports_image_schema_sync(report)

    if args.materialize_image_schema and not report["supportsImageSchemaSync"]:
        raise SystemExit(
            "Schema materialization currently supports models with exactly one image input and one image output."
        )

    seeded_path = seed_fxcore_document(
        model_path,
        node_title=node_title,
        clear_model_ports=not args.keep_model_ports,
        prune=not args.no_prune,
        report=report,
        materialize_schema=args.materialize_image_schema,
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
