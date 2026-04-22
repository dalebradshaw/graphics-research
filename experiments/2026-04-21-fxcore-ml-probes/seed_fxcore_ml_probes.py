#!/usr/bin/env python3
"""Create repeatable FxCore probe compositions seeded from DepthAnything.fxcore."""

from __future__ import annotations

import argparse
import plistlib
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MODEL_ARTIFACTS_DIR = ROOT / "artifacts" / "models"
FXCORE_ARTIFACTS_DIR = ROOT / "artifacts" / "fxcore"
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


def iter_model_paths(paths: list[Path]) -> list[Path]:
    result: list[Path] = []
    for path in paths:
        expanded = path.expanduser().resolve()
        if expanded.is_dir():
            result.extend(sorted(expanded.glob("*.mlmodel")))
            result.extend(sorted(expanded.glob("*.mlpackage")))
        elif expanded.suffix in {".mlmodel", ".mlpackage"}:
            result.append(expanded)
    return result


def prune_to_root_and_importer(db: sqlite3.Connection, importer_pk: int, root_pk: int) -> None:
    keep_nodes = (root_pk, importer_pk)
    db.execute(f"DELETE FROM ZCONNECTION")
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


def seed_fxcore(model_path: Path, *, prune: bool, clear_model_ports: bool) -> Path:
    FXCORE_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = FXCORE_ARTIFACTS_DIR / f"{model_path.stem}.fxcore"
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
            (model_path.stem, importer_pk),
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
        description="Seed FxCore Model Importer compositions from generated Core ML probe models."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        default=[MODEL_ARTIFACTS_DIR],
        help="Model paths or directories containing .mlmodel/.mlpackage probe models.",
    )
    parser.add_argument(
        "--no-prune",
        action="store_true",
        help="Keep the full DepthAnything graph instead of pruning to root + importer.",
    )
    parser.add_argument(
        "--clear-model-ports",
        action="store_true",
        help="Delete the imported modelPorts KVP to test a leaner importer seed.",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the last generated .fxcore document in FxCore.",
    )
    args = parser.parse_args()

    model_paths = iter_model_paths(args.paths)
    if not model_paths:
        raise SystemExit("No .mlmodel or .mlpackage files found.")

    generated: list[Path] = []
    for model_path in model_paths:
        generated_path = seed_fxcore(
            model_path,
            prune=not args.no_prune,
            clear_model_ports=args.clear_model_ports,
        )
        generated.append(generated_path)
        print(generated_path)

    if args.open:
        open_in_fxcore(generated[-1])


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
