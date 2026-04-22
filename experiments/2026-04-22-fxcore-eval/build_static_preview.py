#!/usr/bin/env python3
"""Build a static-source FxCore preview composition using Eagly's embedded image source."""

from __future__ import annotations

import argparse
from pathlib import Path
import plistlib
import shutil
import sqlite3
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts" / "fxcore"
DEPTHANYTHING_TEMPLATE = Path("/Users/dalebradshaw/Documents/fxcore/sample_plugins/DepthAnything.fxcore")
EAGLY_TEMPLATE = Path("/Users/dalebradshaw/Documents/fxcore/sample_plugins/Eagly.fxcore")

IMPORTER_NODE_PK = 3
SOURCE_NODE_PK = 1


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
    return stem or "preview"


def next_pk(db: sqlite3.Connection, table: str) -> int:
    value = db.execute(f"SELECT COALESCE(MAX(Z_PK), 0) + 1 FROM {table}").fetchone()[0]
    return int(value)


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


def transplant_eagly_source(db: sqlite3.Connection) -> None:
    with sqlite3.connect(EAGLY_TEMPLATE) as src:
        src.row_factory = sqlite3.Row

        source_node = src.execute(
            "SELECT * FROM ZNODE WHERE ZIDENTIFIER='com.fxfactory.FxCore.CGImageSourcePlugIn'"
        ).fetchone()
        source_inputs = src.execute(
            "SELECT * FROM ZINPUT WHERE ZNODE=? ORDER BY ZINDEX",
            (source_node["Z_PK"],),
        ).fetchall()
        source_kvps = src.execute(
            "SELECT * FROM ZNODEKEYVALUEPAIR WHERE ZNODE=? ORDER BY Z_PK",
            (source_node["Z_PK"],),
        ).fetchall()

    db.execute(
        "UPDATE ZNODE SET ZIDENTIFIER=?, ZTITLE=?, ZTAG=?, ZFRAMEORIGINX=?, ZFRAMEORIGINY=? WHERE Z_PK=?",
        (
            source_node["ZIDENTIFIER"],
            source_node["ZTITLE"],
            source_node["ZTAG"],
            source_node["ZFRAMEORIGINX"],
            source_node["ZFRAMEORIGINY"],
            SOURCE_NODE_PK,
        ),
    )

    db.execute("DELETE FROM ZINPUT WHERE ZNODE=?", (SOURCE_NODE_PK,))
    db.execute("DELETE FROM ZNODEKEYVALUEPAIR WHERE ZNODE=?", (SOURCE_NODE_PK,))

    for input_row in source_inputs:
        new_pk = next_pk(db, "ZINPUT")
        db.execute(
            """
            INSERT INTO ZINPUT
            (Z_PK,Z_ENT,Z_OPT,ZINDEX,ZCHILD,Z4_CHILD,ZCONNECTION,ZNODE,ZPARENT,Z4_PARENT,ZLASTKNOWNTYPE,ZKEY,ZTITLE,ZASSIGNEDVALUE)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                new_pk,
                input_row["Z_ENT"],
                input_row["Z_OPT"],
                input_row["ZINDEX"],
                input_row["ZCHILD"],
                input_row["Z4_CHILD"],
                input_row["ZCONNECTION"],
                SOURCE_NODE_PK,
                input_row["ZPARENT"],
                input_row["Z4_PARENT"],
                input_row["ZLASTKNOWNTYPE"],
                input_row["ZKEY"],
                input_row["ZTITLE"],
                input_row["ZASSIGNEDVALUE"],
            ),
        )

    for kvp in source_kvps:
        new_pk = next_pk(db, "ZNODEKEYVALUEPAIR")
        db.execute(
            """
            INSERT INTO ZNODEKEYVALUEPAIR
            (Z_PK,Z_ENT,Z_OPT,ZNODE,ZKEY,ZVALUE)
            VALUES (?,?,?,?,?,?)
            """,
            (
                new_pk,
                kvp["Z_ENT"],
                kvp["Z_OPT"],
                SOURCE_NODE_PK,
                kvp["ZKEY"],
                kvp["ZVALUE"],
            ),
        )


def patch_importer(db: sqlite3.Connection, model_path: Path, title: str) -> None:
    file_url = model_path.resolve().as_uri()
    if model_path.is_dir() and not file_url.endswith("/"):
        file_url += "/"

    db.execute(
        "UPDATE ZNODE SET ZTITLE=? WHERE Z_PK=?",
        (title, IMPORTER_NODE_PK),
    )
    db.execute(
        "UPDATE ZNODEKEYVALUEPAIR SET ZVALUE=? WHERE ZNODE=? AND ZKEY='modelName'",
        (encode_string(model_path.name), IMPORTER_NODE_PK),
    )
    db.execute(
        "UPDATE ZINPUT SET ZASSIGNEDVALUE=? WHERE ZNODE=? AND ZKEY='inputURL'",
        (encode_url(file_url), IMPORTER_NODE_PK),
    )


def pk_for_input(db: sqlite3.Connection, node_pk: int, key: str) -> int:
    row = db.execute(
        "SELECT Z_PK FROM ZINPUT WHERE ZNODE=? AND ZKEY=?",
        (node_pk, key),
    ).fetchone()
    if row is None:
        raise KeyError(f"Missing input {key} on node {node_pk}")
    return int(row[0])


def pk_for_output(db: sqlite3.Connection, node_pk: int, key: str) -> int:
    row = db.execute(
        "SELECT Z_PK FROM ZOUTPUT WHERE ZNODE=? AND ZKEY=?",
        (node_pk, key),
    ).fetchone()
    if row is None:
        raise KeyError(f"Missing output {key} on node {node_pk}")
    return int(row[0])


def sync_input_connections(db: sqlite3.Connection) -> None:
    db.execute("UPDATE ZINPUT SET ZCONNECTION=NULL")
    for input_pk, connection_pk in db.execute("SELECT ZINPUT, Z_PK FROM ZCONNECTION"):
        db.execute("UPDATE ZINPUT SET ZCONNECTION=? WHERE Z_PK=?", (connection_pk, input_pk))


def apply_direct_preview_routing(db: sqlite3.Connection) -> None:
    importer_image_input = pk_for_input(db, 3, "inputFeatureImage")
    importer_depth_output = pk_for_output(db, 3, "outputPredictionDepth")
    scale_mask_image_input = pk_for_input(db, 7, "inputImage")
    scale_mask_extent_input = pk_for_input(db, 7, "inputRectangle")
    scale_mask_image_output = pk_for_output(db, 7, "outputImage")
    scale_source_image_input = pk_for_input(db, 10, "inputImage")
    scale_source_rectangle_output = pk_for_output(db, 10, "outputRectangle")
    output_image_input = pk_for_input(db, 8, "inputImage")
    animation_image_output = pk_for_output(db, 1, "outputImage")

    db.execute("DELETE FROM ZCONNECTION")
    routes = [
        (importer_image_input, animation_image_output),
        (scale_mask_image_input, importer_depth_output),
        (scale_mask_extent_input, scale_source_rectangle_output),
        (scale_source_image_input, animation_image_output),
        (output_image_input, scale_mask_image_output),
    ]
    for input_pk, output_pk in routes:
        connection_pk = next_pk(db, "ZCONNECTION")
        db.execute(
            """
            INSERT INTO ZCONNECTION
            (Z_PK,Z_ENT,Z_OPT,ZINPUT,Z4_INPUT,ZOUTPUT,Z8_OUTPUT)
            VALUES (?,?,?,?,?,?,?)
            """,
            (connection_pk, 3, 1, input_pk, input_pk, output_pk, output_pk),
        )
    sync_input_connections(db)


def build_preview(model_path: Path, title: str, *, direct_preview: bool) -> Path:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = ARTIFACTS_DIR / f"{sanitize_stem(title)}_static_preview.fxcore"
    if output_path.exists():
        output_path.unlink()
    shutil.copy2(DEPTHANYTHING_TEMPLATE, output_path)

    with sqlite3.connect(output_path) as db:
        db.row_factory = sqlite3.Row
        transplant_eagly_source(db)
        patch_importer(db, model_path, title)
        if direct_preview:
            apply_direct_preview_routing(db)
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
        description="Build a static-source FxCore preview composition using the embedded Eagly image source."
    )
    parser.add_argument("model", type=Path, help="Path to a .mlmodel or .mlpackage")
    parser.add_argument(
        "--title",
        help="Importer node title and output document stem. Defaults to the model stem.",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the generated composition in FxCore.",
    )
    parser.add_argument(
        "--direct-preview",
        action="store_true",
        help="Route the imported image output directly to the 2D viewport instead of keeping the DepthAnything blur chain.",
    )
    args = parser.parse_args()

    model_path = args.model.expanduser().resolve()
    if not model_path.exists():
        raise SystemExit(f"Model path does not exist: {model_path}")

    title = args.title or model_path.stem
    output_path = build_preview(model_path, title, direct_preview=args.direct_preview)
    print(output_path)

    if args.open:
        open_in_fxcore(output_path)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
